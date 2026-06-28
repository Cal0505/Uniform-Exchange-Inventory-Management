import React, { useState, useEffect } from 'react';
import { Search, MapPin, AlertTriangle, Plus, Check, Loader2, X, Filter } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface AdvancedSchool {
  id: string; name: string; schoolType: string; schoolIdCode: string; skuCode: string;
}

interface AdvancedAttribute {
  id: string; name?: string; label?: string; skuCode: string; ruleProfile?: string; sizeGroupTag?: string;
}

interface InventoryProps {
  currentViewedCategory: string | null;
  categories: any[];
  schools: AdvancedSchool[];
  clothingTypes: AdvancedAttribute[];
  sizes: AdvancedAttribute[];
  colours: AdvancedAttribute[];
  locations: AdvancedAttribute[];
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
  // Navigation panel drawer and multi-filter criteria layout states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('ALL');
  const [selectedGarmentFilter, setSelectedGarmentFilter] = useState('ALL');
  const [selectedColourFilter, setSelectedColourFilter] = useState('ALL');

  // CLEANED FORMS ENTRY TRACKING STATES (Plain English Fields)
  const [formLocation, setFormLocation] = useState(''); // e.g. Pickers Shelf, Under Office
  const [formShelfRow, setFormShelfRow] = useState('');
  const [formBoxNumber, setFormBoxNumber] = useState('');
  const [formSchool, setFormSchool] = useState('');
  const [formType, setFormType] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formColour, setFormColour] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync Master Category details directly from your sidebar folder choice
  const activeCategory = categories.find(c => c.id === currentViewedCategory);
  const categoryTitle = activeCategory ? activeCategory.name : 'Ledger';
  const categorySkuCode = activeCategory ? activeCategory.skuCode || '' : '';
  
  // Enforce school rules strictly on Logo-bound category tabs
  const isLogoCategory = categoryTitle.trim().toLowerCase() === 'logo';
  const requiresSchoolSelection = isLogoCategory || (activeCategory ? activeCategory.requiresSchool === true : false);

  // Form conditional state calculations: Adapts inputs directly to the Location name string chosen
  const matchedLocationObj = locations.find(l => l.skuCode === formLocation);
  const activeLocationName = matchedLocationObj ? (matchedLocationObj.name || '').trim().toLowerCase() : '';
  
  const isUnderOfficeLocation = activeLocationName.includes('office') || activeLocationName.includes('vac');
  const isPickerShelfLocation = activeLocationName.includes('shelf') || activeLocationName.includes('pick');
  // 📡 INDEPENDENT PROFILES ATTRIBUTE SCANNER: Narrows size choices to match the clothing type rules
  const chosenGarmentProfile = clothingTypes.find(t => t.skuCode === formType);
  const activeSizeGroupTag = chosenGarmentProfile ? chosenGarmentProfile.sizeGroupTag || 'YOUTH_AGE' : 'YOUTH_AGE';

  const dynamicallyFilteredSizes = sizes.filter(s => {
    if (!formType) return true; 
    return s.sizeGroupTag === activeSizeGroupTag;
  });

  // Flush form inputs clear when changing sidebar folder categories
  useEffect(() => {
    setFormLocation(''); setFormShelfRow(''); setFormBoxNumber(''); setFormSchool('');
    setFormType(''); setFormSize(''); setFormColour(''); setFormQty(1);
  }, [currentViewedCategory, drawerOpen]);

  // 📡 MULTI-SELECTABLE FILTERS MOTOR ENGINE BLOCK
  const filteredStockRows = inventory.filter((item: any) => {
    // 1. Core Category Filter
    const matchesCategory = (item.category || '').trim().toLowerCase() === categoryTitle.trim().toLowerCase();
    
    // 2. School Multi-Filter Selector Match
    const matchesSchool = selectedSchoolFilter === 'ALL' || item.schoolSku === selectedSchoolFilter;
    
    // 3. Garment Type Multi-Filter Selector Match
    const matchesGarment = selectedGarmentFilter === 'ALL' || item.typeSku === selectedGarmentFilter;
    
    // 4. Fabric Colour Multi-Filter Selector Match
    const matchesColour = selectedColourFilter === 'ALL' || item.colourSku === selectedColourFilter;
    
    // 5. Keyword Text Input Search Box Match
    const itemSchoolName = schools.find(s => s.skuCode === item.schoolSku)?.name || '';
    const itemGarmentName = clothingTypes.find(t => t.skuCode === item.typeSku)?.name || '';
    const itemLocationName = locations.find(l => l.skuCode === item.locationCode)?.name || '';
    const matchesSearch = 
      itemSchoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemGarmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemLocationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.skuCode || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSchool && matchesGarment && matchesColour && matchesSearch;
  });

  // Calculate global category sums for your metrics header panels
  const totalCategoryStockSum = filteredStockRows.reduce((acc, row) => acc + (Number(row.quantity) || 0), 0);
  const handleRecordStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLocation || !formType || !formSize || !formColour || formQty < 1) {
      alert("Validation Error: Please select all baseline uniform property fields.");
      return;
    }
    if (isPickerShelfLocation && !formShelfRow.trim()) {
      alert("Validation Error: Shelf Row field cannot be left blank.");
      return;
    }
    if (isUnderOfficeLocation && !formBoxNumber.trim()) {
      alert("Validation Error: Box Number field cannot be left blank.");
      return;
    }
    if (requiresSchoolSelection && !formSchool) {
      alert("Validation Error: Logo entries require selecting a School Name.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Determine your clean storage area prefixes based on locations properties
      const storageZoneLetter = isUnderOfficeLocation ? 'U' : 'P';
      const coordinateAddressBlock = isUnderOfficeLocation 
        ? `VP${formBoxNumber.trim().padStart(2, '0')}`
        : formShelfRow.trim().toUpperCase();

      // Compile uniform blueprint tags
      const matchedSchoolObj = schools.find(s => s.skuCode === formSchool);
      const schoolTypePart = requiresSchoolSelection && matchedSchoolObj ? matchedSchoolObj.schoolType || 'JIN' : '';
      const schoolNamePart = requiresSchoolSelection && matchedSchoolObj ? matchedSchoolObj.schoolIdCode || '' : '';
      const targetSchoolSku = requiresSchoolSelection ? formSchool : 'GENERIC';
      const safeSizeString = formSize.startsWith('s') ? formSize : `s${formSize}`;

      const itemBlueprintPart = [schoolTypePart, schoolNamePart, formColour, formType, safeSizeString].filter(Boolean).join('').toUpperCase();

      // 🛠️ AUTOMATED 3-PART CONTEXT SKU BUILDER
      const compiledSkuString = `${storageZoneLetter}-${coordinateAddressBlock}-${itemBlueprintPart}`.toUpperCase();

      const q = query(collection(db, 'inventory'), where('skuCode', '==', compiledSkuString));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const record = snapshot.docs[0];
        const updatedQty = (Number(record.data().quantity) || 0) + Number(formQty);
        await updateDoc(doc(db, 'inventory', record.id), { quantity: updatedQty });
      } else {
        await addDoc(collection(db, 'inventory'), {
          skuCode: compiledSkuString, category: categoryTitle,
          typeSku: formType, sizeSku: formSize, colourSku: formColour,
          locationCode: formLocation.toUpperCase(),
          shelfRow: isPickerShelfLocation ? formShelfRow.trim().toUpperCase() : '',
          vacPacNumber: isUnderOfficeLocation ? formBoxNumber.trim().toUpperCase() : '',
          schoolSku: targetSchoolSku, quantity: Number(formQty)
        });
      }

      setFormType(''); setFormSize(''); setFormColour(''); setFormShelfRow(''); setFormBoxNumber(''); setFormSchool(''); setFormQty(1);
      setDrawerOpen(false);
    } catch (err) { console.error("Database transaction update failed:", err); } 
    finally { setIsSubmitting(false); }
  };
  return (
    <div className="space-y-6 text-left animate-fadeIn font-sans w-full max-w-5xl relative">
      
      {/* 📊 WAREHOUSE TOTAL SUMMARY METRICS CARD HEADER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-4 border-brand-teal">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-primary">{categoryTitle} Workstation Overview</span>
          <h2 className="text-xl font-serif font-black tracking-tight text-slate-900 uppercase">📂 {categoryTitle} Sheets</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xl">Scan real-time room locations and filter down clothing balances instantly.</p>
        </div>
        <div className="bg-slate-50 border px-5 py-3 rounded-2xl text-center shrink-0 h-fit">
          <span className="block text-[10px] font-mono uppercase tracking-wider font-black text-slate-400">Total Quantity</span>
          <span className="block text-xl font-black text-brand-primary mt-0.5">{totalCategoryStockSum} items</span>
        </div>
      </div>

      {/* 🔍 MULTI-SELECTABLE FILTER CONTROL DECK BAR TRACK (Placed exactly inside right anchor purple lines target) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 w-full select-none">
        
        {/* Row 1: Keyword Text Input Search box */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search rows, categories, shelf box tags, or attributes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs focus:outline-none focus:border-brand-primary font-medium" />
        </div>

        {/* Row 2: Sequential Multi-Select dropdown options track */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider pr-1"><Filter className="w-3 h-3" /><span>Multi-Filters:</span></div>
          
          <select value={selectedSchoolFilter} onChange={(e) => setSelectedSchoolFilter(e.target.value)} className="p-2 border rounded-xl text-xs bg-slate-50 text-slate-700 font-bold max-w-[180px] focus:outline-none focus:bg-white">
            <option value="ALL">🏫 All School Names</option>
            {schools.map(s => <option key={s.id} value={s.skuCode}>{s.name}</option>)}
          </select>

          <select value={selectedGarmentFilter} onChange={(e) => setSelectedGarmentFilter(e.target.value)} className="p-2 border rounded-xl text-xs bg-slate-50 text-slate-700 font-bold max-w-[160px] focus:outline-none focus:bg-white">
            <option value="ALL">👕 All Garment Types</option>
            {clothingTypes.map(t => <option key={t.id} value={t.skuCode}>{t.name}</option>)}
          </select>

          <select value={selectedColourFilter} onChange={(e) => setSelectedColourFilter(e.target.value)} className="p-2 border rounded-xl text-xs bg-slate-50 text-slate-700 font-bold max-w-[140px] focus:outline-none focus:bg-white">
            <option value="ALL">🎨 All Colours</option>
            {colours.map(c => <option key={c.id} value={c.skuCode}>{c.name}</option>)}
          </select>

          {/* Teal Add entries triggers pill bar */}
          <button type="button" onClick={() => setDrawerOpen(true)} className="ml-auto bg-brand-teal text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-[0.99] transition cursor-pointer shrink-0">
            <Plus className="w-3.5 h-3.5" /><span>Add Items</span>
          </button>
        </div>
      </div>
      {/* 📊 CORE FLAT DATA INVENTORY SPREADSHEET LEDGER VIEW */}
      <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="px-4 py-3.5">School Name</th>
                <th className="px-4 py-3.5">Garment</th>
                <th className="px-4 py-3.5">Size</th>
                <th className="px-4 py-3.5">Colour</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStockRows.map((row: any) => {
                const schoolName = schools.find(s => s.skuCode === row.schoolSku)?.name || 'Generic Plain Item';
                const garmentType = clothingTypes.find(t => t.skuCode === row.typeSku)?.name || 'Garment';
                const sizeLabel = sizes.find(s => s.skuCode === row.sizeSku)?.label || 'OS';
                const colourLabel = colours.find(c => c.skuCode === row.colourSku)?.name || 'Standard';
                const locationLabel = locations.find(l => l.skuCode === row.locationCode)?.name || 'Warehouse';
                
                return (
                  <tr key={row.id} className="hover:bg-slate-50/40 transition duration-150">
                    <td className="px-4 py-3.5 align-middle font-black text-slate-900 text-xs text-left truncate max-w-[200px]">{schoolName}</td>
                    <td className="px-4 py-3.5 align-middle text-left font-bold text-brand-primary uppercase">{garmentType}</td>
                    <td className="px-4 py-3.5 align-middle text-left font-mono font-bold text-slate-700">{sizeLabel}</td>
                    <td className="px-4 py-3.5 align-middle text-left font-bold text-slate-500">{colourLabel}</td>
                    <td className="px-4 py-3.5 align-middle text-left flex flex-col space-y-0.5">
                      <span className="font-extrabold text-slate-800">{locationLabel}</span>
                      <span className="text-[9px] text-brand-teal font-mono uppercase font-black tracking-wide">
                        {row.vacPacNumber ? `📦 Box #: ${row.vacPacNumber}` : `📐 Row/Shelf: ${row.shelfRow || 'N/A'}`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle font-mono font-black text-sm text-slate-900"><span className={`px-2 py-0.5 rounded-md ${row.quantity > 5 ? 'text-slate-900' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{row.quantity || 0} units</span></td>
                  </tr>
                );
              })}
              {filteredStockRows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 select-none"><AlertTriangle className="w-6 h-6 mx-auto text-slate-300 mb-2" /><span className="block text-xs font-bold font-mono uppercase tracking-wider">No matching stock rows found inside this query view.</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 THE ADAPTIVE SLIDE-OUT DRAWER PANEL FORM OVERLAY */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn select-none">
          <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-screen shadow-2xl p-6 overflow-y-auto flex flex-col justify-between z-10 animate-slideInRight text-left border-l">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-black text-brand-teal uppercase tracking-widest">Inbound Registry Terminal</span>
                  <h3 className="font-serif font-black text-base text-slate-900 uppercase">📥 Add {categoryTitle} Entry</h3>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleRecordStockEntry} className="space-y-4 text-xs font-bold">
                <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Location</label><select value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-slate-700 font-bold"><option value="">-- Choose Location Area --</option>{locations.map(l => <option key={l.id} value={l.skuCode}>{l.name}</option>)}</select></div>
                
                {/* 📍 SMART FORM FIELDS AUTO-ADAPTER: Renders fields dynamically based on Location text matching rules */}
                {isPickerShelfLocation && (
                  <div className="animate-fadeIn"><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Row/Shelf Reference</label><input type="text" placeholder="e.g. 1B, 4A, TOP" value={formShelfRow} onChange={(e) => setFormShelfRow(e.target.value)} className="w-full p-2.5 border rounded-xl font-bold text-slate-800 uppercase" /></div>
                )}
                {isUnderOfficeLocation && (
                  <div className="animate-fadeIn"><label className="block mb-1 text-[10px] font-black text-brand-teal uppercase tracking-wider">📦 Box # Number</label><input type="text" placeholder="e.g. 1, 12, 24" value={formBoxNumber} onChange={(e) => setFormBoxNumber(e.target.value)} className="w-full p-2.5 border border-brand-teal/30 bg-brand-teal/5 rounded-xl font-bold text-slate-800" /></div>
                )}

                {/* 🏫 SMART CAMPUS FIELD ADAPTER: Completely disappears on Plain/Pre-Loved lists */}
                {requiresSchoolSelection ? (
                  <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-black text-amber-700 uppercase tracking-wider">School Name</label>
                    <select value={formSchool} onChange={(e) => setFormSchool(e.target.value)} className="w-full p-2 border border-amber-200 bg-white text-slate-800 rounded-lg font-bold"><option value="">-- Select School Profile --</option>{schools.map(sch => <option key={sch.id} value={sch.skuCode}>{sch.name}</option>)}</select>
                  </div>
                ) : null}

                <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Garment Type</label><select value={formType} onChange={(e) => { setFormType(e.target.value); setFormSize(''); }} className="w-full p-2.5 border rounded-xl bg-white text-slate-700 font-bold"><option value="">-- Choose Model --</option>{clothingTypes.map(t => <option key={t.id} value={t.skuCode}>{t.name}</option>)}</select></div>
                <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Size</label><select value={formSize} onChange={(e) => setFormSize(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-slate-700 font-bold" disabled={!formType}><option value="">{formType ? '-- Choose Filtered Size --' : 'Select garment type first...'}</option>{dynamicallyFilteredSizes.map(s => <option key={s.id} value={s.skuCode}>{s.label || s.name}</option>)}</select></div>
                <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Colour</label><select value={formColour} onChange={(e) => setFormColour(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-slate-700 font-bold"><option value="">-- Choose Fabric Color --</option>{colours.map(c => <option key={c.id} value={c.skuCode}>{c.name}</option>)}</select></div>
                <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Quantity</label><input type="number" min={1} value={formQty} onChange={(e) => setFormQty(Number(e.target.value))} className="w-full p-2.5 border rounded-xl font-bold text-slate-800" /></div>
                
                <button type="submit" disabled={isSubmitting} className="w-full py-3 px-4 bg-brand-primary text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition hover:brightness-105 flex items-center justify-center gap-1.5 cursor-pointer mt-2">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}<span>Commit Inbound Stock</span></button>
              </form>
            </div>
            <p className="text-[10px] text-slate-400 text-center select-none font-medium mt-6">Uniform Exchange Realtime Ledger Core Engine v3.0</p>
          </div>
        </div>
      )}

    </div>
  );
}
