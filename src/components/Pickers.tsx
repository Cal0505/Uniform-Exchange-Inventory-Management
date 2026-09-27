import React, { useEffect, useMemo, useState } from 'react';
import { Search, Clock3, PackageCheck, MapPin, UserRound, ShoppingCart, CheckCircle2 } from 'lucide-react';

interface PickerOrderItem {
  type: string;
  size: string;
  colour: string;
  qty: number;
  shelf?: string;
  childName?: string;
  childSchool?: string;
  childAge?: number;
  itemStatus?: 'pending' | 'picked' | 'not-picked';
}

interface PickerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  school: string;
  dueTime: string;
  priority?: boolean;
  status: 'Ready to pick' | 'In progress' | 'Waiting on stock' | 'Picked';
  note?: string;
  claimedBy?: string | null;
  completed?: boolean;
  items: PickerOrderItem[];
}

const inventoryStock: Record<string, number> = {
  'boys shorts|8|navy': 18,
  'girls polo|10|white': 12,
  'boys shirts|12|blue': 20,
  'tracksuit top|medium|black': 8,
  'tracksuit bottom|medium|black': 8,
  'sports polo|l|green': 30,
  'track pants|m|charcoal': 16,
  'girls polo|6|navy': 0,
  'boys shorts|10|black': 0,
};

const getItemStockKey = (item: Pick<PickerOrderItem, 'type' | 'size' | 'colour'>) => `${item.type.toLowerCase()}|${item.size.toLowerCase()}|${item.colour.toLowerCase()}`;
const getAvailableInventoryStock = (item: Pick<PickerOrderItem, 'type' | 'size' | 'colour'>) => inventoryStock[getItemStockKey(item)] ?? 25;

