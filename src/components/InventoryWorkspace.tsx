import React, { useState, useEffect, useMemo } from 'react';
import { School, ClothingType, Size, Colour, Location, InventoryItem, Category, ItemType } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, deleteDoc, serverTimestamp, runTransaction, updateDoc } from 'firebase/firestore';
import { validateShelfCode, generateSkuid } from '../skuUtils';
import { Package, Sparkles, Search } from 'lucide-react';

interface InventoryWorkspaceProps {
  schools: School[];
  clothingTypes: ClothingType[];
  sizes: Size[];
  colours: Colour[];
  locations: Location[];
  categories: Category[];
  itemTypes: ItemType[];
  inventory: InventoryItem[];
}

export default function InventoryWorkspace({
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  categories,
  itemTypes,
  inventory,
}: InventoryWorkspaceProps) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>('');
  const [logoSearchQuery, setLogoSearchQuery] = useState('');
  const [plainSearchQuery, setPlainSearchQuery] = useState('');

  // Automatically select the first admin category when data finishes loading
  useEffect(() => {
    if (categories && categories.length > 0 && !activeWorkspaceTab) {
      setActiveWorkspaceTab(categories[0].name || categories[0].id);
    }
  }, [categories, activeWorkspaceTab]);

  // 🏷️ LOGO BADGED CONFIGURATION CALCULATION HOOK
  const logoConsolidatedItems = useMemo(() => {
    const groups: { [key: string]: any } = {};
    inventory.forEach((item) => {
      if ((item.category || 'Plain').trim().toLowerCase() !== 'logo') return;
      const key = `${item.schoolSku}_${item.typeSku}_${item.colourSku}_${item.sizeSku}`;
      
      if (!groups[key]) {
        const sch = schools.find(s => s.skuCode === item.schoolSku)?.name || item.schoolSku;
        const col = colours.find(c => c.skuCode === item.colourSku)?.name || item.colourSku;
        const typ = clothingTypes.find(t => t.skuCode === item.typeSku)?.name || item.typeSku;
        const siz = sizes.find(s => s.skuCode === item.sizeSku)?.label || item.sizeSku;
        groups[key] = { key, schoolName: sch, colourName: col, typeName: typ, sizeLabel: siz, totalSinglesQty: 0, totalVacpacsQty: 0, grandTotal: 0 };
      }
      if (item.type === 'single') groups[key].totalSinglesQty += item.quantity;
      else groups[key].totalVacpacsQty += item.quantity;
    });
    Object.values(groups).forEach(g => g.grandTotal = g.totalSinglesQty + g.totalVacpacsQty);
    return Object.values(groups);
  }, [inventory, schools, clothingTypes, colours, sizes]);

  // 🏷️ PLAIN CORE BASE CONFIGURATION CALCULATION HOOK
  const plainConsolidatedItems = useMemo(() => {
    const groups: { [key: string]: any } = {};
    inventory.forEach((item) => {
      if ((item.category || 'Plain').trim().toLowerCase() === 'logo') return;
      const key = `${item.typeSku}_${item.colourSku}_${item.sizeSku}`;
      
      if (!groups[key]) {
        const col = colours.find(c => c.skuCode === item.colourSku)?.name || item.colourSku;
        const typ = clothingTypes.find(t => t.skuCode === item.typeSku)?.name || item.typeSku;
        const siz = sizes.find(s => s.skuCode === item.sizeSku)?.label || item.sizeSku;
        groups[key] = { key, typeName: typ, colourName: col, sizeLabel: siz, totalCount: 0, vacpacs: [] };
      }
      if (item.type === 'vacpac') {
        groups[key].totalCount += 1;
        groups[key].vacpacs.push(item);
      }
    });
    return Object.values(groups);
  }, [inventory, clothingTypes, colours, sizes]);
  return (
    <div className="space-y-6 text-left">
      {/* Dynamic Navigation Tabs built from Admin Categories */}
      <div className="flex flex-wrap gap-2 border border-slate-200 bg-white p-1.5 rounded-2xl shadow-sm relative z-10">
        {categories.map((cat) => {
          const categoryName = cat.name || 'Unnamed Category';
          const isActive = activeWorkspaceTab.toLowerCase() === categoryName.toLowerCase();
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveWorkspaceTab(categoryName)}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider cursor-pointer ${
                isActive 
                  ? 'bg-amber-400 text-slate-900 border-amber-400 shadow-sm' 
                  : 'text-slate-600 border-transparent hover:bg-slate-50'
              }`}
            >
              <span>{categoryName}</span>
            </button>
          );
        })}
      </div>

      {/* 🔮 RENDER PANEL TEMPLATE FOR BADGED LOGO ITEMS */}
      {activeWorkspaceTab.toLowerCase().includes('logo') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-serif font-black text-slate-900 tracking-tight">{activeWorkspaceTab} Collection</h3>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              value={logoSearchQuery} 
              onChange={(e) => setLogoSearchQuery(e.target.value)} 
              placeholder="Filter by school name, garment, or color code..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-amber-400 transition-all" 
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Uniform Identification</th>
                  <th className="p-3 text-center">Shelved (Singles)</th>
                  <th className="p-3 text-center">Bulk Volumes</th>
                  <th className="p-3 text-center">Total Quantities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logoConsolidatedItems
                  .filter(g => g.schoolName.toLowerCase().includes(logoSearchQuery.toLowerCase()) || g.typeName.toLowerCase().includes(logoSearchQuery.toLowerCase()))
                  .map((group: any) => (
                    <tr key={group.key} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3">
                        <span className="font-extrabold text-slate-900 block text-sm">{group.schoolName}</span>
                        <span className="text-[11px] text-slate-500 font-medium">{group.typeName} &bull; {group.colourName} &bull; Size {group.sizeLabel}</span>
                      </td>
                      <td className="p-3 text-center"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-black text-[11px]">{group.totalSinglesQty} units</span></td>
                      <td className="p-3 text-center"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black text-[11px]">{group.totalVacpacsQty} units</span></td>
                      <td className="p-3 text-center font-black text-orange-600 text-sm">{group.grandTotal} units</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📦 RENDER PANEL TEMPLATE FOR PLAIN UNBADGED CORE ITEMS */}
      {!activeWorkspaceTab.toLowerCase().includes('logo') && activeWorkspaceTab !== '' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Package className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-serif font-black text-slate-900 tracking-tight">{activeWorkspaceTab} Storage Lanes</h3>
          </div>

          <div className="relative">
            <input 
              type="text" 
              value={plainSearchQuery} 
              onChange={(e) => setPlainSearchQuery(e.target.value)} 
              placeholder="Search plain variants list..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-amber-400 transition-all" 
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Core Base Template</th>
                  <th className="p-3">Fabric Colourway</th>
                  <th className="p-3">Sizing Scales</th>
                  <th className="p-3 text-center">Active Containers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {plainConsolidatedItems
                  .filter(g => g.typeName.toLowerCase().includes(plainSearchQuery.toLowerCase()) || g.colourName.toLowerCase().includes(plainSearchQuery.toLowerCase()))
                  .map((group: any) => (
                    <tr key={group.key} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3 font-extrabold text-slate-900 text-sm">{group.typeName}</td>
                      <td className="p-3 font-medium text-slate-600">{group.colourName}</td>
                      <td className="p-3 font-black text-orange-500">Size {group.sizeLabel}</td>
                      <td className="p-3 text-center font-black text-slate-800 text-sm">{group.totalCount} containers</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
