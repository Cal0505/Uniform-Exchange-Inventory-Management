import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { doc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { Trash2, Search, PlusCircle } from 'lucide-react';
import AddStockModal from './AddStockModal';

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

  const [filters, setFilters] = useState({ search: '', schoolId: 'ALL', clothingType: 'ALL', size: 'ALL' });

  const activeCategoryObj = categories.find(c => c.id === currentViewedCategory);
  const showSchoolColumn = activeCategoryObj?.hasSchools ?? true;

  const getSchoolName = (item: any) => {
    if (item.schoolName) return item.schoolName;
    if (item.schoolId) {
      const match = schools.find((school: any) => school.id === item.schoolId || school.skuCode === item.schoolSku);
      if (match?.name) return match.name;
    }
    return 'General';
  };

  const getTypeName = (item: any) => {
    if (item.clothingType) return item.clothingType;
    if (item.typeName) return item.typeName;
    if (item.typeId) {
      const match = clothingTypes.find((type: any) => type.id === item.typeId || type.skuCode === item.typeSku);
      if (match?.name) return match.name;
    }
    if (item.typeSku) {
      const match = clothingTypes.find((type: any) => type.skuCode === item.typeSku);
      if (match?.name) return match.name;
    }
    return item.type || 'Type';
  };

  const getSizeLabel = (item: any) => {
    if (item.size) return item.size;
    if (item.sizeLabel) return item.sizeLabel;
    if (item.sizeId) {
      const match = sizes.find((size: any) => size.id === item.sizeId || size.skuCode === item.sizeSku);
      if (match?.label || match?.name) return match.label || match.name;
    }
    if (item.sizeSku) {
      const match = sizes.find((size: any) => size.skuCode === item.sizeSku);
      if (match?.label || match?.name) return match.label || match.name;
    }
    return item.sizeSku || 'N/A';
  };

  const getColourName = (item: any) => {
    if (item.colour) return item.colour;
    if (item.colourName) return item.colourName;
    if (item.colourId) {
      const match = colours.find((colour: any) => colour.id === item.colourId || colour.skuCode === item.colourSku);
      if (match?.name) return match.name;
    }
    if (item.colourSku) {
      const match = colours.find((colour: any) => colour.skuCode === item.colourSku);
      if (match?.name) return match.name;
    }
    return item.colourSku || 'Colour';
  };

  const getLocationName = (item: any) => {
    if (item.location) return item.location;
    if (item.locationName) return item.locationName;
    if (item.locationId) {
      const match = locations.find((location: any) => location.id === item.locationId || location.skuCode === item.locationSku);
      if (match?.name) return match.name;
    }
    if (item.locationSku) {
      const match = locations.find((location: any) => location.skuCode === item.locationSku);
      if (match?.name) return match.name;
    }
    return item.locationSku || 'Hub';
  };

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
      const itemCategoryId = item.categoryId || '';
      const itemCategoryName = (item.category || '').toString().trim();
      const currentCategory = categories.find((category) => category.id === currentViewedCategory);
      const currentCategoryName = currentCategory?.name || '';
      const matchesCategory =
        itemCategoryId === currentViewedCategory ||
        itemCategoryName.toLowerCase() === (currentCategoryName || '').toLowerCase() ||
        itemCategoryName.toLowerCase() === (currentViewedCategory || '').toLowerCase() ||
        itemCategoryName.toLowerCase() === (currentCategory?.name || currentViewedCategory || '').toLowerCase();

      if (!matchesCategory) return false;

      const itemTypeName = getTypeName(item);
      const itemLocationName = getLocationName(item);
      const itemSizeLabel = getSizeLabel(item);

      const matchesSearch = itemTypeName.toLowerCase().includes(filters.search.toLowerCase()) || itemLocationName.toLowerCase().includes(filters.search.toLowerCase());
      const matchesSchool = filters.schoolId === 'ALL' || item.schoolId === filters.schoolId;
      const matchesType = filters.clothingType === 'ALL' || itemTypeName === filters.clothingType;
      const matchesSize = filters.size === 'ALL' || itemSizeLabel === filters.size;
      return matchesSearch && matchesSchool && matchesType && matchesSize;
    });
  }, [inventory, currentViewedCategory, categories, filters, clothingTypes, sizes, locations]);

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

      {/* DATA TABLE / CARDS */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden w-full">
        <div className="hidden md:block">
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
                {showSchoolColumn && <div className="truncate font-black">{getSchoolName(item)}</div>}
                <div className="text-brand-primary uppercase tracking-wide truncate">{getTypeName(item)}</div>
                <div className="text-center font-mono bg-slate-100 px-1.5 py-0.5 rounded-md border w-max mx-auto">{getSizeLabel(item)}</div>
                <div className="text-slate-500 truncate">{getColourName(item)}</div>
                <div className="font-extrabold">{getLocationName(item)}</div>
                <div className="text-right"><span className="px-2 py-0.5 rounded-lg border bg-slate-50">{item.quantity}</span></div>
                <div className="text-right pr-1"><button onClick={() => handleSecureDeleteItem(item.id, getTypeName(item))} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden p-3 space-y-3">
          {filteredInventory.map((item: any) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {showSchoolColumn && (
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 truncate">{getSchoolName(item)}</p>
                  )}
                  <h4 className="mt-1 text-sm font-black text-slate-900 truncate">{getTypeName(item)}</h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center justify-center min-w-[2.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-black text-slate-700">{item.quantity}</span>
                  <button onClick={() => handleSecureDeleteItem(item.id, getTypeName(item))} className="p-1.5 rounded-lg bg-white text-slate-300 hover:text-rose-600 border border-slate-200"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Size</span>
                  <span className="mt-1 block font-black text-slate-800">{getSizeLabel(item)}</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Colour</span>
                  <span className="mt-1 block font-black text-slate-800 truncate">{getColourName(item)}</span>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Location</span>
                  <span className="mt-1 block font-black text-slate-800">{getLocationName(item)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddStockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        schools={schools}
        clothingTypes={clothingTypes}
        sizes={sizes}
        colours={colours}
        locations={locations}
        defaultCategory={activeCategoryObj?.name || currentViewedCategory || 'Plain'}
      />
    </div>
  );
}