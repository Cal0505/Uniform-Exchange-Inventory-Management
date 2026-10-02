import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clock3, Filter, PackageCheck, Search, ShoppingCart } from 'lucide-react';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { approveOrder, claimOrder, finalizeClaimedOrder, getMaxActiveClaims, updateClaimedOrderItemStatus } from '../orderLifecycle';
import { db } from '../firebase';

interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-teal-400">
        <Filter className="h-3.5 w-3.5 text-teal-700" />{label}
        {selected.length > 0 && <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-800">{selected.length}</span>}
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 max-h-64 min-w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        {options.length > 0 ? options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-700 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onChange(selected.includes(option.value)
                ? selected.filter((value) => value !== option.value)
                : [...selected, option.value])}
              className="h-4 w-4 accent-teal-700"
            />
            <span>{option.label}</span>
          </label>
        )) : <p className="px-2 py-2 text-xs text-slate-500">No options available</p>}
        {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="mt-1 w-full border-t border-slate-100 px-2 py-2 text-left text-xs font-bold text-teal-700">Clear filters</button>}
      </div>
    </details>
  );
}

type PriorityLevel = 'High' | 'Medium' | 'Low';
type SortField = 'priority' | 'createdAt' | 'fulfillmentDate' | 'studentName' | 'school' | 'itemCode';

const getPriorityLevel = (order: PickerOrder): PriorityLevel => order.priorityLevel || (order.priority ? 'High' : 'Medium');

const getTimestamp = (value?: any) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

interface PickerOrderItem {
  skuId?: string;
  quantity?: number;
  qty?: number;
  type?: string;
  size?: string;
  sizeLabel?: string;
  sizeSku?: string;
  sizeOption?: string;
  colour?: string;
  shelf?: string;
  childName?: string;
  childSchool?: string;
  childAge?: number;
  itemCode?: string;
  categoryId?: string;
  itemStatus?: 'pending' | 'picked' | 'not-picked';
}

interface PickerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  school: string;
  dueTime: string;
  priority?: boolean;
  priorityLevel?: PriorityLevel;
  createdAt?: string | number;
  fulfillmentDate?: string | number;
  schoolId?: string;
  schoolType?: string;
  categoryIds?: string[];
  status: string;
  note?: string;
  claimedBy?: string | null;
  completed?: boolean;
  items: PickerOrderItem[];
}

interface PickersProps {
  activePickerTab?: 'ready' | 'waiting' | 'picked' | 'received';
  currentUserId: string;
  currentUserName?: string;
  schools?: Array<{ id: string; name: string }>;
}

