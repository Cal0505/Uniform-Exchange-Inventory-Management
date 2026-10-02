import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

export type OrderStatus = 'Received' | 'Ready to Pick' | 'Awaiting Stock' | 'Claimed' | 'Completed';

export interface OrderLineItem extends DocumentData {
  skuId: string;
  quantity: number;
  itemStatus?: 'pending' | 'picked' | 'not-picked';
  reservedInventory?: Array<{ documentId: string; quantity: number }>;
}

export interface OrderRecord extends DocumentData {
  id: string;
  orderNumber?: string;
  requesterNumber?: string | number;
  academicYear?: string | number;
  childIndex?: number;
  customerName?: string;
  school?: string;
  dueTime?: string;
  priority?: boolean;
  priorityLevel?: 'High' | 'Medium' | 'Low';
  createdAt?: any;
  fulfillmentDate?: any;
  note?: string;
  status: OrderStatus;
  claimedBy: string | null;
  claimedByName?: string | null;
  items: OrderLineItem[];
}

export interface NewOrderInput extends Omit<OrderRecord, 'id' | 'status' | 'claimedBy' | 'createdAt' | 'items'> {
  items: Array<Omit<OrderLineItem, 'itemStatus' | 'reservedInventory'>>;
}

const MAX_ACTIVE_CLAIMS = 5;

export function generateOrderNumber({
  academicYear,
  requesterNumber,
  childIndex,
}: {
  academicYear?: string | number;
  requesterNumber?: string | number;
  childIndex?: number;
} = {}): string {
  const yearDigits = String(academicYear ?? new Date().getFullYear()).replace(/\D/g, '');
  const academicYearCode = Number.isFinite(Number(yearDigits)) && yearDigits.length > 0
    ? String(Math.abs(Number(yearDigits))).slice(-2).padStart(2, '0')
    : '27';

  const requesterDigits = String(requesterNumber ?? '').replace(/\D/g, '');
  const requesterCode = requesterDigits ? requesterDigits.slice(-5).padStart(5, '0') : '00000';

  const childPosition = Math.max(1, Number(childIndex ?? 1));
  const childCode = String.fromCharCode(64 + childPosition).toUpperCase();

  return `${academicYearCode}/${requesterCode}/${childCode}`;
}

export async function createReceivedOrder(input: NewOrderInput): Promise<string> {
  const orderNumber = input.orderNumber || generateOrderNumber({
    academicYear: input.academicYear,
    requesterNumber: input.requesterNumber,
    childIndex: input.childIndex,
  });

  const createdOrder = await addDoc(collection(db, 'orders'), {
    ...input,
    orderNumber,
    items: input.items.map((item) => ({ ...item, itemStatus: 'pending', reservedInventory: [] })),
    status: 'Received',
    claimedBy: null,
    createdAt: serverTimestamp(),
  });
  return createdOrder.id;
}