const baseOrders: PickerOrder[] = [
  {
    id: 'PO-2041',
    orderNumber: 'PO-2041',
    customerName: 'Sarah Thompson',
    school: 'All Hallows School',
    dueTime: 'Today · 9:00 AM',
    status: 'Ready to pick',
    note: 'Priority morning pack for uniform day.',
    priority: true,
    claimedBy: null,
    items: [
      { type: 'Boys Shorts', size: '8', colour: 'Navy', qty: 6, shelf: 'A-14', childName: 'Child 1', childSchool: 'All Hallows School', childAge: 8, itemStatus: 'pending' },
      { type: 'Girls Polo', size: '10', colour: 'White', qty: 4, shelf: 'B-09', childName: 'Child 1', childSchool: 'All Hallows School', childAge: 8, itemStatus: 'pending' },
      { type: 'Boys Shirts', size: '12', colour: 'Blue', qty: 3, shelf: 'C-02', childName: 'Child 2', childSchool: 'Bayside College', childAge: 11, itemStatus: 'pending' },
    ],
  },
  {
    id: 'PO-2044',
    orderNumber: 'PO-2044',
    customerName: 'Daniel Brooks',
    school: 'Greenfield Academy',
    dueTime: 'Today · 11:15 AM',
    status: 'Ready to pick',
    note: 'PE pack ready for collection.',
    priority: false,
    claimedBy: null,
    items: [
      { type: 'Sports Polo', size: 'L', colour: 'Green', qty: 8, shelf: 'E-04', childName: 'Child 1', childSchool: 'Greenfield Academy', childAge: 10, itemStatus: 'pending' },
      { type: 'Track Pants', size: 'M', colour: 'Charcoal', qty: 5, shelf: 'F-02', childName: 'Child 1', childSchool: 'Greenfield Academy', childAge: 10, itemStatus: 'pending' },
      { type: 'Sports Polo', size: 'M', colour: 'Green', qty: 4, shelf: 'E-04', childName: 'Child 2', childSchool: 'Riverside Academy', childAge: 12, itemStatus: 'pending' },
    ],
  },
  {
    id: 'PO-2047',
    orderNumber: 'PO-2047',
    customerName: 'Marcus Lee',
    school: 'St Josephs',
    dueTime: 'Tomorrow · 8:45 AM',
    status: 'Waiting on stock',
    note: 'Waiting on additional stock for girls polo and black shorts.',
    claimedBy: null,
    items: [
      { type: 'Girls Polo', size: '6', colour: 'Navy', qty: 6, shelf: 'B-08', childName: 'Child 1', childSchool: 'St Josephs', childAge: 7, itemStatus: 'pending' },
      { type: 'Boys Shorts', size: '10', colour: 'Black', qty: 4, shelf: 'A-11', childName: 'Child 2', childSchool: 'Elm Park School', childAge: 9, itemStatus: 'pending' },
    ],
  },
  {
    id: 'PO-2051',
    orderNumber: 'PO-2051',
    customerName: 'Emma Carter',
    school: 'Northside College',
    dueTime: 'Today · 4:20 PM',
    status: 'Waiting on stock',
    note: 'New order needs one missing item before release.',
    claimedBy: null,
    items: [
      { type: 'Track Pants', size: 'M', colour: 'Charcoal', qty: 6, shelf: 'F-02', childName: 'Child 1', childSchool: 'Northside College', childAge: 13, itemStatus: 'pending' },
      { type: 'Hoodie', size: 'L', colour: 'Red', qty: 4, shelf: 'G-07', childName: 'Child 1', childSchool: 'Northside College', childAge: 13, itemStatus: 'pending' },
      { type: 'Track Pants', size: 'L', colour: 'Charcoal', qty: 3, shelf: 'F-02', childName: 'Child 2', childSchool: 'Harbour View', childAge: 14, itemStatus: 'pending' },
    ],
  },
  {
    id: 'PO-2056',
    orderNumber: 'PO-2056',
    customerName: 'Alicia Reed',
    school: 'Hillview Secondary',
    dueTime: 'Friday · 10:30 AM',
    status: 'Ready to pick',
    note: 'Sports kit for Friday fixtures.',
    priority: true,
    claimedBy: null,
    items: [
      { type: 'Sports Polo', size: 'M', colour: 'Green', qty: 7, shelf: 'E-04', childName: 'Child 1', childSchool: 'Hillview Secondary', childAge: 12, itemStatus: 'pending' },
      { type: 'Track Pants', size: 'L', colour: 'Charcoal', qty: 4, shelf: 'F-02', childName: 'Child 1', childSchool: 'Hillview Secondary', childAge: 12, itemStatus: 'pending' },
      { type: 'Boys Shirts', size: '10', colour: 'Blue', qty: 3, shelf: 'C-02', childName: 'Child 2', childSchool: 'Bayside College', childAge: 15, itemStatus: 'pending' },
    ],
  },
  {
    id: 'PO-2060',
    orderNumber: 'PO-2060',
    customerName: 'Olivia Grant',
    school: 'All Hallows School',
    dueTime: 'Today · 3:50 PM',
    status: 'Picked',
    note: 'Completed and packed for dispatch.',
    claimedBy: 'Jamie',
    completed: true,
    items: [
      { type: 'Girls Polo', size: '8', colour: 'White', qty: 3, shelf: 'B-09', childName: 'Child 1', childSchool: 'All Hallows School', childAge: 9, itemStatus: 'picked' },
      { type: 'Boys Shorts', size: '10', colour: 'Navy', qty: 2, shelf: 'A-14', childName: 'Child 1', childSchool: 'All Hallows School', childAge: 9, itemStatus: 'picked' },
      { type: 'Girls Polo', size: '10', colour: 'White', qty: 2, shelf: 'B-09', childName: 'Child 2', childSchool: 'Bayside College', childAge: 10, itemStatus: 'picked' },
    ],
  },
  {
    id: 'PO-2065',
    orderNumber: 'PO-2065',
    customerName: 'Noah Patel',
    school: 'Westfield Primary',
    dueTime: 'Monday · 9:15 AM',
    status: 'Ready to pick',
    note: 'Ready for next week’s stock run.',
    priority: false,
    claimedBy: null,
    items: [
      { type: 'Boys Shirts', size: '8', colour: 'Blue', qty: 5, shelf: 'C-02', childName: 'Child 1', childSchool: 'Westfield Primary', childAge: 6, itemStatus: 'pending' },
      { type: 'Girls Polo', size: '10', colour: 'White', qty: 5, shelf: 'B-09', childName: 'Child 2', childSchool: 'Bayside College', childAge: 7, itemStatus: 'pending' },
    ],
  },
  {
    id: 'PO-2071',
    orderNumber: 'PO-2071',
    customerName: 'Mia Johnson',
    school: 'Oakridge Academy',
    dueTime: 'Tomorrow · 1:30 PM',
    status: 'Picked',
    note: 'All items packed and ready for collection.',
    claimedBy: 'Riley',
    completed: true,
    items: [
      { type: 'Tracksuit Top', size: 'Medium', colour: 'Black', qty: 2, shelf: 'D-11', childName: 'Child 1', childSchool: 'Oakridge Academy', childAge: 14, itemStatus: 'picked' },
      { type: 'Tracksuit Bottom', size: 'Medium', colour: 'Black', qty: 2, shelf: 'D-11', childName: 'Child 1', childSchool: 'Oakridge Academy', childAge: 14, itemStatus: 'picked' },
      { type: 'Sports Polo', size: 'S', colour: 'Green', qty: 3, shelf: 'E-04', childName: 'Child 2', childSchool: 'Riverside Academy', childAge: 11, itemStatus: 'picked' },
    ],
  },
];

