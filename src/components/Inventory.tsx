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
  const [activeInventoryTab, setActiveInventoryTab] = useState<'single' | 'vacpac'>('single');

  const [filters, setFilters] = useState({ search: '', schoolId: 'ALL', clothingType: 'ALL', size: 'ALL', shelfNo: '', vacpacNumber: '' });

  const activeCategoryObj = categories.find(c => c.id === currentViewedCategory);
  const showSchoolColumn = activeCategoryObj?.hasSchools ?? true;

  const matchesCategoryFilter = (item: any) => {
    const itemCategoryId = item.categoryId || '';
    const itemCategoryName = (item.category || '').toString().trim();
    const currentCategory = categories.find((category) => category.id === currentViewedCategory);
    const currentCategoryName = currentCategory?.name || '';

    return (
      itemCategoryId === currentViewedCategory ||
      itemCategoryName.toLowerCase() === (currentCategoryName || '').toLowerCase() ||
      itemCategoryName.toLowerCase() === (currentViewedCategory || '').toLowerCase() ||
      itemCategoryName.toLowerCase() === (currentCategory?.name || currentViewedCategory || '').toLowerCase()
    );
  };

  const getSchoolShortName = (item: any) => {
    const schoolName = getSchoolName(item);
    return schoolName === 'General' ? 'General' : schoolName;
  };

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

  const filteredInventory = useMemo(() => {
    return (inventory || []).filter((item: any) => {
      if (!matchesCategoryFilter(item)) return false;

      const itemTypeName = getTypeName(item);
      const itemLocationName = getLocationName(item);
      const itemSizeLabel = getSizeLabel(item);
      const itemSchoolName = getSchoolName(item);
      const itemColourName = getColourName(item);
      const itemShelfCode = (item.shelfCode || '').toUpperCase();
      const itemPackNumber = item.packNumber !== undefined && item.packNumber !== null ? String(item.packNumber) : '';
      const query = filters.search.trim().toLowerCase();

      const matchesSearch = !query || [
        itemTypeName,
        itemLocationName,
        itemSchoolName,
        itemColourName,
        itemShelfCode,
        itemPackNumber,
      ].some((value) => String(value).toLowerCase().includes(query));

      const matchesSchool = filters.schoolId === 'ALL' || item.schoolId === filters.schoolId || item.schoolSku === filters.schoolId;
      const matchesType = filters.clothingType === 'ALL' || itemTypeName === filters.clothingType;
      const matchesSize = filters.size === 'ALL' || itemSizeLabel === filters.size;
      const matchesShelf = !filters.shelfNo || (item.type === 'single' && itemShelfCode.includes(filters.shelfNo.trim().toUpperCase()));
      const matchesVacpac = !filters.vacpacNumber || (item.type === 'vacpac' && itemPackNumber.includes(filters.vacpacNumber.trim()));

      return matchesSearch && matchesSchool && matchesType && matchesSize && matchesShelf && matchesVacpac;
    });
  }, [inventory, currentViewedCategory, categories, filters, clothingTypes, sizes, locations, schools, colours]);

  const singleInventory = useMemo(
    () => filteredInventory.filter((item: any) => item.type === 'single'),
    [filteredInventory],
  );

  const vacpacInventory = useMemo(
    () => filteredInventory.filter((item: any) => item.type === 'vacpac'),
    [filteredInventory],
  );

  const vacpacGroups = useMemo(() => {
    const categoryRequiresSchool = activeCategoryObj?.hasSchools ?? activeCategoryObj?.hasSchool ?? true;
    const groups: { [key: string]: any[] } = {};

    vacpacInventory.forEach((item) => {
      const schoolKey = categoryRequiresSchool ? (getSchoolName(item) || 'General') : null;
      const typeKey = categoryRequiresSchool ? null : (getTypeName(item) || 'Unknown Type');
      const packKey = item.packNumber ?? item.id;
      const groupKey = categoryRequiresSchool
        ? `${schoolKey}::${packKey}`
        : `${typeKey}::${packKey}`;

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });

    return Object.entries(groups).map(([groupKey, items]) => {
      const [schoolOrType, rawPackKey] = groupKey.split('::');
      const packNumber = rawPackKey ?? 'unknown';
      const usesSchool = categoryRequiresSchool;
      const label = usesSchool
        ? `${schoolOrType} - VP${packNumber} (VacPac ${packNumber})`
        : `${schoolOrType} - VP${packNumber} (VacPac ${packNumber})`;

      return {
        packNumber,
        label,
        items,
        totalUnits: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        location: items[0] ? getLocationName(items[0]) : 'N/A',
      };
    });
  }, [activeCategoryObj, vacpacInventory]);

  const renderInventoryCard = (item: any, index: number) => (
    <div key={item.id || `${item.type}-${index}`} className="rounded-2xl border border-teal-200 bg-teal-50/80 p-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showSchoolColumn && (
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-600 truncate">{getSchoolShortName(item)}</p>
          )}
          <h4 className="mt-1 text-sm font-black text-slate-900 truncate">{getTypeName(item)}</h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center justify-center min-w-[2.5rem] rounded-lg border border-teal-200 bg-white px-2 py-1 text-[11px] font-black text-slate-700">{item.quantity}</span>
          <button onClick={() => handleSecureDeleteItem(item.id, getTypeName(item))} className="p-1.5 rounded-lg bg-white text-teal-500 hover:text-rose-600 border border-teal-200"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-teal-200 bg-white p-2">
          <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Size</span>
          <span className="mt-1 block font-black text-slate-800">{getSizeLabel(item)}</span>
        </div>
        <div className="rounded-xl border border-teal-200 bg-white p-2">
          <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Colour</span>
          <span className="mt-1 block font-black text-slate-800 truncate">{getColourName(item)}</span>
        </div>
        <div className="rounded-xl border border-teal-200 bg-white p-2">
          <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">{item.type === 'single' ? 'Shelf No' : 'VP #'} </span>
          <span className="mt-1 block font-black text-slate-800">{item.type === 'single' ? (item.shelfCode || '—') : (item.packNumber ?? '—')}</span>
        </div>
        <div className="rounded-xl border border-teal-200 bg-white p-2">
          <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Location</span>
          <span className="mt-1 block font-black text-slate-800">{getLocationName(item)}</span>
        </div>
      </div>
    </div>
  );

  const handleSecureDeleteItem = async (itemId: string, itemSkuName: string) => {
    const key = prompt(`🔒 CRITICAL OVERRIDE: Delete "${itemSkuName}".\nEnter Master Password:`);
    if (key !== 'J4sp3r#M1sty') { alert("Access Denied."); return; }
    if (!window.confirm("FINAL RECONCILIATION: Are you certain?")) return;
    await deleteDoc(doc(db, 'inventory', itemId));
  };

  return (
    <div className="space-y-6 text-left select-none w-full max-w-5xl">
      
      {/* FILTER BAR */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-2 md:grid-cols-7 gap-3 items-center">
        <div className="col-span-2 md:col-span-2 relative">
           <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
           <input type="text" placeholder="Search item, shelf, VP..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs" />
        </div>
        
        {showSchoolColumn && (
          <select value={filters.schoolId} onChange={(e) => setFilters({...filters, schoolId: e.target.value})} className="p-2 border rounded-xl text-xs bg-slate-50 font-bold">
            <option value="ALL">All Schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <select value={filters.clothingType} onChange={(e) => setFilters({...filters, clothingType: e.target.value})} className="p-2 border rounded-xl text-xs">
          <option value="ALL">All Types</option>
          {clothingTypes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <select value={filters.size} onChange={(e) => setFilters({...filters, size: e.target.value})} className="p-2 border rounded-xl text-xs">
          <option value="ALL">All Sizes</option>
          {sizes.map(s => <option key={s.id} value={s.label || s.name}>{s.label || s.name}</option>)}
        </select>

        <input type="text" value={filters.shelfNo} onChange={(e) => setFilters({ ...filters, shelfNo: e.target.value.toUpperCase() })} placeholder="Shelf No" className="p-2 border rounded-xl text-xs" />
        <input type="text" value={filters.vacpacNumber} onChange={(e) => setFilters({ ...filters, vacpacNumber: e.target.value })} placeholder="VP #" className="p-2 border rounded-xl text-xs" />

        <button onClick={() => setIsModalOpen(true)} className="bg-[#00A896] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
          <PlusCircle className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* DATA TABLE / CARDS */}
      <div className="space-y-4">
        <div className="sticky top-[5.65rem] z-10 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'single', label: 'Single Items', badge: singleInventory.length, tone: 'emerald' },
              { key: 'vacpac', label: 'VacPac', badge: vacpacGroups.length, tone: 'violet' },
            ].map((tab) => {
              const isActive = activeInventoryTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveInventoryTab(tab.key as 'single' | 'vacpac')}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                    isActive
                      ? tab.tone === 'emerald'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-violet-500 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] ${isActive ? 'bg-white/15 text-white' : tab.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {activeInventoryTab === 'single' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Single Items</h3>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-[10px] font-black">{singleInventory.length} tracked</span>
            </div>

            <div className="hidden md:block">
              <div className={`grid gap-4 p-4 bg-slate-50 font-black text-slate-500 uppercase tracking-wider text-[10px] border-b ${showSchoolColumn ? 'grid-cols-8' : 'grid-cols-7'}`}>
                {showSchoolColumn && <div className="pl-1">School</div>}
                <div>Type</div>
                <div className="text-center">Size</div>
                <div>Colour</div>
                <div>Shelf No</div>
                <div>Location</div>
                <div className="text-right">Qty</div>
                <div className="text-right pr-2">Actions</div>
              </div>
              <div className="divide-y divide-slate-100">
                {singleInventory.length > 0 ? singleInventory.map((item: any, index: number) => (
                  <div key={item.id || `${item.type}-${index}`} className={`grid gap-4 p-4 items-center text-xs font-bold text-slate-700 ${showSchoolColumn ? 'grid-cols-8' : 'grid-cols-7'}`}>
                    {showSchoolColumn && <div className="truncate font-black">{getSchoolName(item)}</div>}
                    <div className="text-brand-primary uppercase tracking-wide truncate">{getTypeName(item)}</div>
                    <div className="text-center font-mono bg-slate-100 px-1.5 py-0.5 rounded-md border w-max mx-auto">{getSizeLabel(item)}</div>
                    <div className="text-slate-500 truncate">{getColourName(item)}</div>
                    <div className="font-extrabold text-slate-800">{item.shelfCode || '—'}</div>
                    <div className="font-extrabold">{getLocationName(item)}</div>
                    <div className="text-right"><span className="px-2 py-0.5 rounded-lg border bg-slate-50">{item.quantity}</span></div>
                    <div className="text-right pr-1"><button onClick={() => handleSecureDeleteItem(item.id, getTypeName(item))} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </div>
                )) : (
                  <div className="p-6 text-center text-sm text-slate-500">No single items match the current filters.</div>
                )}
              </div>
            </div>

            <div className="md:hidden p-3 space-y-3">
              {singleInventory.length > 0 ? singleInventory.map((item: any, index: number) => renderInventoryCard(item, index)) : (
                <div className="p-6 text-center text-sm text-slate-500">No single items match the current filters.</div>
              )}
            </div>
          </div>
        )}

        {activeInventoryTab === 'vacpac' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">VacPac Containers</h3>
              </div>
              <span className="rounded-full bg-violet-50 text-violet-700 px-2 py-1 text-[10px] font-black">{vacpacGroups.length} containers</span>
            </div>

            {vacpacGroups.length > 0 ? (
              <div className="space-y-4 p-4">
                {vacpacGroups.map((group) => (
                  <div key={group.label} className="rounded-2xl border border-orange-200 bg-orange-50/40 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-orange-200 bg-white/80 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">VP {group.packNumber}</p>
                        <h4 className="text-base font-black text-slate-900">{group.items[0] && (showSchoolColumn ? getSchoolName(group.items[0]) : getTypeName(group.items[0]))}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Location</p>
                          <span className="text-[11px] font-bold text-slate-700">{group.location}</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Items</p>
                          <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-700">{group.items.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-3">
                      {group.items.map((item, index) => (
                        <div key={item.id || `${group.packNumber}-${index}`} className="rounded-2xl border border-teal-200 bg-teal-50/80 p-3 shadow-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="mt-1 text-sm font-black text-slate-900 truncate">{getTypeName(item)}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="inline-flex items-center justify-center min-w-[2.5rem] rounded-lg border border-teal-200 bg-white px-2 py-1 text-[11px] font-black text-slate-700">{item.quantity}</span>
                              <button onClick={() => handleSecureDeleteItem(item.id, getTypeName(item))} className="p-1.5 rounded-lg bg-white text-teal-500 hover:text-rose-600 border border-teal-200"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-xl border border-teal-200 bg-white p-2">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Size</span>
                              <span className="mt-1 block font-black text-slate-800">{getSizeLabel(item)}</span>
                            </div>
                            <div className="rounded-xl border border-teal-200 bg-white p-2">
                              <span className="block text-[9px] font-black uppercase tracking-wider text-teal-600">Colour</span>
                              <span className="mt-1 block font-black text-slate-800 truncate">{getColourName(item)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">No vacpac containers match the current filters.</div>
            )}
          </div>
        )}
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