export async function approveOrder(orderId: string): Promise<'Ready to Pick' | 'Awaiting Stock'> {
  const orderRef = doc(db, 'orders', orderId);
  const initialOrderSnapshot = await getDoc(orderRef);
  if (!initialOrderSnapshot.exists()) throw new Error('This order no longer exists.');
  const initialItems = Array.isArray(initialOrderSnapshot.data().items) ? initialOrderSnapshot.data().items as OrderLineItem[] : [];
  const skuIds = Array.from(new Set(initialItems
    .filter((item) => item.itemStatus !== 'picked')
    .map((item) => String(item.skuId || '').trim())
    .filter(Boolean)));
  const inventoryReferencesBySku = new Map<string, Array<ReturnType<typeof doc>>>();
  await Promise.all(skuIds.map(async (skuId) => {
    const matches = await getDocs(query(collection(db, 'inventory'), where('skuid', '==', skuId)));
    inventoryReferencesBySku.set(skuId, matches.docs.map((stockDocument) => doc(db, 'inventory', stockDocument.id)));
  }));

  return runTransaction(db, async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error('This order no longer exists.');

    const order = orderSnapshot.data() as OrderRecord;
    const currentStatus = order.status || 'Received';
    if (currentStatus !== 'Received' && currentStatus !== 'Awaiting Stock') {
      throw new Error('Only received or awaiting-stock orders can be approved.');
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const pendingItems = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.itemStatus !== 'picked');
    const requiredBySku = new Map<string, number>();

    for (const { item } of pendingItems) {
      const skuId = String(item.skuId || '').trim();
      const quantity = Number(item.quantity);
      if (!skuId || !Number.isFinite(quantity) || quantity <= 0) {
        transaction.update(orderRef, {
          status: 'Awaiting Stock',
          approvalStatus: 'Approved',
          approvedAt: serverTimestamp(),
          stockCheckedAt: serverTimestamp(),
        });
        return 'Awaiting Stock';
      }
      requiredBySku.set(skuId, (requiredBySku.get(skuId) || 0) + quantity);
    }

    if (requiredBySku.size === 0) {
      transaction.update(orderRef, {
        status: 'Awaiting Stock',
        approvalStatus: 'Approved',
        approvedAt: serverTimestamp(),
        stockCheckedAt: serverTimestamp(),
      });
      return 'Awaiting Stock';
    }

    const currentSkuIds = Array.from(requiredBySku.keys());
    const inventoryReferences = Array.from(new Map(currentSkuIds.flatMap((skuId) =>
      (inventoryReferencesBySku.get(skuId) || []).map((reference) => [reference.path, reference] as const),
    )).values());
    const stockSnapshots = await Promise.all(inventoryReferences.map((reference) => transaction.get(reference)));
    const inventoryBySku = new Map<string, Array<{ id: string; quantity: number }>>();
    const inventoryById = new Map<string, { quantity: number; skuId: string }>();
    stockSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) return;
      const skuId = String(snapshot.data().skuid || '');
      if (!requiredBySku.has(skuId)) return;
      const quantity = Math.max(0, Number(snapshot.data().quantity || 0));
      const documents = inventoryBySku.get(skuId) || [];
      documents.push({ id: snapshot.id, quantity });
      inventoryBySku.set(skuId, documents);
      inventoryById.set(snapshot.id, { quantity, skuId });
    });

    const hasEnoughStock = Array.from(requiredBySku.entries()).every(([skuId, required]) =>
      (inventoryBySku.get(skuId) || []).reduce((total, item) => total + item.quantity, 0) >= required,
    );
    if (!hasEnoughStock) {
      transaction.update(orderRef, {
        status: 'Awaiting Stock',
        approvalStatus: 'Approved',
        approvedAt: serverTimestamp(),
        stockCheckedAt: serverTimestamp(),
      });
      return 'Awaiting Stock';
    }

    const remainingByInventoryId = new Map(Array.from(inventoryById.entries()).map(([id, item]) => [id, item.quantity]));
    const updatedItems = items.map((item) => ({ ...item }));
    for (const { item, index } of pendingItems) {
      let quantityRemaining = Number(item.quantity);
      const reservations: Array<{ documentId: string; quantity: number }> = [];
      for (const stockDocument of inventoryBySku.get(item.skuId) || []) {
        const available = remainingByInventoryId.get(stockDocument.id) || 0;
        const reserved = Math.min(available, quantityRemaining);
        if (reserved <= 0) continue;
        reservations.push({ documentId: stockDocument.id, quantity: reserved });
        remainingByInventoryId.set(stockDocument.id, available - reserved);
        quantityRemaining -= reserved;
        if (quantityRemaining === 0) break;
      }
      updatedItems[index] = { ...item, itemStatus: item.itemStatus || 'pending', reservedInventory: reservations };
    }

    for (const [inventoryId, remainingQuantity] of remainingByInventoryId) {
      const initialQuantity = inventoryById.get(inventoryId)?.quantity;
      if (initialQuantity !== undefined && remainingQuantity !== initialQuantity) {
        transaction.update(doc(db, 'inventory', inventoryId), { quantity: remainingQuantity, updatedAt: serverTimestamp() });
      }
    }

    transaction.update(orderRef, {
      status: 'Ready to Pick',
      approvalStatus: 'Approved',
      items: updatedItems,
      claimedBy: null,
      approvedAt: serverTimestamp(),
      stockCheckedAt: serverTimestamp(),
    });
    return 'Ready to Pick';
  });
}

