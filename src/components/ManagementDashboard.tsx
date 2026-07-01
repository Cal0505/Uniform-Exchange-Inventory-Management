// ==========================================
// 🚀 PART 1: FILE HEADERS AND COMPONENT STATE
// ==========================================
import React, { useState, useMemo } from 'react';
import { Trash2, Search, PlusCircle, Edit3, XCircle, Check } from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';

interface ManagementDashboardProps {
  Category: any[];
  School_Type: any[]; 
  School: any[];
  Clothing_Type: any[]; 
  Size: any[];
  Colour: any[];
  Location: any[];
  userRole?: string;
  forcedSubTabOverride?: any;
  setActiveSubTab?: (tab: string) => void;
}

export default function ManagementDashboard({
  Category,
  School_Type, 
  School,
  Clothing_Type,
  Size,
  Colour,
  Location,
  userRole,
  forcedSubTabOverride,
  setActiveSubTab,
}: ManagementDashboardProps) {

  // Navigation & Form Submission States
  const [activeTab, setActiveTab] = useState<string>('Category');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Inline Editing Tracking State Engine
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormFields, setEditFormFields] = useState<Record<string, any>>({});
  
  // Tab Keyword Filter Input Maps
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({
    'Category': '',
    'School_Type': '',
    'School': '',
    'Clothing_Type': '',
    'Size': '',
    'Colour': '',
    'Location': ''
  });

  // 📝 NEW FORM SUBMISSION CAPTURE STATES
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSchoolTypeName, setNewSchoolTypeName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newClothingTypeName, setNewClothingTypeName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newColourName, setNewColourName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationLabel, setNewLocationLabel] = useState('');
  const [newLocationSkuCode, setNewLocationSkuCode] = useState('');

  // 🔄 AUTOMATIC NAVBAR TRACKING & SYNC EFFECT
  React.useEffect(() => {
    if (forcedSubTabOverride) {
      setActiveTab(forcedSubTabOverride); 
      setEditingRowId(null);
      setEditFormFields({});
    }
  }, [forcedSubTabOverride]);

  // ==========================================
  // 🔒 PART 2: SECURE MUTATION LOGIC (WRITE / DELETE)
  // ==========================================
  const handleSecureDeleteRecord = async (targetCollectionName: string, docId: string, itemLabel: string) => {
    if (!docId) return alert("System Error: Cannot target item without a verified tracking identifier.");
    const confirmed = window.confirm(`Security Validation Checklist:\nAre you absolutely certain you want to destroy "${itemLabel}"?\n\nCRITICAL WARNING: This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      
      // Correct collection name routing matching our exact singular strings
      let firestoreCollection = targetCollectionName.toLowerCase().replace(' ', '');
      if (firestoreCollection === 'category') firestoreCollection = 'Category';
      else if (firestoreCollection === 'schooltype') firestoreCollection = 'School Type';
      else firestoreCollection += 's';

      const targetDocRef = doc(db, firestoreCollection, docId);
      batch.delete(targetDocRef);

      const itemsRef = collection(db, 'items');
      const q = query(itemsRef, where(targetCollectionName, '==', itemLabel));
      const affectedItemsSnap = await getDocs(q);
      
      affectedItemsSnap.forEach((itemDoc) => {
        batch.update(itemDoc.ref, { [targetCollectionName]: "Unassigned / Pending" });
      });

      await batch.commit();
      alert(`Success: "${itemLabel}" completely expunged. ${affectedItemsSnap.size} linked listings reset safely.`);
    } catch (err: any) {
      console.error("Deletion Engine Error Details:", err);
      alert(`Security Exception: Operation aborted. Code validation error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecureUpdateRecord = async (targetCollectionName: string, originalRecord: any, updatedData: Record<string, any>) => {
    const docId = originalRecord.id || originalRecord.docId;
    if (!docId) return alert("System Error: Cannot patch item without a verified tracking identifier.");
    
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);

      let firestoreCollection = targetCollectionName.toLowerCase().replace(' ', '');
      if (firestoreCollection === 'Category') firestoreCollection = 'Category';
      else if (firestoreCollection === 'School Type') firestoreCollection = 'School Type';
      else firestoreCollection += 's';

      const targetDocRef = doc(db, firestoreCollection, docId);
      batch.update(targetDocRef, updatedData);

      if (updatedData.name && updatedData.name !== originalRecord.name) {
        const itemsRef = collection(db, 'items');
        const q = query(itemsRef, where(targetCollectionName, '==', originalRecord.name));
        const affectedItemsSnap = await getDocs(q);
        
        affectedItemsSnap.forEach((itemDoc) => {
          batch.update(itemDoc.ref, { [targetCollectionName]: updatedData.name });
        });
      }

      await batch.commit();
      setEditingRowId(null);
      setEditFormFields({});
    } catch (err: any) {
      console.error("Update Engine Fault:", err);
      alert(`Mutation Error: Could not save layout fields safely. Detail: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startInlineEditingRow = (record: any) => {
    setEditingRowId(record.id || record.docId);
    setEditFormFields({ ...record });
  };

  const cancelInlineEditingRow = () => {
    setEditingRowId(null);
    setEditFormFields({});
  };

  // ==========================================
  // ⚡ PART 3: RE-ROUTED SUBMIT DISPATCH FUNCTIONS
  // ==========================================
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'Category'));
      batch.set(newRef, { name: newCategoryName.trim(), id: newRef.id });
      await batch.commit();
      setNewCategoryName('');
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAddSchoolTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolTypeName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'School Type'));
      batch.set(newRef, { name: newSchoolTypeName.trim(), id: newRef.id });
      await batch.commit();
      setNewSchoolTypeName('');
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAddSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'School'));
      batch.set(newRef, { name: newSchoolName.trim(), id: newRef.id });
      await batch.commit();
      setNewSchoolName('');
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAddClothingTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClothingTypeName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'Clothing Type'));
      batch.set(newRef, { name: newClothingTypeName.trim(), id: newRef.id });
      await batch.commit();
      setNewClothingTypeName('');
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAddSizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'Size'));
      batch.set(newRef, { name: newSizeName.trim(), id: newRef.id });
      await batch.commit();
      setNewSizeName('');
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAddColourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColourName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'Colour'));
      batch.set(newRef, { name: newColourName.trim(), id: newRef.id });
      await batch.commit();
      setNewColourName('');
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAddLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'Location'));
      batch.set(newRef, { 
        name: newLocationName.trim(), 
        label: newLocationLabel.trim(), 
        skuCode: newLocationSkuCode.trim().toUpperCase(),
        id: newRef.id 
      });
      await batch.commit();
      setNewLocationName(''); setNewLocationLabel(''); setNewLocationSkuCode('');
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  // ==========================================
  // 🔍 PART 4: SINGULAR USEMEMO FILTER ARRAYS
  // ==========================================
  const filteredCategory = useMemo(() => Category.filter(c => (c.name || '').toLowerCase().includes((searchQueries['Category'] || '').toLowerCase())), [Category, searchQueries]);
  const filteredSchoolType = useMemo(() => School_Type.filter(st => (st.name || '').toLowerCase().includes((searchQueries['School_Type'] || '').toLowerCase())), [School_Type, searchQueries]);
  const filteredSchool = useMemo(() => School.filter(s => (s.name || '').toLowerCase().includes((searchQueries['School'] || '').toLowerCase())), [School, searchQueries]);
  const filteredClothingType = useMemo(() => Clothing_Type.filter(ct => (ct.name || '').toLowerCase().includes((searchQueries['Clothing_Type'] || '').toLowerCase())), [Clothing_Type, searchQueries]);
  const filteredSize = useMemo(() => Size.filter(s => (s.name || '').toLowerCase().includes((searchQueries['Size'] || '').toLowerCase())), [Size, searchQueries]);
  const filteredColour = useMemo(() => Colour.filter(c => (c.name || '').toLowerCase().includes((searchQueries['Colour'] || '').toLowerCase())), [Colour, searchQueries]);
  const filteredLocation = useMemo(() => Location.filter(l => (l.name || '').toLowerCase().includes((searchQueries['Location'] || '').toLowerCase())), [Location, searchQueries]);

  // ==========================================
  // 🎨 PART 5: NAVIGATION RIBBON & SEARCH LAYOUT UI
  // ==========================================
  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      
      {/* Tab Navigation Ribbon */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
        {['Category', 'School_Type', 'School', 'Clothing_Type', 'Size', 'Colour', 'Location'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              cancelInlineEditingRow();
              if (setActiveSubTab) setActiveSubTab(tab);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === tab 
                ? 'bg-[#00A896] text-white shadow-md' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        
        {/* Dynamic Search Box */}
        <div className="mb-6 relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQueries[activeTab] || ''}
            onChange={(e) => setSearchQueries(prev => ({ ...prev, [activeTab]: e.target.value }))}
            placeholder={`Search ${activeTab.replace('_', ' ').toLowerCase()} list...`}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A896] transition-all"
          />
        </div>

        {/* ==========================================
            🎛️ PART 6: CONDITIONAL TAB GRID ENGINE
           ========================================== */}

        {/* CATEGORY TAB VIEW */}
        {activeTab === 'Category' && (
          <div className="w-full">
            <form onSubmit={handleAddCategorySubmit} className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New Category Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] flex-1 max-w-sm bg-white" />
              <button type="submit" disabled={isSubmitting} className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save Category</button>
            </form>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategory.map((c) => {
                    const currentId = c.id || c.docId;
                    const isRowEditing = editingRowId === currentId;
                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{c.name}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('Category', c, { name: editFormFields.name?.trim() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(c)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('Category', currentId, c.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHOOL TYPE TAB VIEW */}
        {activeTab === 'School_Type' && (
          <div className="w-full">
            <form onSubmit={handleAddSchoolTypeSubmit} className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newSchoolTypeName} onChange={(e) => setNewSchoolTypeName(e.target.value)} placeholder="e.g., Primary, Secondary" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] flex-1 max-w-sm bg-white" />
              <button type="submit" disabled={isSubmitting} className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save School Type</button>
            </form>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">School Type Designation</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchoolType.map((st) => {
                    const currentId = st.id || st.docId;
                    const isRowEditing = editingRowId === currentId;
                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{st.name}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('School Type', st, { name: editFormFields.name?.trim() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(st)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('School Type', currentId, st.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHOOL TAB VIEW */}
        {activeTab === 'School' && (
          <div className="w-full">
            <form onSubmit={handleAddSchoolSubmit} className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} placeholder="New School Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] flex-1 max-w-sm bg-white" />
              <button type="submit" disabled={isSubmitting} className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save School</button>
            </form>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">School Name</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchool.map((sch) => {
                    const currentId = sch.id || sch.docId;
                    const isRowEditing = editingRowId === currentId;
                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{sch.name}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('School', sch, { name: editFormFields.name?.trim() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(sch)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('School', currentId, sch.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLOTHING TYPE TAB VIEW */}
        {activeTab === 'Clothing_Type' && (
          <div className="w-full">
            <form onSubmit={handleAddClothingTypeSubmit} className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newClothingTypeName} onChange={(e) => setNewClothingTypeName(e.target.value)} placeholder="e.g., Blazer, Trousers, Skirt" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] flex-1 max-w-sm bg-white" />
              <button type="submit" disabled={isSubmitting} className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save Clothing Type</button>
            </form>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Clothing Type Label</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClothingType.map((ct) => {
                    const currentId = ct.id || ct.docId;
                    const isRowEditing = editingRowId === currentId;
                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{ct.name}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('Clothing Type', ct, { name: editFormFields.name?.trim() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(ct)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('Clothing Type', currentId, ct.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SIZE TAB VIEW */}
        {activeTab === 'Size' && (
          <div className="w-full">
            <form onSubmit={handleAddSizeSubmit} className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newSizeName} onChange={(e) => setNewSizeName(e.target.value)} placeholder="e.g., M, 32, 14 Years" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] flex-1 max-w-sm bg-white" />
              <button type="submit" disabled={isSubmitting} className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save Size</button>
            </form>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Size Variant Name</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSize.map((s) => {
                    const currentId = s.id || s.docId;
                    const isRowEditing = editingRowId === currentId;
                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{s.name}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('Size', s, { name: editFormFields.name?.trim() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(s)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('Size', currentId, s.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COLOUR TAB VIEW */}
        {activeTab === 'Colour' && (
          <div className="w-full">
            <form onSubmit={handleAddColourSubmit} className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newColourName} onChange={(e) => setNewColourName(e.target.value)} placeholder="e.g., Navy Blue, Royal, Gold" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] flex-1 max-w-sm bg-white" />
              <button type="submit" disabled={isSubmitting} className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save Colour</button>
            </form>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Colour Description</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredColour.map((c) => {
                    const currentId = c.id || c.docId;
                    const isRowEditing = editingRowId === currentId;
                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{c.name}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('Colour', c, { name: editFormFields.name?.trim() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(c)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('Colour', currentId, c.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOCATION TAB VIEW */}
        {activeTab === 'Location' && (
          <div className="w-full">
            <form onSubmit={handleAddLocationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="Location Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] bg-white" />
              <input type="text" value={newLocationLabel} onChange={(e) => setNewLocationLabel(e.target.value)} placeholder="Label (e.g., WH-1)" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] bg-white" />
              <input type="text" value={newLocationSkuCode} onChange={(e) => setNewLocationSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896] bg-white" />
              <button type="submit" disabled={isSubmitting} className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save Location</button>
            </form>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th> 
                    <th className="py-2 px-4">Label</th> 
                    <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> 
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLocation.map((loc) => {
                    const currentId = loc.id || loc.docId;
                    const isRowEditing = editingRowId === currentId;
                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{loc.name}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="text-slate-600">{loc.label || '-'}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono uppercase bg-white" /> : <span className="font-mono text-xs font-bold text-indigo-600">{loc.skuCode || '-'}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('Location', loc, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(loc)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('Location', currentId, loc.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}