import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { doc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { Trash2, Search, Loader2, PlusCircle, X } from 'lucide-react';

interface InventoryProps {
  currentViewedCategory: string | null;
  categories: any[];
  schools: any[];
  clothingTypes: any[];
  sizes: any[];
  colours: any[];
  locations: any[];
  inventory: any[];
}

export default function Inventory({
  currentViewedCategory, categories, schools, clothingTypes, sizes, colours, locations, inventory
}: InventoryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filters, setFilters] = useState({ search: '', schoolId: 'ALL', clothingType: 'ALL', size: 'ALL' });
  
  const [newItem, setNewItem] = useState({ 
    schoolId: '', quantity: '', size: '', colour: '', clothingType: '', 
    packagingType: 'Single', location: '', extraField: '' 
  });

  const activeCategoryObj = categories.find(c => c.id === currentViewedCategory);
  const showSchoolColumn = activeCategoryObj?.hasSchools ?? true;

  const getExtraFieldLabel = () => {
    if (newItem.packagingType === 'Single') return 'Shelf';
    if (newItem.packagingType === 'VacPac') return 'VacPac ID';
    if (newItem.packagingType === 'Both') {
      return newItem.location === 'Pickers Shelf' ? 'Shelf' : 'VacPac ID';
    }
    return 'Details';
  };

  const filteredInventory = useMemo(() => {
    return (inventory || []).filter(item => {
      if (item.categoryId !== currentViewedCategory) return false;
      const matchesSearch = item.clothingType.toLowerCase().includes(filters.search.toLowerCase()) || (item.location || '').toLowerCase().includes(filters.search.toLowerCase());
      const matchesSchool = filters.schoolId === 'ALL' || item.schoolId === filters.schoolId;
      const matchesType = filters.clothingType === 'ALL' || item.clothingType === filters.clothingType;
      const matchesSize = filters.size === 'ALL' || item.size === filters.size;
      return matchesSearch && matchesSchool && matchesType && matchesSize;
    });
  }, [inventory, currentViewedCategory, filters]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'inventory'), { ...newItem, categoryId: currentViewedCategory, createdAt: new Date() });
      setNewItem({ schoolId: '', quantity: '', size: '', colour: '', clothingType: '', packagingType: 'Single', location: '', extraField: '' });
      setIsModalOpen(false);
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleSecureDeleteItem = async (itemId: string, itemSkuName: string) => {
    const key = prompt(`🔒 CRITICAL OVERRIDE: Delete "${itemSkuName}".\nEnter Master Password:`);
    if (key !== 'J4sp3r#M1sty') { alert("Access Denied."); return; }
    if (!window.confirm("FINAL RECONCILIATION: Are you certain?")) return;
    await deleteDoc(doc(db, 'inventory', itemId));
  };

  return (
    <div className="space-y-6 text-left select-none w-full max-w-5xl">
      
      {/* FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
        <div className="col-span-2 md:col-span-2 relative">
           <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
           <input type="text" placeholder="Search..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs" />
        </div>
        
        {showSchoolColumn && (
          <select onChange={(e) => setFilters({...filters, schoolId: e.target.value})} className="p-2 border rounded-xl text-xs bg-slate-50 font-bold">
            <option value="ALL">All Schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <select onChange={(e) => setFilters({...filters, clothingType: e.target.value})} className="p-2 border rounded-xl text-xs">
          <option value="ALL">All Types</option>
          {clothingTypes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <select onChange={(e) => setFilters({...filters, size: e.target.value})} className="p-2 border rounded-xl text-xs">
          <option value="ALL">All Sizes</option>
          {sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>

        <button onClick={() => setIsModalOpen(true)} className="bg-[#00A896] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
          <PlusCircle className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden w-full">
        <div className={`grid gap-4 p-4 bg-slate-50 font-black text-slate-500 uppercase tracking-wider text-[10px] border-b ${showSchoolColumn ? 'grid-cols-7' : 'grid-cols-6'}`}>
          {showSchoolColumn && <div className="pl-1">School</div>}
          <div>Type</div>
          <div className="text-center">Size</div>
          <div>Colour</div>
          <div>Location</div>
          <div className="text-right">Qty</div>
          <div className="text-right pr-2">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredInventory.map((item: any) => (
            <div key={item.id} className={`grid gap-4 p-4 items-center text-xs font-bold text-slate-700 ${showSchoolColumn ? 'grid-cols-7' : 'grid-cols-6'}`}>
              {showSchoolColumn && <div className="truncate font-black">{item.schoolName || '-'}</div>}
              <div className="text-brand-primary uppercase tracking-wide truncate">{item.clothingType}</div>
              <div className="text-center font-mono bg-slate-100 px-1.5 py-0.5 rounded-md border w-max mx-auto">{item.size}</div>
              <div className="text-slate-500 truncate">{item.colour}</div>
              <div className="font-extrabold">{item.location || 'Hub'}</div>
              <div className="text-right"><span className="px-2 py-0.5 rounded-lg border bg-slate-50">{item.quantity}</span></div>
              <div className="text-right pr-1"><button onClick={() => handleSecureDeleteItem(item.id, item.clothingType)} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddItem} className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400"><X className="w-5 h-5" /></button>
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6">Add New Item</h3>
            <div className="grid grid-cols-1 gap-4">
              {activeCategoryObj?.hasSchools && (
                <select required className="p-3 border rounded-xl text-xs" onChange={(e) => setNewItem({...newItem, schoolId: e.target.value})}><option value="">Select School...</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              )}
              <select required className="p-3 border rounded-xl text-xs" onChange={(e) => setNewItem({...newItem, clothingType: e.target.value})}><option value="">Clothing Type...</option>{clothingTypes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              <select required className="p-3 border rounded-xl text-xs" onChange={(e) => setNewItem({...newItem, size: e.target.value})}><option value="">Size...</option>{sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
              <select required className="p-3 border rounded-xl text-xs" onChange={(e) => setNewItem({...newItem, colour: e.target.value})}><option value="">Colour...</option>{colours.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              <select className="p-3 border rounded-xl text-xs" onChange={(e) => setNewItem({...newItem, packagingType: e.target.value})}><option value="Single">Single</option><option value="VacPac">VacPac</option><option value="Both">Both</option></select>
              <input type="text" placeholder={getExtraFieldLabel()} required className="p-3 border rounded-xl text-xs" onChange={(e) => setNewItem({...newItem, extraField: e.target.value})} />
              <input type="number" placeholder="Quantity" required className="p-3 border rounded-xl text-xs" onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
              <button disabled={isSubmitting} className="w-full bg-[#00A896] text-white py-3 rounded-xl text-xs font-bold mt-4">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Add Item'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}