const uniformCatalog = [
  { type: 'Boys Shorts', sizes: ['6', '8', '10', '12'], colours: ['Navy', 'Black', 'Grey'] },
  { type: 'Girls Polo', sizes: ['6', '8', '10', '12'], colours: ['White', 'Navy', 'Pink'] },
  { type: 'Boys Shirts', sizes: ['8', '10', '12', '14'], colours: ['Blue', 'White', 'Red'] },
  { type: 'Sports Polo', sizes: ['S', 'M', 'L'], colours: ['Green', 'Blue', 'Gold'] },
  { type: 'Track Pants', sizes: ['S', 'M', 'L', 'XL'], colours: ['Charcoal', 'Black', 'Navy'] },
  { type: 'Tracksuit Top', sizes: ['Small', 'Medium', 'Large'], colours: ['Black', 'Navy', 'Red'] },
  { type: 'Tracksuit Bottom', sizes: ['Small', 'Medium', 'Large'], colours: ['Black', 'Navy', 'Red'] },
  { type: 'Hoodie', sizes: ['6', '8', '10', '12', '14'], colours: ['Red', 'Navy', 'Black'] },
  { type: 'Jumpers', sizes: ['6', '8', '10', '12'], colours: ['Grey', 'Blue', 'Green'] },
  { type: 'Skorts', sizes: ['6', '8', '10', '12'], colours: ['Navy', 'Khaki', 'Black'] },
];

const firstNames = ['Ava', 'Liam', 'Noah', 'Ella', 'Mason', 'Sophia', 'Lucas', 'Ruby', 'Oliver', 'Maya', 'Leo', 'Grace', 'Ethan', 'Harper', 'Theo', 'Chloe', 'James', 'Zoe', 'Henry', 'Amelia', 'Jack', 'Lily', 'Daniel', 'Ivy', 'Samuel', 'Nora', 'Isaac', 'Layla', 'Finn', 'Sophie', 'Gabriel', 'Rosie', 'Aaron', 'Hannah', 'Caleb', 'Lucy', 'Wyatt', 'Mila', 'David', 'Poppy', 'Owen', 'Leah'];
const lastNames = ['Walker', 'Bennett', 'Collins', 'Powell', 'Turner', 'Hughes', 'Murray', 'Sullivan', 'Foster', 'Brooks', 'Harris', 'Campbell', 'Grey', 'Wells', 'Reed', 'Sparks', 'Baker', 'Stone', 'Knight', 'Fox', 'Evans', 'Hill', 'Price', 'Morris', 'Young', 'Cook', 'Dixon', 'Bell', 'Allen', 'King'];
const schoolNames = ['All Hallows School', 'Bayside College', 'Riverside Academy', 'Elm Park School', 'Harbour View', 'Northside College', 'St Josephs', 'Greenfield Academy', 'Hillview Secondary', 'Westfield Primary', 'Oakridge Academy', 'Salendin Nook', 'Pinecrest School', 'Lakeside College', 'Brighton Prep'];
const dueTimeOptions = ['Today · 8:30 AM', 'Today · 9:45 AM', 'Today · 11:10 AM', 'Today · 2:20 PM', 'Tomorrow · 8:15 AM', 'Tomorrow · 10:50 AM', 'Tomorrow · 1:40 PM', 'Friday · 9:05 AM', 'Friday · 3:15 PM', 'Monday · 9:00 AM'];
const noteTemplates = ['Morning pack ready for collection.', 'Uniform delivery requested for the week.', 'Sports kit prepared for the next activity.', 'New term order for schoolwear.', 'Packed and ready for the next school day.', 'Short notice order for classes this week.'];

