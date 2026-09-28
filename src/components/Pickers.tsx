import React, { useEffect, useMemo, useState } from 'react';
import { Search, Clock3, PackageCheck, ShoppingCart } from 'lucide-react';

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

const uniformCatalog = [
  { type: 'Boys Shorts', sizes: ['6', '8', '10', '12'], colours: ['Navy', 'Black', 'Grey'] },
  { type: 'Girls Polo', sizes: ['6', '8', '10', '12'], colours: ['White', 'Navy', 'Pink'] },
  { type: 'Boys Shirts', sizes: ['8', '10', '12', '14'], colours: ['Blue', 'White', 'Red'] },
  { type: 'Sports Polo', sizes: ['S', 'M', 'L'], colours: ['Green', 'Blue', 'Gold'] },
  { type: 'Track Pants', sizes: ['S', 'M', 'L', 'XL'], colours: ['Charcoal', 'Black', 'Navy'] },
  { type: 'Tracksuit Top', sizes: ['Small', 'Medium', 'Large'], colours: ['Black', 'Navy', 'Red'] },
  { type: 'Tracksuit Bottom', sizes: ['Small', 'Medium', 'Large'], colours: ['Black', 'Navy', 'Red'] },
  { type: 'Hoodie', sizes: ['6', '8', '10', '12', '14'], colours: ['Red', 'Navy', 'Black'] },
];

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
    ],
  },
];

const generateAdditionalOrders = (): PickerOrder[] => {
  const generatedOrders: PickerOrder[] = [];
  const firstNames = ['Ava', 'Liam', 'Noah', 'Ella', 'Mason', 'Sophia', 'Lucas'];
  const lastNames = ['Walker', 'Bennett', 'Collins', 'Powell', 'Turner'];
  const schoolNames = ['All Hallows School', 'Bayside College', 'Riverside Academy'];
  
  for (let i = 0; i < 15; i += 1) {
    const customerName = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const orderIndex = i + 1;
    const items: PickerOrderItem[] = [];
    for (let childIndex = 0; childIndex < 2; childIndex += 1) {
      const catalogItem = uniformCatalog[(i + childIndex) % uniformCatalog.length];
      items.push({
        type: catalogItem.type,
        size: catalogItem.sizes[0],
        colour: catalogItem.colours[0],
        qty: 2,
        shelf: `A-${(i % 10) + 1}`,
        childName: `Child ${childIndex + 1}`,
        childSchool: schoolNames[i % schoolNames.length],
        childAge: 7,
        itemStatus: 'pending',
      });
    }

    generatedOrders.push({
      id: `PO-${2200 + orderIndex}`,
      orderNumber: `PO-${2200 + orderIndex}`,
      customerName,
      school: schoolNames[i % schoolNames.length],
      dueTime: 'Today · 3:00 PM',
      status: 'Ready to pick',
      priority: i % 3 === 0,
      claimedBy: null,
      completed: false,
      items,
    });
  }
  return generatedOrders;
};

