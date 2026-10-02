import { addDoc, collection, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { generateOrderNumber } from './orderLifecycle';

const FIRST_NAMES = ['Ava', 'Noah', 'Ella', 'Liam', 'Sophia', 'Mason', 'Ruby', 'Leo', 'Grace', 'Zoe', 'Daniel', 'Mia', 'Oscar', 'Nia', 'Isaac', 'Harper', 'Ben', 'Layla', 'Theo', 'Olivia'];
const LAST_NAMES = ['Patel', 'Brown', 'Smith', 'Johnson', 'Taylor', 'Wilson', 'Green', 'Clark', 'Hughes', 'Lee', 'Walker', 'Roberts', 'Mason', 'Cooper', 'Baker', 'Price', 'Ward', 'King', 'Turner', 'Allen'];
const SCHOOLS = ['North Hill Academy', 'Harbour View Primary', 'St. Josephs', 'Kingsway College', 'Riverside School', 'Oak Valley Academy', 'Lakeside Primary', 'Elm Park Prep', 'Sunrise Academy', 'Willow Grove School'];
const ITEM_TYPES = [
  { name: 'Jumper', code: 'JUM' },
  { name: 'Polo Shirt', code: 'POL' },
  { name: 'Trousers', code: 'TRS' },
  { name: 'Shoes', code: 'SHO' },
  { name: 'Coat', code: 'COT' },
  { name: 'Blazer', code: 'BLA' },
  { name: 'Hoodie', code: 'HOD' },
  { name: 'Skirt', code: 'SKI' },
  { name: 'Socks', code: 'SOK' },
  { name: 'Cardigan', code: 'CRD' },
  { name: 'Hat', code: 'HAT' },
  { name: 'PE Kit', code: 'PEK' },
];
const SIZES = ['4', '5', '6', '7', '8', '9', '10', '11', '12', 'XS', 'S', 'M', 'L'];
const COLOURS = ['Navy', 'Black', 'Grey', 'Red', 'Royal Blue', 'Green', 'Purple', 'Maroon'];
const PRIORITIES = ['High', 'Medium', 'Low'] as const;

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function buildChildItems(childName: string, childSchool: string, childAge: number) {
  const totalItems = randomInt(4, 9);
  const items: any[] = [];

  for (let i = 0; i < totalItems; i += 1) {
    const item = pick(ITEM_TYPES);
    items.push({
      skuId: `${item.code}-${randomInt(100, 999)}`,
      itemCode: `${item.code}-${randomInt(100, 999)}`,
      quantity: randomInt(1, 2),
      type: item.name,
      size: item.name === 'Shoes'
        ? `${pick(['Boys', 'Girls'])}_size_${pick(SIZES.filter((size) => /^\d+$/.test(size)))}`
        : `Age ${Math.max(3, childAge - 1)}-${childAge}`,
      colour: pick(COLOURS),
      childName,
      childSchool,
      childAge,
      itemStatus: 'pending',
      shelf: `${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(1, 12)}`,
    });
  }

  return items;
}

function buildOrder(status: 'Received' | 'Ready to Pick' | 'Awaiting Stock' | 'Completed', deliveryState?: 'picked' | 'delivered') {
  const childCount = randomInt(1, 6);
  const requesterName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const school = pick(SCHOOLS);
  const dueTime = status === 'Received'
    ? `Today • ${randomInt(9, 17)}:${String(randomInt(0, 59)).padStart(2, '0')}`
    : status === 'Ready to Pick'
      ? `Tomorrow • ${randomInt(8, 15)}:${String(randomInt(0, 59)).padStart(2, '0')}`
      : status === 'Awaiting Stock'
        ? `This week • ${pick(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}`
        : deliveryState === 'delivered'
          ? `Delivered • ${pick(['Yesterday', 'Today', 'This morning', 'Last week'])}`
          : `Picked • ${pick(['This morning', 'Yesterday', 'Today'])}`;

  const items: any[] = [];
  for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
    const childName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const childAge = randomInt(4, 15);
    const childSchool = pick(SCHOOLS);
    const childItems = buildChildItems(childName, childSchool, childAge);
    childItems.forEach((item) => items.push({
      ...item,
      itemStatus: status === 'Completed' ? 'picked' : 'pending',
    }));
  }

  const result: any = {
    status,
    customerName: requesterName,
    school,
    dueTime,
    priorityLevel: pick(PRIORITIES),
    note: status === 'Awaiting Stock' ? 'Awaiting extra stock from supplier.' : status === 'Completed' ? `Delivery status: ${deliveryState}` : 'Please pack with care.',
    items,
    createdAt: serverTimestamp(),
  };

  if (status === 'Completed') {
    result.completedAt = serverTimestamp();
    result.deliveryStatus = deliveryState || 'picked';
  }

  return result;
}

async function resetOrders() {
  const snapshot = await getDocs(collection(db, 'orders'));
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

export async function seedTestingOrders() {
  await resetOrders();

  const orderGroups = [
    { status: 'Received' as const, count: 10 },
    { status: 'Ready to Pick' as const, count: 10 },
    { status: 'Awaiting Stock' as const, count: 10 },
    { status: 'Completed' as const, count: 10, deliveryState: 'picked' as const },
    { status: 'Completed' as const, count: 10, deliveryState: 'delivered' as const },
  ];

  let orderCursor = 76538;

  for (const group of orderGroups) {
    for (let index = 0; index < group.count; index += 1) {
      const orderData = buildOrder(group.status, group.deliveryState);
      const orderNumber = generateOrderNumber({ academicYear: 27, requesterNumber: orderCursor, childIndex: 1 });
      orderCursor += 1;

      const payload = {
        ...orderData,
        orderNumber,
        claimedBy: null,
        claimedByName: null,
        claimedAt: null,
        approvalStatus: group.status === 'Received' ? 'Pending' : group.status === 'Awaiting Stock' ? 'Not Approved' : 'Approved',
      };

      await addDoc(collection(db, 'orders'), payload);
    }
  }
}