import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, deleteDoc, collection, query, where, getDocs, runTransaction, increment } from 'firebase/firestore';
import { Shirt, Trash2, AlertTriangle, Search, Filter, Loader2, Sparkles, ArrowRight, PackageCheck, History } from 'lucide-react';

// ==========================================
// SUB-COMPONENT: StockIntakeForm
// ==========================================
interface StockIntakeFormProps {
  schools: any[];
  clothingTypes: any[];
  sizes: any[];
  colours: any[];
  locations: any[];
  currentViewedCategory: string | null;
  categories: any[];
}

function StockIntakeForm({
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  currentViewedCategory,
  categories
}: StockIntakeFormProps) {
  const [formCategory, setFormCategory] = useState<'Plain' | 'Logo'>('Plain');
  const [formType, setFormType] = useState<'single' | 'vacpac'>('single');

  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedClothingTypeId, setSelectedClothingTypeId] = useState('');
  const [selectedColourId, setSelectedColourId] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [shelfCode, setShelfCode] = useState('');
  const [packNumber, setPackNumber] = useState<number>(1);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  
  const [loading, setLoading] = useState(false);
  const [recentIntakes, setRecentIntakes] = useState<Array<{sku: string, qty: number, loc: string}>>([]);

  useEffect(() => {
    const activeCat = categories.find(c => c.id === currentViewedCategory);
    if (activeCat) {
      setFormCategory(activeCat.hasSchools ? 'Logo' : 'Plain');
    }
  }, [currentViewedCategory, categories]);

  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) setSelectedSchoolId(schools[0].id);
    if (clothingTypes.length > 0 && !selectedClothingTypeId) setSelectedClothingTypeId(clothingTypes[0].id);
    if (colours.length > 0 && !selectedColourId) setSelectedColourId(colours[0].id);
    if (sizes.length > 0 && !selectedSizeId) setSelectedSizeId(sizes[0].id);
    if (locations.length > 0 && !selectedLocationId) setSelectedLocationId(locations[0].id);
  }, [schools, clothingTypes, colours, sizes, locations]);

  const handleFormSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentSchool = schools.find(s => s.id === selectedSchoolId);
    const currentType = clothingTypes.find(t => t.id === selectedClothingTypeId);
    const currentColour = colours.find(c => c.id === selectedColourId);
    const currentSize = sizes.find(s => s.id === selectedSizeId);
    const currentLocation = locations.find(l => l.id === selectedLocationId);

    if (!currentType || !currentColour || !currentSize || !currentLocation) {
      alert("Missing base configuration alignments.");
      return;
    }

    const targetCategory = categories.find(c => 
      formCategory === 'Logo' ? c.hasSchools === true : !c.hasSchools
    );
    const resolvedCategoryId = targetCategory ? targetCategory.id : currentViewedCategory;

    setLoading(true);

    try {
      const categoryPrefix = formCategory === 'Logo' ? 'L' : 'P';
      const segments = [
        categoryPrefix,
        formCategory === 'Logo' ? currentSchool?.skuCode : null,
        currentType.skuCode,
        currentColour.skuCode,
        currentSize.skuCode
      ].filter(Boolean);

      const synthesizedSkuid = segments.join('-').toUpperCase();

      await runTransaction(db, async (transaction) => {
        const inventoryCollectionRef = collection(db, 'inventory');
        const q = query(
          inventoryCollectionRef, 
          where('skuid', '==', synthesizedSkuid),
          where('locationId', '==', selectedLocationId)
        );
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const existingDocRef = querySnapshot.docs[0].ref;
          transaction.update(existingDocRef, {
            quantity: increment(Number(quantityToAdd))
          });
        } else {
          const newDocRef = doc(collection(db, 'inventory'));
          
          transaction.set(newDocRef, {
            id: newDocRef.id,
            skuid: synthesizedSkuid,
            categoryId: resolvedCategoryId || "", 
            type: formType, 
            locationId: selectedLocationId,
            locationSku: currentLocation.skuCode,
            location: currentLocation.name, 
            shelfCode: shelfCode.trim().toUpperCase() || "UNASSIGNED",
            packNumber: formType === 'vacpac' ? Number(packNumber) : 0,
            schoolId: formCategory === 'Logo' ? selectedSchoolId : "PLAIN_STOCK",
            schoolSku: formCategory === 'Logo' ? (currentSchool?.skuCode || "") : "PLAIN",
            schoolName: formCategory === 'Logo' ? (currentSchool?.name || "") : "Plain Stock", 
            colourId: selectedColourId,
            colourSku: currentColour.skuCode,
            colour: currentColour.name, 
            typeId: selectedClothingTypeId,
            typeSku: currentType.skuCode,
            garmentType: currentType.name, 
            sizeId: selectedSizeId,
            sizeSku: currentSize.skuCode,
            size: currentSize.label || currentSize.skuCode || currentSize.name, 
            quantity: Number(quantityToAdd)
          });
        }
      });

      setRecentIntakes(prev => [
        { sku: synthesizedSkuid, qty: Number(quantityToAdd), loc: currentLocation.name },
        ...prev.slice(0, 4)
      ]);

      setShelfCode('');
      setQuantityToAdd(1);
      setPackNumber(prev => prev + 1);

    } catch (err) {
      console.error("Ingestion faulted:", err);
      alert("Database rejection committing ledger row.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-5xl animate-fadeIn text-left">
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-blue-600" />
            Frontline Stock Intake Hub
          </h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Process and register donor garments into active cloud tracking ledgers instantly.</p>
        </div>

        <form onSubmit={handleFormSubmission} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Garment Category Alignment</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormCategory('Plain')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formCategory === 'Plain' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Plain Apparel
                </button>
                <button
                  type="button"
                  onClick={() => setFormCategory('Logo')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formCategory === 'Logo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  School Branded
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage & Handling Layout</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormType('single')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formType === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Loose Item
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('vacpac')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${formType === 'vacpac' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  VacPac Bundle
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">1. Select Garment Template Identity</h3>
            
            {formCategory === 'Logo' && (
              <div className="animate-slideDown">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Affiliated Educational Center</label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.skuCode})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Garment Profile</label>
                <select
                  value={selectedClothingTypeId}
                  onChange={(e) => setSelectedClothingTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  {clothingTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.skuCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Colour Palette</label>
                <select
                  value={selectedColourId}
                  onChange={(e) => setSelectedColourId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  {colours.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.skuCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Sizing Scale</label>
                <select
                  value={selectedSizeId}
                  onChange={(e) => setSelectedSizeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  {sizes.map(s => (
                    <option key={s.id} value={s.id}>{s.label || s.name} ({s.skuCode})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">2. Warehouse Storage Routings</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Destination Zone</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.skuCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Shelf / Bin Identifier</label>
                <input
                  type="text"
                  value={shelfCode}
                  onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
                  placeholder="e.g. B04"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Intake Item Count</label>
                <input
                  type="number"
                  min="1"
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            {formType === 'vacpac' && (
              <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Bulk sealed packaging mandates a unique physical tracking tag.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-amber-900 uppercase">Sealed Tag ID:</span>
                    <input
                      type="number"
                      min="1"
                      value={packNumber}
                      onChange={(e) => setPackNumber(Number(e.target.value))}
                      className="w-24 px-2.5 py-1 bg-white border border-amber-200 rounded-md text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs sm:text-sm tracking-wide shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? 'Committing Entries...' : 'Commit Intake Cargo Item'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-4 shadow-sm border border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-[10px] font-bold tracking-wide uppercase text-slate-300">Session Intake History</h3>
          </div>
          
          <div className="space-y-2.5">
            {recentIntakes.length === 0 ? (
              <p className="text-[11px] text-slate-500 font-mono py-4 text-center">No transactions run this session yet.</p>
            ) : (
              recentIntakes.map((log, index) => (
                <div key={index} className="p-3 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono animate-fadeIn">
                  <div className="space-y-0.5 truncate mr-2">
                    <span className="block text-[11px] font-bold text-blue-400 truncate">{log.sku}</span>
                    <span className="block text-[10px] text-slate-400 truncate">Zone: {log.loc}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-bold text-[10px] shrink-0">
                    +{log.qty}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Smart SKU Synthesizer Rules</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            This workspace translates selections on the fly into unique tracking keys mapping to standard system blueprints.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT: Inventory
// ==========================================
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
  const [activeLayoutMode, setActiveLayoutMode] = useState<'view' | 'intake'>('view');
  const activeCategoryObj = categories.find(c => c.id === currentViewedCategory);
  const currentBehavior = activeCategoryObj?.behaviorMode || (activeCategoryObj?.hasSchools ? 'LOGO_ONLY' : 'PLAIN_ONLY');
  const showSchoolColumn = currentBehavior === 'LOGO_ONLY' || currentBehavior === 'MIXED';

  const handleSecureDeleteItem = async (itemId: string, itemSkuName: string) => {
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

const filteredInventory = (inventory || []).filter(item => {
    // 1. Find the current category configuration object
    const currentCategory = categories.find(c => c.id === currentViewedCategory);

    // 2. Read the smart switches (with automatic safe fallbacks for old categories)
    const behaviorMode = currentCategory?.behaviorMode || (currentCategory?.hasSchools ? 'LOGO_ONLY' : 'PLAIN_ONLY');
    const allowPlain = behaviorMode === 'PLAIN_ONLY' || behaviorMode === 'MIXED';
    const allowLogo = behaviorMode === 'LOGO_ONLY' || behaviorMode === 'MIXED';

    // 3. SECURE BLOCKING: Filter out items that don't belong in this behavior profile
    const isItemPlain = item.schoolId === 'PLAIN_STOCK' || (item.skuid && item.skuid.startsWith('P-'));
    
    if (isItemPlain && !allowPlain) return false; // If category blocks plain stock, hide it
    if (!isItemPlain && !allowLogo) return false;   // If category blocks logo stock, hide it

    // 4. Strict category ID sync (Make sure it belongs to this open category tab)
    if (item.categoryId && currentViewedCategory && item.categoryId !== currentViewedCategory) return false;
    
    // 5. Smart School Dropdown filter (Bypasses and shows universal plain stock if mixed)
    if (selectedSchoolFilter !== 'ALL') {
      if (item.schoolId !== 'PLAIN_STOCK' && item.schoolId !== selectedSchoolFilter) return false;
    }

    // 6. Text Search Bar Matching Logic
    const term = searchQuery.toLowerCase();
    const displaySchool = item.schoolName || item.schoolSku || '';
    const displayType = item.garmentType || item.typeSku || '';
    const displayColour = item.colour || item.colourSku || '';
    const displaySize = item.size || item.sizeSku || '';
    const displayLoc = item.location || item.locationSku || '';

    return (
      (item.name || '').toLowerCase().includes(term) ||
      (item.skuid || '').toLowerCase().includes(term) ||
      displaySchool.toLowerCase().includes(term) ||
      displayType.toLowerCase().includes(term) ||
      displayColour.toLowerCase().includes(term) ||
      displaySize.toLowerCase().includes(term) ||
      displayLoc.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 text-left select-none animate-fadeIn w-full max-w-5xl">
      
      {/* 🧭 NAVIGATION TABS HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            {activeCategoryObj?.name || 'Garment Master Roster'}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {activeLayoutMode === 'view' ? 'Browse active quantities across bins' : 'Register donor items to active ledgers'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveLayoutMode('view')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeLayoutMode === 'view' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
          >
            📋 View Active Stock
          </button>
          <button
            type="button"
            onClick={() => setActiveLayoutMode('intake')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeLayoutMode === 'intake' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
          >
            📥 Process New Intake
          </button>
        </div>
      </div>

      {/* DYNAMIC LAYOUT CONTAINER COUPLING CHECK */}
      {activeLayoutMode === 'intake' ? (
        <StockIntakeForm
          schools={schools}
          clothingTypes={clothingTypes}
          sizes={sizes}
          colours={colours}
          locations={locations}
          currentViewedCategory={currentViewedCategory}
          categories={categories} 
        />
      ) : (
        <>
          {/* 🔍 COMPACT SEARCH ENGINE AND FILTER DROPDOWNS TOOLBAR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search this category by garments, sizes, colors, or locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs focus:outline-none focus:border-brand-primary font-medium" />
            </div>
            {showSchoolColumn && (
              <select value={selectedSchoolFilter} onChange={(e) => setSelectedSchoolFilter(e.target.value)} className="p-2 border rounded-xl text-xs bg-slate-50 font-bold text-slate-600 focus:outline-none cursor-pointer w-full sm:w-auto">
                <option value="ALL">🏛️ All School Rosters</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          {/* 📊 DYNAMIC VIEW: TABLE FOR PC, CARDS FOR MOBILE */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden w-full">
            
            {/* --- TABLE VIEW (Only shows on MD screens and up) --- */}
            <div className={`hidden md:grid gap-4 p-4 bg-slate-50 font-black text-slate-500 uppercase tracking-wider text-[10px] border-b text-left
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

            <div className="divide-y divide-slate-100">
              {filteredInventory.map((item: any) => {
                // Keep your existing variable definitions
                const matchingSchoolObj = schools.find(s => s.id === item.schoolId);
                const displaySchoolName = !showSchoolColumn 
                  ? 'Plain Apparel' 
                  : (matchingSchoolObj ? matchingSchoolObj.name : (item.schoolName && item.schoolName !== 'PLAIN' ? item.schoolName : 'Generic Plain Item'));
                const rowType = item.garmentType || clothingTypes.find(t => t.skuCode === item.typeSku || t.id === item.typeId)?.name || item.typeSku || 'Garment';
                const rowSize = item.size || sizes.find(s => s.skuCode === item.sizeSku || s.id === item.sizeId)?.label || item.sizeSku || 'OS';
                const rowColour = item.colour || colours.find(c => c.skuCode === item.colourSku || c.id === item.colourId)?.name || item.colourSku || 'Standard';
                const rowLoc = item.location || locations.find(l => l.skuCode === item.locationSku || l.id === item.locationId)?.name || item.locationSku || 'Warehouse Hub';
                const shelfVal = item.shelfCode && item.shelfCode !== 'UNASSIGNED' ? item.shelfCode : 'FRONT';

                return (
                  <div key={item.id}>
                    {/* PC TABLE ROW */}
                    <div className={`hidden md:grid gap-4 p-4 hover:bg-slate-50/50 transition items-center text-xs font-bold text-slate-700 font-sans text-left
                      ${showSchoolColumn ? 'grid-cols-7' : 'grid-cols-6'}`}
                    >
                      {showSchoolColumn && <div className="truncate text-slate-900 font-black">{displaySchoolName}</div>}
                      <div className="text-brand-primary">{rowType}</div>
                      <div className="text-center bg-slate-100 px-1.5 py-0.5 rounded-md">{rowSize}</div>
                      <div>{rowColour}</div>
                      <div>
                        <span className="block font-extrabold">{rowLoc}</span>
                        <span className="text-[10px] text-teal-600">Shelf: {shelfVal}</span>
                      </div>
                      <div className="text-right">{item.quantity} units</div>
                      <div className="text-right pr-2">
                        <button onClick={() => handleSecureDeleteItem(item.id, item.name || item.skuid)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  {/* MOBILE CARD VIEW */}
                  <div className="md:hidden p-4 border-b border-slate-100 bg-white">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-slate-900">{rowType}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold text-[10px]">{item.quantity} units</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{displaySchoolName} | {rowColour} | {rowSize}</p>
                    <p className="text-[10px] font-mono text-teal-600 mt-2">📍 {rowLoc} (Shelf: {shelfVal})</p>
                  </div>
                </div>
              );
            })}
            
            {/* Empty state message */}
            {filteredInventory.length === 0 && (
              <div className="p-12 text-center text-slate-400 font-sans uppercase tracking-wider text-xs">
                No active inventory records logged matching this criteria.
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </div>
);
}