export async function claimOrder(orderId: string, userId: string, userName: string): Promise<void> {
  const counterRef = doc(db, 'order_claim_counters', userId);
  const initialCounterSnapshot = await getDoc(counterRef);
  const legacyActiveClaimCount = initialCounterSnapshot.exists()
    ? 0
    : (await getDocs(query(collection(db, 'orders'), where('claimedBy', '==', userId))))
      .docs.filter((claim) => claim.data().status === 'Claimed').length;

  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'orders', orderId);
    const [orderSnapshot, counterSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(counterRef),
    ]);
    if (!orderSnapshot.exists()) throw new Error('This order no longer exists.');

    const order = orderSnapshot.data() as OrderRecord;
    if (order.status !== 'Ready to Pick' || order.claimedBy) {
      throw new Error('This order is no longer available to claim.');
    }

    const activeCount = counterSnapshot.exists()
      ? Number(counterSnapshot.data()?.activeCount || 0)
      : legacyActiveClaimCount;
    if (activeCount >= MAX_ACTIVE_CLAIMS) {
      throw new Error(`You can have up to ${MAX_ACTIVE_CLAIMS} active claimed orders.`);
    }

    transaction.update(orderRef, {
      status: 'Claimed',
      claimedBy: userId,
      claimedByName: userName,
      claimedAt: serverTimestamp(),
    });
    transaction.set(counterRef, { userId, activeCount: activeCount + 1, updatedAt: serverTimestamp() });
  });
}

export async function updateClaimedOrderItemStatus(
  orderId: string,
  userId: string,
  itemIndex: number,
  clickedStatus: 'picked' | 'not-picked',
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error('This order no longer exists.');
    const order = orderSnapshot.data() as OrderRecord;
    if (order.status !== 'Claimed' || order.claimedBy !== userId) {
      throw new Error('This order is no longer assigned to you.');
    }
    const items = Array.isArray(order.items) ? order.items.map((item) => ({ ...item })) : [];
    if (!items[itemIndex]) throw new Error('This order item could not be found.');
    items[itemIndex] = {
      ...items[itemIndex],
      itemStatus: items[itemIndex].itemStatus === clickedStatus ? 'pending' : clickedStatus,
    };
    transaction.update(orderRef, { items, updatedAt: serverTimestamp() });
  });
}

export async function finalizeClaimedOrder(
  orderId: string,
  userId: string,
  resolution: 'complete' | 'shortage',
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error('This order no longer exists.');
    const order = orderSnapshot.data() as OrderRecord;
    if (order.status !== 'Claimed' || order.claimedBy !== userId) {
      throw new Error('This order is no longer assigned to you.');
    }
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.some((item) => item.itemStatus !== 'picked' && item.itemStatus !== 'not-picked')) {
      throw new Error('Mark every item as picked or not picked before completing the order.');
    }

    const counterRef = doc(db, 'order_claim_counters', userId);
    const counterSnapshot = await transaction.get(counterRef);
    const unpickedReservations = resolution === 'shortage'
      ? items.filter((item) => item.itemStatus === 'not-picked').flatMap((item) => item.reservedInventory || [])
      : [];
    const stockSnapshots = await Promise.all(unpickedReservations.map(({ documentId }) =>
      transaction.get(doc(db, 'inventory', documentId)),
    ));

    unpickedReservations.forEach((reservation, index) => {
      const stockSnapshot = stockSnapshots[index];
      if (stockSnapshot.exists()) {
        transaction.update(stockSnapshot.ref, {
          quantity: Number(stockSnapshot.data().quantity || 0) + reservation.quantity,
          updatedAt: serverTimestamp(),
        });
      }
    });

    const updatedItems = resolution === 'shortage'
      ? items.map((item) => item.itemStatus === 'not-picked'
        ? { ...item, itemStatus: 'pending', reservedInventory: [] }
        : item)
      : items;
    const activeCount = Math.max(0, Number(counterSnapshot.data()?.activeCount || 0) - 1);
    transaction.update(orderRef, {
      status: resolution === 'complete' ? 'Completed' : 'Awaiting Stock',
      items: updatedItems,
      claimedBy: null,
      claimedByName: null,
      claimedAt: null,
      completedAt: resolution === 'complete' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    transaction.set(counterRef, { userId, activeCount, updatedAt: serverTimestamp() });
  });
}

export function getMaxActiveClaims(): number {
  return MAX_ACTIVE_CLAIMS;
}