export default function Pickers({ activePickerTab: controlledTab, currentUserId, currentUserName = 'Current Picker', schools = [] }: PickersProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orders, setOrders] = useState<PickerOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [queueTab, setQueueTab] = useState<'available' | 'claimed'>('available');
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderError, setOrderError] = useState('');
  const [orderNotice, setOrderNotice] = useState('');
  const activePickerTab = controlledTab ?? 'ready';
  const maxActiveClaims = getMaxActiveClaims();
  const activeClaimCount = orders.filter((order) => order.status === 'Claimed' && order.claimedBy === currentUserId).length;

  useEffect(() => onSnapshot(collection(db, 'orders'), (snapshot) => {
    const currentOrders = snapshot.docs.map((orderDocument) => {
      const data = orderDocument.data();
      const items = Array.isArray(data.items) ? data.items.map((item: PickerOrderItem) => ({
        ...item,
        type: item.type || item.itemCode || item.skuId || 'Order item',
        qty: Number(item.quantity ?? item.qty ?? 0),
        itemStatus: item.itemStatus || 'pending',
      })) : [];
      const legacyStatuses: Record<string, string> = {
        'Ready to pick': 'Ready to Pick',
        'Waiting on stock': 'Awaiting Stock',
        Picked: 'Completed',
        'In progress': data.claimedBy ? 'Claimed' : 'Ready to Pick',
      };
      return {
        ...data,
        id: orderDocument.id,
        orderNumber: data.orderNumber || orderDocument.id,
        customerName: data.customerName || data.studentName || 'Customer',
        school: data.school || data.schoolName || 'School not specified',
        dueTime: data.dueTime || '',
        status: legacyStatuses[data.status] || data.status || 'Received',
        items,
      } as PickerOrder;
    });
    setOrders(currentOrders);
    setLoadingOrders(false);
    setOrderError('');
  }, (error) => {
    console.error('Failed to load orders', error);
    setOrderError('Orders could not be loaded. Please try again.');
    setLoadingOrders(false);
  }), []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setSelectedOrderId(null);
    setQueueTab('available');
  }, [activePickerTab]);

  const handleItemStatusChange = async (orderId: string, itemIndex: number, clickedStatus: 'picked' | 'not-picked') => {
    if (!currentUserId) return;
    try {
      setOrderError('');
      await updateClaimedOrderItemStatus(orderId, currentUserId, itemIndex, clickedStatus);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Could not save order progress.');
    }
  };

  const handleFinaliseOrder = async (orderId: string, resolution: 'complete' | 'shortage') => {
    try {
      setOrderError('');
      await finalizeClaimedOrder(orderId, currentUserId, resolution);
      setSelectedOrderId(null);
      setQueueTab('available');
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Could not complete this order.');
    }
  };

  const handleOpenOrder = (orderId: string) => setSelectedOrderId(orderId);

  const handleClaimOrder = async (orderId: string) => {
    if (activeClaimCount >= maxActiveClaims) {
      setOrderError(`You already have ${maxActiveClaims} active claimed orders. Complete one before claiming another.`);
      return;
    }
    try {
      setOrderError('');
      await claimOrder(orderId, currentUserId, currentUserName);
      setSelectedOrderId(orderId);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Could not claim this order. It may have been claimed by another user.');
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      setOrderError('');
      const status = await approveOrder(orderId);
      setOrderNotice(status === 'Ready to Pick'
        ? 'Order approved and moved to Available Orders.'
        : 'Order approved, but some items are out of stock. It was moved to Awaiting Stock.');
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Could not approve this order.');
    }
  };

  const handleNotApproveOrder = async (orderId: string) => {
    try {
      setOrderError('');
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'Awaiting Stock',
        approvalStatus: 'Not Approved',
        reviewedAt: serverTimestamp(),
      });
      setOrderNotice('Order was marked as not approved and returned for review.');
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Could not reject this order.');
    }
  };

  const tabOrders = useMemo(() => orders.filter((order) => {
    if (activePickerTab === 'received') return order.status === 'Received';
    if (activePickerTab === 'waiting') return order.status === 'Awaiting Stock' || order.status === 'Waiting on stock';
    if (activePickerTab === 'picked') return order.status === 'Completed' || order.status === 'Picked';
    if (queueTab === 'claimed') return order.status === 'Claimed' && order.claimedBy === currentUserId;
    return order.status === 'Ready to Pick' && !order.claimedBy;
  }), [orders, activePickerTab, queueTab, currentUserId]);

  const priorityOptions: FilterOption[] = ['High', 'Medium', 'Low'].map((priority) => ({ value: priority, label: priority }));
  const schoolOptions = useMemo(() => Array.from(new Map([
    ...schools.map((school) => [school.id, school.name] as const),
    ...orders.map((order) => [order.schoolId || order.school, order.school] as const),
  ]).entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)), [schools, orders]);

  const filteredOrders = useMemo(() => {
    const visibleOrders = tabOrders.filter((order) => {
      if (order.id === selectedOrderId) return true;

      const matchesSearch = !debouncedSearch || [
        order.customerName || '',
        order.orderNumber || '',
        order.school || '',
        ...order.items.map((item) => item.childName || ''),
        ...order.items.map((item) => item.itemCode || item.type || item.skuId || ''),
      ].some((val) => val.toLowerCase().includes(debouncedSearch));

      if (!matchesSearch) return false;
      if (selectedPriorities.length && !selectedPriorities.includes(getPriorityLevel(order))) return false;
      const schoolKey = order.schoolId || order.school || '';
      if (selectedSchools.length && !selectedSchools.includes(schoolKey)) return false;
      return true;
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...visibleOrders].sort((left, right) => {
      if (sortField === 'priority') {
        const weights: Record<PriorityLevel, number> = { High: 3, Medium: 2, Low: 1 };
        return (weights[getPriorityLevel(left)] - weights[getPriorityLevel(right)]) * direction;
      }
      if (sortField === 'createdAt' || sortField === 'fulfillmentDate') {
        return (getTimestamp(left[sortField]) - getTimestamp(right[sortField])) * direction;
      }
      const getStringValue = (order: PickerOrder) => {
        if (sortField === 'school') return order.school || '';
        if (sortField === 'studentName') return order.items.map((item) => item.childName || '').join(' ');
        return order.items.map((item) => item.itemCode || item.type || item.skuId || '').join(' ');
      };
      return getStringValue(left).localeCompare(getStringValue(right), undefined, { sensitivity: 'base' }) * direction;
    });
  }, [tabOrders, debouncedSearch, selectedOrderId, selectedPriorities, selectedSchools, sortField, sortDirection]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const totalItems = filteredOrders.reduce((sum, order) => sum + order.items.reduce((total, item) => total + Number(item.qty ?? item.quantity ?? 0), 0), 0);

  // Checks if every single item has been actioned (picked or marked not-picked)
  const isOrderFullyActioned = useMemo(() => {
    if (!selectedOrder) return false;
    return selectedOrder.items.every(item => item.itemStatus === 'picked' || item.itemStatus === 'not-picked');
  }, [selectedOrder]);

  const hasShortages = useMemo(() => {
    if (!selectedOrder) return false;
    return selectedOrder.items.some(item => item.itemStatus === 'not-picked');
  }, [selectedOrder]);

  const getDisplayOrderNumber = (orderNumber?: string) => {
    const normalized = (orderNumber || '').trim();
    if (!normalized) return 'Order';
    return normalized.replace(/\/[A-Z]$/, '');
  };

  const getOrderItemSize = (item: PickerOrderItem) => item.sizeLabel || item.size || item.sizeSku || item.sizeOption || 'Size not selected';

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

  const groupItemsByChildForOrder = (order: PickerOrder) => {
    const grouped = new Map<string, { school: string; age: number; items: Array<{ item: PickerOrderItem; index: number }> }>();
    order.items.forEach((item, index) => {
      const childName = item.childName || `Child ${index + 1}`;
      const existing = grouped.get(childName) ?? { school: item.childSchool || '', age: item.childAge || 0, items: [] };
      existing.items.push({ item, index });
      grouped.set(childName, existing);
    });
    return Array.from(grouped.entries()).map(([childName, group]) => ({ childName, ...group }));
  };

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
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">{getDisplayOrderNumber(selectedOrder.orderNumber)}</div>
          <h2 className="mt-1 text-2xl font-black text-slate-900">{selectedOrder.customerName}</h2>
          {selectedOrder.note && <p className="mt-2 text-xs italic text-slate-600">Note: {selectedOrder.note}</p>}
        </div>
        <div className="space-y-4">
          {groupedItemsByChild.map(({ childName, school, age, items }, groupIndex) => (
            <div key={childName} className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-orange-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{childName.replace(/^Child\s+/i, 'Child ')}</h3>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <span>{school || 'School not specified'}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px]">Age {age || 'N/A'}</span>
                  </div>
                </div>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-orange-700">Child {String.fromCharCode(65 + groupIndex)}</span>
              </div>

              <div className="space-y-3">
                {items.map(({ item, index }) => (
                  <div key={index} className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4">
                    <div className="flex items-start justify-between">
                      <h4 className="text-base font-black text-slate-900">{item.type || 'Item'}</h4>
                      <span className="min-w-[2.6rem] text-center rounded-lg border border-teal-200 bg-white px-2 py-1 text-[11px] font-black">QTY: {item.qty ?? item.quantity ?? 0}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-xl border border-teal-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase text-teal-600">Size</span>
                        <span className="font-black text-slate-800">{item.size || 'No size selected'}</span>
                      </div>
                      <div className="rounded-xl border border-teal-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase text-teal-600">Colour</span>
                        <span className="font-black text-slate-800">{item.colour || 'N/A'}</span>
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
      {orderError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{orderError}</div>}
      {orderNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{orderNotice}</div>}
      {activePickerTab === 'ready' && (
        <div role="tablist" aria-label="Order queue" className="flex items-center gap-2 border-b border-slate-200">
          <button type="button" role="tab" aria-selected={queueTab === 'available'} onClick={() => setQueueTab('available')} className={`border-b-2 px-4 py-3 text-sm font-bold ${queueTab === 'available' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            Available Orders
          </button>
          <button type="button" role="tab" aria-selected={queueTab === 'claimed'} onClick={() => setQueueTab('claimed')} className={`border-b-2 px-4 py-3 text-sm font-bold ${queueTab === 'claimed' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            Claimed Orders
          </button>
          <span className={`ml-auto text-xs font-bold ${activeClaimCount >= maxActiveClaims ? 'text-rose-700' : 'text-slate-500'}`}>{activeClaimCount}/{maxActiveClaims} active claims</span>
        </div>
      )}
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MultiSelectFilter label="Priority" options={priorityOptions} selected={selectedPriorities} onChange={setSelectedPriorities} />
          <MultiSelectFilter label="School" options={schoolOptions} selected={selectedSchools} onChange={setSelectedSchools} />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            <span className="sr-only">Sort orders by</span>
            <select value={sortField} onChange={(event) => setSortField(event.target.value as SortField)} className="max-w-44 bg-transparent outline-none">
              <option value="priority">Priority weight</option>
              <option value="createdAt">Date created</option>
              <option value="fulfillmentDate">Target fulfillment</option>
              <option value="studentName">Student name</option>
              <option value="school">School name</option>
              <option value="itemCode">Item code</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')}
            aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            title={`Currently ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-teal-400"
          >
            {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </button>
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
        {loadingOrders ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading orders...</div>
        ) : filteredOrders.length > 0 ? filteredOrders.map((order) => {
          const orderChildren = groupItemsByChildForOrder(order);
          return (
            <article key={order.id} className="w-full overflow-hidden rounded-3xl border border-orange-200 bg-white text-left shadow-sm transition hover:border-orange-300">
              <div className="flex flex-col gap-3 bg-slate-50/60 px-4 py-3 md:flex-row md:items-center md:justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[10px] font-black text-orange-600">
                    {getDisplayOrderNumber(order.orderNumber)}
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${getPriorityLevel(order) === 'High' ? 'bg-red-100 text-red-700' : getPriorityLevel(order) === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {getPriorityLevel(order)} priority
                    </span>
                    <h3 className="text-base font-black text-slate-900">{order.customerName || 'Customer'}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>{order.dueTime || order.fulfillmentDate || 'No due date'}</span>
                </div>
              </div>

              {activePickerTab === 'received' && (
                <div className="space-y-3 p-4">
                  {orderChildren.map(({ childName, school, age, items }, groupIndex) => (
                    <div key={`${order.id}-${childName}`} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
                      <div className="border-b border-orange-100 pb-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Child {String.fromCharCode(65 + groupIndex)}</p>
                          <div className="mt-1 space-y-0.5 text-xs font-bold text-slate-700">
                            <p><span className="font-black text-slate-500">Age:</span> {age || 'N/A'}</p>
                            <p><span className="font-black text-slate-500">School:</span> {school || 'School not specified'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                        {items.map(({ item, index }) => (
                          <div key={`${order.id}-${childName}-${index}`} className="min-w-0 rounded-lg border border-white bg-white px-2 py-1.5 text-[11px] leading-tight">
                            <span className="whitespace-nowrap font-bold text-slate-700">{item.type || 'Item'}, </span>
                            <span className="whitespace-nowrap font-black text-slate-900">{getOrderItemSize(item)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[10px] font-medium text-slate-600">
                        <span className="font-black uppercase tracking-[0.12em] text-slate-500">Additional info:</span> {order.note || 'No special notes for this child.'}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col gap-2 pt-2 md:flex-row">
                    <button type="button" onClick={() => void handleApproveOrder(order.id)} className="flex-1 rounded-xl border border-teal-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-teal-800 hover:bg-teal-50">Approve</button>
                    <button type="button" onClick={() => void handleNotApproveOrder(order.id)} className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-rose-700 hover:bg-rose-100">Not Approve</button>
                  </div>
                </div>
              )}

              {activePickerTab !== 'received' && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs font-bold text-slate-600">
                  <span>{order.school || 'School not specified'}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1">{order.items.length} items</span>
                    {activePickerTab === 'waiting' && (
                      <button type="button" onClick={() => void handleApproveOrder(order.id)} className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-xs font-black text-teal-800 hover:bg-teal-50">Recheck Stock</button>
                    )}
                    {activePickerTab === 'ready' && queueTab === 'available' && (
                      <button type="button" disabled={activeClaimCount >= maxActiveClaims} onClick={() => void handleClaimOrder(order.id)} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300">Claim Order</button>
                    )}
                    {activePickerTab === 'ready' && queueTab === 'claimed' && (
                      <button type="button" onClick={() => handleOpenOrder(order.id)} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-black text-white hover:bg-teal-800">Continue Picking</button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        }) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {activePickerTab === 'received' ? 'There are no received orders awaiting review.' : activePickerTab === 'ready' && queueTab === 'claimed' ? 'You have no claimed orders.' : activePickerTab === 'waiting' ? 'There are no orders awaiting stock.' : 'No orders are available in this queue.'}
          </div>
        )}
      </div>
    </div>
  );
}
