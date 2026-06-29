import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, writeBatch, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { Layers, Check, Loader2, Edit2, ShieldAlert, School, Shirt, Maximize2, Palette, MapPin, Clock, PlusCircle, Trash2 } from 'lucide-react';

interface ManagementProps {
  schools: any[]; clothingTypes: any[]; sizes: any[]; colours: any[]; locations: any[]; categories: any[]; schoolTypes: any[]; userRole: string; forcedSubTabOverride?: 'categories' | 'schoolTypes' | 'schools' | 'types' | 'sizes' | 'colours' | 'locations';
}

export default function Management({ schools, clothingTypes, sizes, colours, locations, categories, schoolTypes, userRole, forcedSubTabOverride }: ManagementProps) {
  const activeSubTab = forcedSubTabOverride || 'categories';
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📂 GLOBAL EDIT AND ACTIVATION SYSTEM HOOKS
  const [editingId, setEditingId] = useState<string | null>(null);

  // 📂 FORMS INSERTION STATES
  const [newCatName, setNewCatName] = useState('');
  const [catHasSchools, setCatHasSchools] = useState(false);
  const [skuPrefix, setSkuPrefix] = useState('');
  const [packagingType, setPackagingType] = useState<'Single' | 'VacPac' | 'Both'>('Single');

  const [editCatName, setEditCatName] = useState('');
  const [editCatHasSchools, setEditCatHasSchools] = useState(false);
  const [editSkuPrefix, setEditSkuPrefix] = useState('');
  const [editPackagingType, setEditPackagingType] = useState<'Single' | 'VacPac' | 'Both'>('Single');

  const handlePrefixTextNormalization = (textInput: string, targetSetter: (v: string) => void) => {
    const uppercaseSingleLetter = textInput.trim().toUpperCase().replace(/[^A-Z]/g, '');
    targetSetter(uppercaseSingleLetter.substring(0, 1));
  };

  const handleUpdateMasterCategory = async (catDocId: string, oldCatId: string, oldCatName: string) => {
    if (!editCatName.trim() || !editSkuPrefix) { alert("Missing parameters."); return; }
    try {
      setIsSubmitting(true);
      const inventoryQuery = query(collection(db, 'inventory'), where('categoryId', '==', oldCatId));
      const inventorySnapshot = await getDocs(inventoryQuery);
      const linkedItemsCount = inventorySnapshot.docs.length;

      if (linkedItemsCount > 0) {
        const passkey = prompt(`🔒 CASCADE UPDATE WARNING:\nThere are ${linkedItemsCount} items using "${oldCatName}". Enter Passkey to confirm sync:`);
        if (passkey !== 'J4sp3r#M1sty') { alert("Aborted."); setIsSubmitting(false); return; }
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'categories', catDocId), {
        name: editCatName.trim(), hasSchools: editCatHasSchools, skuPrefix: editSkuPrefix, packagingType: editPackagingType
      });

      if (linkedItemsCount > 0) {
        inventorySnapshot.docs.forEach((d) => { batch.update(doc(db, 'inventory', d.id), { category: editCatName.trim() }); });
      }
      await batch.commit(); setEditingId(null);
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };
  // 📂 SUBTAB 2 TO 7 CREATION AND MODIFICATION LAYER CONTROLS
  const [typeName, setTypeName] = useState('');
  const [typeSku, setTypeSku] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Jumpers');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);

  const handleSecureDeleteRecord = async (collectionName: string, docId: string, label: string) => {
    const key = prompt(`🔒 DELETION SECURITY hurdle:\nEnter passkey to erase "${label}":`);
    if (key !== 'J4sp3r#M1sty') { alert("Access Denied."); return; }
    try { await deleteDoc(doc(db, collectionName, docId)); } catch (e) { console.error(e); }
  };

  const handleCreateDocumentPayload = async (e: React.FormEvent, col: string) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const ref = collection(db, col);

      if (col === 'categories') {
        const cleanId = newCatName.trim().toUpperCase().replace(/\s+/g, '_');
        await addDoc(ref, { name: newCatName.trim(), id: cleanId, hasSchools: catHasSchools, skuPrefix: skuPrefix, packagingType, timestamp: new Date() });
        setNewCatName(''); setCatHasSchools(false); setSkuPrefix(''); setPackagingType('Single');
      } 
      else if (col === 'schoolTypes') {
        if (!typeName.trim() || !typeSku.trim()) return;
        await addDoc(ref, { name: typeName.trim(), skuCode: typeSku.trim().toUpperCase() });
        setTypeName(''); setTypeSku('');
      } 
      else if (col === 'schools') {
        if (!typeName.trim() || !typeSku.trim() || selectedSchools.length === 0) return;
        await addDoc(ref, { name: typeName.trim(), skuCode: typeSku.trim().toUpperCase(), schoolTypesList: selectedSchools });
        setTypeName(''); setTypeSku(''); setSelectedSchools([]);
      } 
      else if (col === 'clothingTypes') {
        if (!typeName.trim() || !typeSku.trim()) return;
        await addDoc(ref, { name: typeName.trim(), skuCode: typeSku.trim().toUpperCase(), garmentCategory: selectedGroup });
        setTypeName(''); setTypeSku('');
      } 
      else if (col === 'sizes') {
        if (!typeName.trim() || !selectedGroup) return;
        await addDoc(ref, { name: typeName.trim(), garmentCategory: selectedGroup });
        setTypeName('');
      } 
      else {
        if (!typeName.trim() || !typeSku.trim()) return;
        await addDoc(ref, { name: typeName.trim(), label: typeName.trim(), skuCode: typeSku.trim().toUpperCase() });
        setTypeName(''); setTypeSku('');
      }
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleLaunchEdit = (item: any, col: string) => {
    setEditingId(item.id);
    setTypeName(item.name || item.label || '');
    setTypeSku(item.skuCode || '');
    setSelectedGroup(item.garmentCategory || 'Jumpers');
    setSelectedSchools(item.schoolTypesList || []);
    
    setEditCatName(item.name || '');
    setEditCatHasSchools(item.hasSchools === true);
    setEditSkuPrefix(item.skuPrefix || '');
    setEditPackagingType(item.packagingType || 'Single');
  };
  const handleUpdateStandardRecord = async (col: string, docId: string) => {
    try {
      const updateData: any = { name: typeName.trim(), label: typeName.trim() };
      if (col !== 'sizes') updateData.skuCode = typeSku.trim().toUpperCase();
      if (col === 'clothingTypes' || col === 'sizes') updateData.garmentCategory = selectedGroup;
      if (col === 'schools') updateData.schoolTypesList = selectedSchools;

      await updateDoc(doc(db, col, docId), updateData);
      setEditingId(null); setTypeName(''); setTypeSku(''); setSelectedSchools([]);
    } catch (e) { console.error(e); }
  };

  const toggleMultiSchoolSelect = (typeCode: string) => {
    setSelectedSchools(prev => prev.includes(typeCode) ? prev.filter(c => c !== typeCode) : [...prev, typeCode]);
  };

  return (
    <div className="w-full text-left select-none animate-fadeIn font-sans text-xs font-bold text-slate-700">
      
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          <div className="bg-white border rounded-3xl p-5 shadow-xs border-t-4 border-brand-teal space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Layers className="w-4 h-4 text-brand-teal" /> Master Categories Form</h4>
            <form onSubmit={(e) => handleCreateDocumentPayload(e, 'categories')} className="space-y-4">
              <div><label className="block mb-1 text-[10px] uppercase text-slate-500">Category Name</label><input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full p-2 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block mb-1 text-[10px] uppercase text-slate-500">SKU Prefix</label><input type="text" value={skuPrefix} onChange={(e) => handlePrefixTextNormalization(e.target.value, setSkuPrefix)} className="w-full p-2 border rounded-xl text-center" /></div>
                <div><label className="block mb-1 text-[10px] uppercase text-slate-500">Format</label><select value={packagingType} onChange={(e) => setPackagingType(e.target.value as any)} className="w-full p-2 border rounded-xl bg-white"><option value="Single">Single Items</option><option value="VacPac">VacPac Only</option><option value="Both">Both Mixed</option></select></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl"><input type="checkbox" id="catHasSchools" checked={catHasSchools} onChange={(e) => setCatHasSchools(e.target.checked)} /><label htmlFor="catHasSchools">Linked to Schools?</label></div>
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white uppercase rounded-xl">Register Category</button>
            </form>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4">
                {editingId === cat.id ? (
                  <div className="space-y-3">
                    <input type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="w-full p-2 border rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={editSkuPrefix} onChange={(e) => handlePrefixTextNormalization(e.target.value, setEditSkuPrefix)} className="w-full p-2 border rounded-xl text-center" />
                      <select value={editPackagingType} onChange={(e) => setEditPackagingType(e.target.value as any)} className="w-full p-2 border rounded-xl bg-white"><option value="Single">Single</option><option value="VacPac">VacPac</option><option value="Both">Both</option></select>
                    </div>
                    <div className="flex gap-2 py-1"><input type="checkbox" id="editHasSchoolCheck" checked={editCatHasSchools} onChange={(e) => setEditCatHasSchools(e.target.checked)} /><label htmlFor="editHasSchoolCheck">Linked to Schools?</label></div>
                    <div className="flex gap-2"><button type="button" onClick={() => handleUpdateMasterCategory(cat.docId || cat.id, cat.id, cat.name)} className="flex-1 py-1.5 bg-emerald-600 text-white rounded-xl uppercase text-[10px]">Save</button><button type="button" onClick={() => setEditingId(null)} className="py-1.5 px-3 bg-slate-100 rounded-xl">Cancel</button></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start"><h5 className="font-black text-slate-900 text-sm">{cat.name}</h5><span className="w-7 h-7 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-mono border">{cat.skuPrefix || 'U'}</span></div>
                    <div className="flex justify-between border-t pt-3 text-[10px] text-slate-400 font-mono"><span>{cat.hasSchools ? '🏛️ School Linked' : '📦 Plain Stock'}</span><span>📦 {cat.packagingType || 'Single'}</span></div>
                    {userRole === 'Master_Dev' && <div className="flex gap-2 justify-end pt-1 border-t mt-2"><button type="button" onClick={() => handleLaunchEdit(cat, 'categories')} className="text-teal-600 underline">Edit</button><button type="button" onClick={() => handleSecureDeleteRecord('categories', cat.docId || cat.id, cat.name)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🏛️ SUBTAB 2: SCHOOL TYPES CONFIGURATION CONSOLE */}
      {activeSubTab === 'schoolTypes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          <div className="bg-white border rounded-3xl p-5 shadow-xs border-t-4 border-indigo-500 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-500" /> Configure School Type</h4>
            <form onSubmit={(e) => handleCreateDocumentPayload(e, 'schoolTypes')} className="space-y-4">
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">Type Name (e.g. Junior)</label><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-2.5 border rounded-xl" /></div>
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">SKU Code (Strictly 1 Letter e.g. J)</label><input type="text" value={typeSku} onChange={(e) => handlePrefixTextNormalization(e.target.value, setTypeSku)} className="w-full p-2.5 border rounded-xl text-center font-mono" /></div>
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white uppercase rounded-xl">Register Type</button>
            </form>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {schoolTypes.map(st => (
              <div key={st.id} className="bg-white border rounded-3xl p-4 shadow-xs flex items-center justify-between">
                {editingId === st.id ? (
                  <div className="w-full space-y-2 flex flex-col"><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-1.5 border rounded-lg" /><input type="text" value={typeSku} onChange={(e) => handlePrefixTextNormalization(e.target.value, setTypeSku)} className="w-full p-1.5 border rounded-lg text-center" /><div className="flex gap-2"><button onClick={() => handleUpdateStandardRecord('schoolTypes', st.id)} className="flex-1 bg-emerald-600 text-white p-1 rounded-lg text-[10px]">Save</button><button onClick={() => setEditingId(null)} className="bg-slate-100 p-1 rounded-lg">Cancel</button></div></div>
                ) : (
                  <>
                    <div><h5 className="font-black text-slate-900 text-xs">{st.name}</h5><span className="text-[10px] font-mono text-slate-400 uppercase">Code Variant: {st.skuCode}</span></div>
                    <div className="flex gap-2"><button onClick={() => handleLaunchEdit(st, 'schoolTypes')} className="text-teal-600 underline">Edit</button><button onClick={() => handleSecureDeleteRecord('schoolTypes', st.id, st.name)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 🏛️ SUBTAB 3: SCHOOL REGISTRY MULTI-SELECT MANAGER */}
      {activeSubTab === 'schools' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          <div className="bg-white border rounded-3xl p-5 shadow-xs border-t-4 border-teal-600 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><School className="w-4 h-4 text-teal-600" /> School Registry Form</h4>
            <form onSubmit={(e) => handleCreateDocumentPayload(e, 'schools')} className="space-y-4">
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">School Name</label><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-2.5 border rounded-xl" /></div>
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">School SKU Prefix</label><input type="text" value={typeSku} onChange={(e) => setTypeSku(e.target.value)} className="w-full p-2.5 border rounded-xl uppercase" /></div>
              <div>
                <label className="block mb-1 text-[10px] uppercase text-slate-400">Select School Types (Multiple)</label>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {schoolTypes.map(st => (
                    <button type="button" key={st.id} onClick={() => toggleMultiSchoolSelect(st.skuCode)} className={`py-1 px-2 border rounded-lg font-mono text-[10px] ${selectedSchools.includes(st.skuCode) ? 'bg-teal-600 text-white border-transparent' : 'bg-slate-50 text-slate-500'}`}>{st.name} ({st.skuCode})</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white uppercase rounded-xl">Register School</button>
            </form>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {schools.map(s => (
              <div key={s.id} className="bg-white border rounded-3xl p-4 shadow-xs flex items-center justify-between gap-3">
                {editingId === s.id ? (
                  <div className="w-full space-y-2 text-left"><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-2 border rounded-xl" /><input type="text" value={typeSku} onChange={(e) => setTypeSku(e.target.value)} className="w-full p-2 border rounded-xl uppercase" /><div className="flex gap-1.5 flex-wrap">{schoolTypes.map(st => (<button type="button" key={st.id} onClick={() => toggleMultiSchoolSelect(st.skuCode)} className={`py-1 px-2 border rounded-lg text-[10px] ${selectedSchools.includes(st.skuCode) ? 'bg-teal-600 text-white' : 'bg-slate-50'}`}>{st.skuCode}</button>))}</div><div className="flex gap-2"><button onClick={() => handleUpdateStandardRecord('schools', s.id)} className="flex-1 bg-emerald-600 text-white p-1.5 rounded-xl text-[10px]">Save</button><button onClick={() => setEditingId(null)} className="bg-slate-100 p-1.5 rounded-xl">Cancel</button></div></div>
                ) : (
                  <>
                    <div className="truncate"><h5 className="font-black text-slate-900 text-xs truncate">{s.name}</h5><div className="flex gap-1.5 mt-1 font-mono text-[9px] uppercase font-bold text-teal-600 flex-wrap">{s.schoolTypesList ? s.schoolTypesList.map((t: string) => <span key={t} className="bg-teal-50 border px-1 rounded-sm">{t}</span>) : <span className="bg-slate-100 px-1 rounded-sm text-slate-400">N/A</span>}<span className="text-slate-400 ml-auto">SKU: {s.skuCode}</span></div></div>
                    <div className="flex gap-2 shrink-0"><button onClick={() => handleLaunchEdit(s, 'schools')} className="text-teal-600 underline">Edit</button><button onClick={() => handleSecureDeleteRecord('schools', s.id, s.name)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 👔 SUBTAB 4: GARMENT TYPES DESIGN CATEGORIZATION BAR */}
      {activeSubTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          <div className="bg-white border rounded-3xl p-5 shadow-xs border-t-4 border-indigo-600 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Shirt className="w-4 h-4 text-indigo-600" /> Inscribe Garment Type</h4>
            <form onSubmit={(e) => handleCreateDocumentPayload(e, 'clothingTypes')} className="space-y-4">
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">Garment Name</label><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-2.5 border rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block mb-1 text-[10px] uppercase text-slate-400">SKU Code</label><input type="text" value={typeSku} onChange={(e) => setTypeSku(e.target.value)} className="w-full p-2.5 border rounded-xl uppercase" /></div>
                <div><label className="block mb-1 text-[10px] uppercase text-slate-400">Sizing Category Map</label><select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white"><option value="Shoes">Shoes</option><option value="Jumpers">Jumpers / Tops</option><option value="Trouser/Skirts">Trouser / Skirts</option></select></div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white uppercase rounded-xl">Register Garment</button>
            </form>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clothingTypes.map(g => (
              <div key={g.id} className="bg-white border rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
                {editingId === g.id ? (
                  <div className="w-full space-y-2"><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-1.5 border rounded-lg" /><input type="text" value={typeSku} onChange={(e) => setTypeSku(e.target.value)} className="w-full p-1.5 border rounded-lg uppercase" /><select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full p-1.5 border rounded-lg bg-white"><option value="Shoes">Shoes</option><option value="Jumpers">Jumpers</option><option value="Trouser/Skirts">Trouser/Skirts</option></select><div className="flex gap-2"><button onClick={() => handleUpdateStandardRecord('clothingTypes', g.id)} className="flex-1 bg-emerald-600 text-white p-1 rounded-lg">Save</button><button onClick={() => setEditingId(null)} className="bg-slate-100 p-1 rounded-lg">Cancel</button></div></div>
                ) : (
                  <>
                    <div className="truncate"><span className="font-black text-slate-800 text-xs truncate block">{g.name}</span><span className="text-[10px] font-mono font-bold text-slate-400 block mt-0.5 uppercase">SKU: {g.skuCode} | Map: {g.garmentCategory || 'Jumpers'}</span></div>
                    <div className="flex gap-2"><button onClick={() => handleLaunchEdit(g, 'clothingTypes')} className="text-teal-600 underline">Edit</button><button onClick={() => handleSecureDeleteRecord('clothingTypes', g.id, g.name)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 📏 SUBTAB 5: SIZES OPTION MAPPED SYSTEM PANEL */}
      {activeSubTab === 'sizes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          <div className="bg-white border rounded-3xl p-5 shadow-xs border-t-4 border-slate-700 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Maximize2 className="w-4 h-4 text-slate-700" /> Inscribe Sizing Profile</h4>
            <form onSubmit={(e) => handleCreateDocumentPayload(e, 'sizes')} className="space-y-4">
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">Size Descriptor Label (e.g. 2-3yrs)</label><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-2.5 border rounded-xl" /></div>
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">Garment Category Assignment</label><select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white"><option value="Shoes">Shoes</option><option value="Jumpers">Jumpers / Tops</option><option value="Trouser/Skirts">Trouser / Skirts</option></select></div>
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white uppercase rounded-xl">Commit Size</button>
            </form>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sizes.map(sz => (
              <div key={sz.id} className="bg-white border rounded-xl p-3 shadow-xs flex items-center justify-between gap-2">
                {editingId === sz.id ? (
                  <div className="w-full space-y-2"><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-1.5 border rounded-lg" /><select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full p-1.5 border rounded-lg bg-white"><option value="Shoes">Shoes</option><option value="Jumpers">Jumpers</option><option value="Trouser/Skirts">Trouser/Skirts</option></select><div className="flex gap-2"><button onClick={() => handleUpdateStandardRecord('sizes', sz.id)} className="flex-1 bg-emerald-600 text-white p-1 rounded-lg">Save</button><button onClick={() => setEditingId(null)} className="bg-slate-100 p-1 rounded-lg">Cancel</button></div></div>
                ) : (
                  <>
                    <div className="font-mono font-black text-[11px] text-slate-800 uppercase truncate"><span>{sz.name}</span><span className="block text-[9px] text-slate-400 font-sans tracking-normal font-medium mt-0.5">Category Match: {sz.garmentCategory || 'Jumpers'}</span></div>
                    <div className="flex gap-2 shrink-0"><button onClick={() => handleLaunchEdit(sz, 'sizes')} className="text-teal-600 underline">Edit</button><button onClick={() => handleSecureDeleteRecord('sizes', sz.id, sz.name)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎨 SUBTAB 6 & 7: COLOURS PROFILE AND LOCATIONS TRACKING CONSOLES */}
      {['colours', 'locations'].includes(activeSubTab) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          <div className="bg-white border rounded-3xl p-5 shadow-xs border-t-4 border-slate-700 space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Palette className="w-4 h-4 text-slate-700" /> Configure {activeSubTab === 'colours' ? 'Colour' : 'Location'}</h4>
            <form onSubmit={(e) => handleCreateDocumentPayload(e, activeSubTab)} className="space-y-4">
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">Name Descriptor</label><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-2.5 border rounded-xl" /></div>
              <div><label className="block mb-1 text-[10px] uppercase text-slate-400">SKU Field Identifier Code</label><input type="text" value={typeSku} onChange={(e) => setTypeSku(e.target.value)} className="w-full p-2.5 border rounded-xl uppercase" /></div>
              <button type="submit" className="w-full py-2.5 bg-slate-900 text-white uppercase rounded-xl">Commit Lookup Value</button>
            </form>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(activeSubTab === 'colours' ? colours : locations).map((item: any) => (
              <div key={item.id} className="bg-white border rounded-xl p-3 shadow-xs flex items-center justify-between gap-2 font-mono text-[11px] font-black uppercase text-slate-800">
                {editingId === item.id ? (
                  <div className="w-full space-y-2"><input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} className="w-full p-1.5 border rounded-lg" /><input type="text" value={typeSku} onChange={(e) => setTypeSku(e.target.value)} className="w-full p-1.5 border rounded-lg uppercase" /><div className="flex gap-2"><button onClick={() => handleUpdateStandardRecord(activeSubTab, item.id)} className="flex-1 bg-emerald-600 text-white p-1 rounded-lg">Save</button><button onClick={() => setEditingId(null)} className="bg-slate-100 p-1 rounded-lg">Cancel</button></div></div>
                ) : (
                  <>
                    <div className="truncate"><span>{item.name || item.label}</span><span className="block text-[9px] text-slate-400 font-sans tracking-normal font-medium mt-0.5">SKU Parameter: {item.skuCode || 'N/A'}</span></div>
                    <div className="flex gap-2 shrink-0"><button onClick={() => handleLaunchEdit(item, activeSubTab)} className="text-teal-600 underline">Edit</button><button onClick={() => handleSecureDeleteRecord(activeSubTab, item.id, item.name || item.label)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