const generateAdditionalOrders = (): PickerOrder[] => {
  const generatedOrders: PickerOrder[] = [];

  for (let i = 0; i < 50; i += 1) {
    const customerName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3 + 7) % lastNames.length]}`;
    const orderIndex = i + 1;
    const dueTime = dueTimeOptions[i % dueTimeOptions.length];
    const priority = i % 4 === 0;
    const notes = noteTemplates[i % noteTemplates.length];
    const statusPool: PickerOrder['status'][] = ['Ready to pick', 'Ready to pick', 'Ready to pick', 'Ready to pick', 'Waiting on stock', 'Picked'];
    const status = statusPool[i % statusPool.length];
    const childCount = (i % 5) + 1;
    const items: PickerOrderItem[] = [];

    for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
      const childName = `Child ${childIndex + 1}`;
      const childSchool = schoolNames[(i + childIndex * 4 + 2) % schoolNames.length];
      const childAge = 4 + ((i + childIndex * 3) % 12);
      const itemCount = (i + childIndex + 1) % 6 + 1;

      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const catalogItem = uniformCatalog[(i + childIndex + itemIndex) % uniformCatalog.length];
        const sizeIndex = (i + childIndex * 2 + itemIndex * 3) % catalogItem.sizes.length;
        const colourIndex = (i + childIndex * 5 + itemIndex * 2) % catalogItem.colours.length;
        const itemQty = ((i + childIndex + itemIndex) % 4) + 1;
        const shelfLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

        items.push({
          type: catalogItem.type,
          size: catalogItem.sizes[sizeIndex],
          colour: catalogItem.colours[colourIndex],
          qty: itemQty,
          shelf: `${shelfLetters[(i + childIndex + itemIndex) % shelfLetters.length]}-${((i + childIndex + itemIndex) % 12) + 1}`,
          childName,
          childSchool,
          childAge,
          itemStatus: status === 'Picked' ? 'picked' : (i + childIndex + itemIndex) % 5 === 0 ? 'not-picked' : 'pending',
        });
      }
    }

    generatedOrders.push({
      id: `PO-${2200 + orderIndex}`,
      orderNumber: `PO-${2200 + orderIndex}`,
      customerName,
      school: schoolNames[i % schoolNames.length],
      dueTime,
      status,
      note: notes,
      priority,
      claimedBy: status === 'Picked' ? (i % 2 === 0 ? 'Jamie' : 'Riley') : null,
      completed: status === 'Picked',
      items,
    });
  }

  return generatedOrders;
};

const initialOrders: PickerOrder[] = [...baseOrders, ...generateAdditionalOrders()];

const statusStyles: Record<PickerOrder['status'], string> = {
  'Ready to pick': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'In progress': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Waiting on stock': 'bg-rose-50 text-rose-700 border border-rose-200',
  Picked: 'bg-slate-200 text-slate-700 border border-slate-300',
};

interface PickersProps {
  activePickerTab?: 'ready' | 'waiting' | 'picked';
  currentUserName?: string;
}

export default function Pickers({ activePickerTab: controlledTab, currentUserName = 'Current Picker' }: PickersProps) {
  const storageKey = 'picker-orders-shared';

  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<PickerOrder[]>(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const activePickerTab = controlledTab ?? 'ready';

  useEffect(() => {
    try {
      const storedOrders = window.localStorage.getItem(storageKey);
      setOrders(storedOrders ? JSON.parse(storedOrders) : initialOrders);
    } catch {
      setOrders(initialOrders);
    }
    setSelectedOrderId(null);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(orders));
    } catch {
      // Ignore storage errors in restricted browser environments.
    }
  }, [orders]);

  const statusMap = {
    ready: 'Ready to pick',
    waiting: 'Waiting on stock',
    picked: 'Picked',
  } as const;

  const currentStatus = statusMap[activePickerTab];

  const handleItemStatusChange = (orderId: string, itemIndex: number, nextStatus: 'picked' | 'not-picked') => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) return order;

        const updatedItems = order.items.map((item, index) =>
          index === itemIndex ? { ...item, itemStatus: nextStatus } : item,
        );

        return {
          ...order,
          items: updatedItems,
          completed: updatedItems.every((item) => item.itemStatus === 'picked'),
        };
      }),
    );
  };

  const classifiedOrders = useMemo(() => {
    return orders.map((order) => {
      const orderItemStates = order.items.map((item) => {
        const stockAvailable = getAvailableInventoryStock(item);
        if (item.itemStatus === 'picked') return { ...item, itemStatus: 'picked' as const };
        if (item.itemStatus === 'not-picked') return { ...item, itemStatus: 'not-picked' as const };
        return {
          ...item,
          itemStatus: stockAvailable >= item.qty ? ('pending' as const) : ('not-picked' as const),
        };
      });

      const missingStockItems = orderItemStates.filter((item) => getAvailableInventoryStock(item) < item.qty);
      const hasPickedAll = orderItemStates.length > 0 && orderItemStates.every((item) => item.itemStatus === 'picked');

      const derivedStatus = order.completed || hasPickedAll
        ? 'Picked'
        : missingStockItems.length > 0
          ? 'Waiting on stock'
          : 'Ready to pick';

      return {
        ...order,
        status: derivedStatus,
        items: orderItemStates,
        completed: order.completed || hasPickedAll,
      };
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return classifiedOrders.filter((order) => {
      const matchesSearch = !search || [
        order.customerName,
        order.orderNumber,
        order.school,
        order.items.map((item) => item.type).join(' '),
      ].some((value) => value.toLowerCase().includes(search.toLowerCase()));

      const isClaimedByAnotherUser = !!order.claimedBy && order.claimedBy !== currentUserName;
      if (isClaimedByAnotherUser) return false;

      if (activePickerTab === 'ready') return matchesSearch && order.status === 'Ready to pick';
      if (activePickerTab === 'waiting') return matchesSearch && order.status === 'Waiting on stock';
      return matchesSearch && order.status === 'Picked';
    });
  }, [search, activePickerTab, classifiedOrders, currentUserName]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId) || null;

  const totalItems = filteredOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);

  const handleOpenOrder = (orderId: string) => {
    const orderToOpen = classifiedOrders.find((order) => order.id === orderId);
    if (!orderToOpen) return;
    if (orderToOpen.claimedBy && orderToOpen.claimedBy !== currentUserName) return;

    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) return order;
        if (!order.claimedBy) return { ...order, claimedBy: currentUserName };
        return order;
      }),
    );
    setSelectedOrderId(orderId);
  };

  const groupedItemsByChild = useMemo(() => {
    const grouped = new Map<string, { school: string; age: number; items: Array<{ item: PickerOrderItem; index: number }> }>();

    selectedOrder?.items.forEach((item, index) => {
      const childName = item.childName || `Child ${index + 1}`;
      const schoolName = item.childSchool || selectedOrder?.school || 'School not assigned';
      const ageValue = item.childAge ?? 0;
      const existing = grouped.get(childName) ?? { school: schoolName, age: ageValue, items: [] };
      existing.school = item.childSchool || existing.school;
      existing.age = item.childAge ?? existing.age;
      existing.items.push({ item, index });
      grouped.set(childName, existing);
    });

    return Array.from(grouped.entries()).map(([childName, group]) => ({
      childName,
      school: group.school,
      age: group.age,
      items: group.items,
    }));
  }, [selectedOrder]);

  if (selectedOrder) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 text-left select-none">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedOrderId(null)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600"
          >
            Back to orders
          </button>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">
            {selectedOrder.claimedBy === currentUserName ? 'Claimed by you' : 'Order locked'}
          </span>
        </div>

        <div className="rounded-3xl border border-orange-200 bg-orange-50/40 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">{selectedOrder.orderNumber}</div>
              <h2 className="mt-1 text-2xl font-black text-slate-900">{selectedOrder.customerName}</h2>
            </div>
            <div className="flex items-center gap-5 text-xs text-slate-600">
              <span className="font-bold">{selectedOrder.dueTime}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {groupedItemsByChild.map(({ childName, school, age, items }) => (
            <div key={childName} className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-orange-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{childName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <span>{school}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-600">Age {age}</span>
                  </div>
                </div>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-orange-700">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-3">
                {items.map(({ item, index }) => (
                  <div key={`${selectedOrder.id}-${childName}-${index}`} className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-slate-900">{item.type}</h4>
                      </div>
                      <span className="inline-flex items-center justify-center min-w-[2.6rem] rounded-lg border border-teal-200 bg-white px-2 py-1 text-[11px] font-black text-slate-700">{item.qty}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-teal-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Size</span>
                        <span className="mt-1 block font-black text-slate-800">{item.size}</span>
                      </div>
                      <div className="rounded-xl border border-teal-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Colour</span>
                        <span className="mt-1 block font-black text-slate-800">{item.colour}</span>
                      </div>
                      <div className="rounded-xl border border-teal-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Shelf</span>
                        <span className="mt-1 block font-black text-slate-800">{item.shelf || 'Warehouse zone'}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(selectedOrder.id, index, 'picked')}
                        className={`px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-[0.12em] ${item.itemStatus === 'picked' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-teal-200 bg-white text-teal-700'}`}
                      >
                        Picked
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(selectedOrder.id, index, 'not-picked')}
                        className={`px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-[0.12em] ${item.itemStatus === 'not-picked' ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        Not picked
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-left select-none">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_auto] md:items-center">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, order, school, item..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-2 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-orange-600"><ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em]">Open Orders</span></div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">{filteredOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-2 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-teal-600"><PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em]">Units to Pick</span></div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">{totalItems}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-4 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600"><Clock3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em]">Due Soon</span></div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900">{filteredOrders.filter((order) => order.status === 'Ready to pick').length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
          <div
            key={order.id}
            onClick={() => handleOpenOrder(order.id)}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !event.defaultPrevented) {
                event.preventDefault();
                handleOpenOrder(order.id);
              }
            }}
            role="button"
            tabIndex={0}
            className="w-full text-left rounded-3xl border border-orange-200 bg-orange-50/40 overflow-hidden shadow-sm transition hover:border-orange-300 hover:bg-orange-50/60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <div className="flex flex-col gap-3 border-b border-orange-200 bg-white/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
                  {order.orderNumber.replace('PO-', '')}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">Requester</span>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${order.priority ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {order.priority ? 'Priority' : 'Standard'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">{order.customerName}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-600 md:justify-end">
                <div className="flex items-center gap-1.5">
                  <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold">{order.dueTime}</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-xl border border-orange-200 bg-white/70 px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center justify-between gap-3">
                <span className="uppercase tracking-[0.12em] text-slate-500">Request</span>
                <span className="font-black text-slate-800">{order.priority ? 'Priority order' : 'Standard order'}</span>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[11px] font-bold text-slate-600">
                <span className="uppercase tracking-[0.12em] text-slate-500">Items</span>
                <span className="text-slate-700">{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No customer orders match the current search.
          </div>
        )}
      </div>
    </div>
  );
}