const initialOrders: PickerOrder[] = [...baseOrders, ...generateAdditionalOrders()];

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
      if (storedOrders) setOrders(JSON.parse(storedOrders));
    } catch {
      setOrders(initialOrders);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Handle toggling button states on/off with explicit strict type definitions
  const handleItemStatusChange = (orderId: string, itemIndex: number, clickedStatus: 'picked' | 'not-picked') => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) return order;

        const updatedItems = order.items.map((item, index) => {
          if (index !== itemIndex) return item;
          
          const nextStatus: 'pending' | 'picked' | 'not-picked' = 
            item.itemStatus === clickedStatus ? 'pending' : clickedStatus;
            
          return { ...item, itemStatus: nextStatus };
        });

        return { ...order, items: updatedItems };
      }),
    );
  };

  // Final submission of the order workflow logic
  const handleFinaliseOrder = (orderId: string, resolution: 'complete' | 'shortage') => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          status: resolution === 'complete' ? 'Picked' : 'Waiting on stock',
          completed: resolution === 'complete',
        };
      }),
    );
    setSelectedOrderId(null);
  };
  // Open / claim logic
  const handleOpenOrder = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;
    if (targetOrder.claimedBy && targetOrder.claimedBy !== currentUserName) return;

    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId) return order;
        return { ...order, claimedBy: currentUserName, status: 'In progress' };
      }),
    );
    setSelectedOrderId(orderId);
  };

  // Filtering out claimed or un-matching orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.id === selectedOrderId) return true;

      const matchesSearch = !search || [
        order.customerName,
        order.orderNumber,
        order.school,
      ].some((val) => val.toLowerCase().includes(search.toLowerCase()));

      if (order.claimedBy && order.claimedBy !== currentUserName) return false;

      if (activePickerTab === 'ready') return matchesSearch && order.status !== 'Picked' && order.status !== 'Waiting on stock';
      if (activePickerTab === 'waiting') return matchesSearch && order.status === 'Waiting on stock';
      return matchesSearch && order.status === 'Picked';
    });
  }, [search, activePickerTab, orders, currentUserName, selectedOrderId]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const totalItems = filteredOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + i.qty, 0), 0);

  // Checks if every single item has been actioned (picked or marked not-picked)
  const isOrderFullyActioned = useMemo(() => {
    if (!selectedOrder) return false;
    return selectedOrder.items.every(item => item.itemStatus === 'picked' || item.itemStatus === 'not-picked');
  }, [selectedOrder]);

  const hasShortages = useMemo(() => {
    if (!selectedOrder) return false;
    return selectedOrder.items.some(item => item.itemStatus === 'not-picked');
  }, [selectedOrder]);

  const groupedItemsByChild = useMemo(() => {
    const grouped = new Map<string, { school: string; age: number; items: Array<{ item: PickerOrderItem; index: number }> }>();
    selectedOrder?.items.forEach((item, index) => {
      const childName = item.childName || `Child ${index + 1}`;
      const existing = grouped.get(childName) ?? { school: item.childSchool || '', age: item.childAge || 0, items: [] };
      existing.items.push({ item, index });
      grouped.set(childName, existing);
    });
    return Array.from(grouped.entries()).map(([childName, group]) => ({ childName, ...group }));
  }, [selectedOrder]);

  // View 1: Active order picking terminal view window
  if (selectedOrder) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 text-left select-none pb-28"> {/* Safe bottom padding to clear floating bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedOrderId(null)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600"
          >
            Back to dashboard
          </button>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">
            Assigned to you
          </span>
        </div>

        <div className="rounded-3xl border border-orange-200 bg-orange-50/40 p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">{selectedOrder.orderNumber}</div>
          <h2 className="mt-1 text-2xl font-black text-slate-900">{selectedOrder.customerName}</h2>
          {selectedOrder.note && <p className="mt-2 text-xs italic text-slate-600">Note: {selectedOrder.note}</p>}
        </div>
        <div className="space-y-4">
          {groupedItemsByChild.map(({ childName, school, age, items }) => (
            <div key={childName} className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-orange-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{childName}</h3>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <span>{school}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px]">Age {age}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {items.map(({ item, index }) => (
                  <div key={index} className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4">
                    <div className="flex items-start justify-between">
                      <h4 className="text-base font-black text-slate-900">{item.type}</h4>
                      <span className="min-w-[2.6rem] text-center rounded-lg border border-teal-200 bg-white px-2 py-1 text-[11px] font-black">QTY: {item.qty}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-xl border border-teal-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase text-teal-600">Size</span>
                        <span className="font-black text-slate-800">{item.size}</span>
                      </div>
                      <div className="rounded-xl border border-teal-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase text-teal-600">Colour</span>
                        <span className="font-black text-slate-800">{item.colour}</span>
                      </div>
                      <div className="rounded-xl border border-teal-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase text-teal-600">Shelf</span>
                        <span className="font-black text-slate-800">{item.shelf || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(selectedOrder.id, index, 'picked')}
                        className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider text-center transition ${
                          item.itemStatus === 'picked'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Picked
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(selectedOrder.id, index, 'not-picked')}
                        className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider text-center transition ${
                          item.itemStatus === 'not-picked'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Not Picked
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Locked Fixed Sticky Bottom Footbar Container */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-xl z-50 flex justify-center">
          <div className="w-full max-w-4xl">
            {!isOrderFullyActioned ? (
              /* Disabled State: User hasn't finished evaluating all line items */
              <button
                type="button"
                disabled
                className="w-full py-4 bg-slate-200 text-slate-400 text-sm font-black uppercase tracking-widest rounded-2xl cursor-not-allowed border border-slate-300 text-center"
              >
                Select status for all items
              </button>
            ) : !hasShortages ? (
              /* Success State: Everything is flagged as picked */
              <button
                type="button"
                onClick={() => handleFinaliseOrder(selectedOrder.id, 'complete')}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-md transform active:scale-[0.99] transition text-center"
              >
                Complete Order
              </button>
            ) : (
              /* Warning State: At least one item was checked off as missing */
              <button
                type="button"
                onClick={() => handleFinaliseOrder(selectedOrder.id, 'shortage')}
                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-md transform active:scale-[0.99] transition text-center"
              >
                Send to Shortage List
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // View 2: Dashboard Overview Grid lists
  return (
    <div className="max-w-6xl mx-auto space-y-5 text-left select-none">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, order, school..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-orange-600"><ShoppingCart className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-wider">Queue Size</span></div>
          <p className="mt-2 text-2xl font-black text-slate-900">{filteredOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-teal-600"><PackageCheck className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-wider">Total Units</span></div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalItems}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
          <div
            key={order.id}
            onClick={() => handleOpenOrder(order.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleOpenOrder(order.id); }}
            className="w-full text-left rounded-3xl border border-orange-200 bg-white overflow-hidden shadow-sm transition hover:border-orange-300 hover:bg-orange-50/20 cursor-pointer"
          >
            <div className="flex flex-col gap-3 bg-slate-50/60 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[10px] font-black text-orange-600">
                  {order.orderNumber.replace('PO-', '')}
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${order.priority ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {order.priority ? 'Priority' : 'Standard'}
                  </span>
                  <h3 className="text-base font-black text-slate-900">{order.customerName}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Clock3 className="w-3.5 h-3.5" />
                <span>{order.dueTime}</span>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center text-xs text-slate-600 font-bold">
              <span>{order.school}</span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">{order.items.length} items</span>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No orders available in this queue.
          </div>
        )}
      </div>
    </div>
  );
}
