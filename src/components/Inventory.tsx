import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Shirt, Trash2, AlertTriangle, Search, Filter, Loader2 } from 'lucide-react';

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
  currentViewedCategory,
  categories,
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  inventory
}: InventoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('ALL');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // 🔍 Find the active category properties straight from your live categories data pool
  const activeCategoryObj = categories.find(c => c.id === currentViewedCategory);
  const showSchoolColumn = activeCategoryObj ? activeCategoryObj.hasSchools === true : true;

  // ⚡ DESTRUCTIVE ACTION: SECURE PASSWORD LOCK PROMPT FOR DELETIONS
  const handleSecureDeleteItem = async (itemId: string, itemSkuName: string) => {
    // 🔒 THE MASTER SUPERVISOR PASSWORD SECURITY GATEWAY CHALLENGE
    const securityKeyInput = prompt(`🔒 CRITICAL DATABASE OVERRIDE:\nYou are about to permanently delete "${itemSkuName}" from your warehouse registries.\nTo authorize this erasure, enter your Master Password below:`);
    
    if (securityKeyInput !== 'J4sp3r#M1sty') {
      alert("Access Denied: Invalid Security Passkey. The database erasure has been safely aborted.");
      return;
    }

    if (!window.confirm("FINAL RECONCILIATION CHECK: Are you 100% certain you want to scrub this inventory item?")) return;

    try {
      setIsDeletingId(itemId);
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (err) {
      console.error("Cloud database write blocked:", err);
    } finally {
      setIsDeletingId(null);
    }
  };
  // 📡 THE HIGH PERFORMANCE FILTERS SEARCH SCANNER CALCULATOR ENGINE
  const filteredInventory = (inventory || []).filter(item => {
    // 1️⃣ Filter out records that don't belong to the active category selection panel folder
    if (item.categoryId !== currentViewedCategory) return false;

    // 2️⃣ Filter by school dropdown filter if active
    if (selectedSchoolFilter !== 'ALL' && item.schoolId !== selectedSchoolFilter) return false;

    // 3️⃣ Filter by raw search text input string queries keywords
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(term) ||
      (item.schoolName || '').toLowerCase().includes(term) ||
      (item.garmentType || '').toLowerCase().includes(term) ||
      (item.colour || '').toLowerCase().includes(term) ||
      (item.size || '').toLowerCase().includes(term) ||
      (item.location || '').toLowerCase().includes(term);

    return matchesSearch;
  });

  return (
    <div className="space-y-6 text-left select-none animate-fadeIn w-full max-w-5xl">
      
      {/* 🔍 COMPACT SEARCH ENGINE AND FILTER DROPDOWNS TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search this category by garments, sizes, colors, or locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs focus:outline-none focus:border-brand-primary font-medium" />
        </div>
        {showSchoolColumn && (
          <select value={selectedSchoolFilter} onChange={(e) => setSelectedSchoolFilter(e.target.value)} className="p-2 border rounded-xl text-xs bg-slate-50 font-bold text-slate-600 focus:outline-none cursor-pointer w-full sm:w-auto">
            <option value="ALL">🏛️ All School Rosters</option>
            {schools.map(s => <option key={s.id} value={s.skuCode}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* 📊 FLEXIBLE DYNAMIC DATA TABLE SPREADSHEET CANVAS CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden w-full">
        
        {/* HEADER GRID ROW: Adaptive column snapping logic based on school boolean configuration parameters */}
        <div className={`grid gap-4 p-4 bg-slate-50 font-black text-slate-500 uppercase tracking-wider text-[10px] border-b text-left
          ${showSchoolColumn ? 'grid-cols-7' : 'grid-cols-6'}`}
        >
          {showSchoolColumn && <div className="pl-1">School Name</div>}
          <div>Garment Type</div>
          <div className="text-center">Size</div>
          <div>Colour</div>
          <div>Warehouse Location</div>
          <div className="text-right">Quantity</div>
          <div className="text-right pr-2">Actions</div>
        </div>
        {/* DYNAMIC CELL DATA MAP COMPONENT GRID REPOSITORY */}
        <div className="divide-y divide-slate-100">
          {filteredInventory.map((item: any) => (
            <div key={item.id} className={`grid gap-4 p-4 hover:bg-slate-50/50 transition items-center text-xs font-bold text-slate-700 font-sans text-left
              ${showSchoolColumn ? 'grid-cols-7' : 'grid-cols-6'}`}
            >
              {/* Conditional Column 1: School Name */}
              {showSchoolColumn && (
                <div className="truncate text-slate-900 select-text font-black">
                  {item.schoolName || 'Generic Plain Item'}
                </div>
              )}

              {/* Column 2: Garment Type */}
              <div className="text-brand-primary uppercase tracking-wide truncate select-text">
                {item.garmentType || 'Garment'}
              </div>

              {/* Column 3: Sizing Metric (Maps directly to item.size parameters dynamically) */}
              <div className="text-center font-mono uppercase text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border w-max mx-auto shrink-0 select-all">
                {item.size || 'OS'}
              </div>

              {/* Column 4: Colour Profile (Maps directly to item.colour parameters dynamically) */}
              <div className="text-slate-500 truncate select-text">
                {item.colour || 'Standard'}
              </div>

              {/* Column 5: Shelf Warehouse Storage Mapping Coordinates */}
              <div className="leading-tight">
                <span className="block text-slate-900 font-extrabold truncate select-text">{item.location || 'Warehouse Hub'}</span>
                <span className="text-[10px] font-mono font-medium text-teal-600 uppercase tracking-wider block mt-0.5 select-none">
                  📐 Shelf: {item.location && item.location.includes('Row') ? item.location.replace('Shelf Row ', '') : 'FRONT'}
                </span>
              </div>

              {/* Column 6: Stock Quantity Volume */}
              <div className="text-right flex items-center justify-end gap-1.5 font-mono pr-1 select-none">
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black border tracking-wide
                  ${Number(item.quantity) <= 5 
                    ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' 
                    : 'bg-slate-50 text-slate-900 border-slate-200'
                  }`}
                >
                  {item.quantity || 0} units
                </span>
              </div>

              {/* Column 7: Administrative Action Options Row (Locked behind Passkey Overrides) */}
              <div className="text-right flex items-center justify-end select-none pr-1">
                <button
                  type="button"
                  disabled={isDeletingId === item.id}
                  onClick={() => handleSecureDeleteItem(item.id, item.name)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 transition cursor-pointer disabled:opacity-50"
                >
                  {isDeletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>

            </div>
          ))}
          
          {filteredInventory.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-sans uppercase tracking-wider text-xs select-none">No active inventory records logged matching this criteria filter profile.</div>
          )}
        </div>
      </div>
    </div>
  );
}
