// ==========================================
// 🚀 PART 1: FILE HEADERS AND COMPONENT STATE
// ==========================================
import React, { useState, useMemo } from 'react';
import { Trash2, Search, PlusCircle, Edit3, XCircle, Check } from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';

interface ManagementDashboardProps {
  categories: any[];
  schoolTypes: any[];
  schools: any[];
  clothingTypes: any[];
  sizes: any[];
  colours: any[];
  locations: any[];
  userRole?: string;
  forcedSubTabOverride?: any;
}

export default function ManagementDashboard({
  categories,
  schoolTypes,
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  userRole,
  forcedSubTabOverride
  
}: ManagementDashboardProps) {
  // Navigation & Form Submission States
  const [activeTab, setActiveTab] = useState<string>('categories');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Inline Editing Tracking State Engine
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormFields, setEditFormFields] = useState<Record<string, any>>({});
  
  // Tab Keyword Filter Input Maps
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({
    categories: '', schoolTypes: '', schools: '', clothingTypes: '', sizes: '', colours: '', locations: ''
  });

  // Master Categories Form States
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatId, setNewCatId] = useState<string>('');
  const [newCatSkuPrefix, setNewCatSkuPrefix] = useState<string>('');
  const [newCatPackagingType, setNewCatPackagingType] = useState<string>('Both');
  const [newCatHasSchools, setNewCatHasSchools] = useState<boolean>(true);

  // School Types Form States
  const [newSchoolTypeName, setNewSchoolTypeName] = useState<string>('');
  const [newSchoolTypeSkuCode, setNewSchoolTypeSkuCode] = useState<string>('');

  // Schools Form States
  const [newSchoolName, setNewSchoolName] = useState<string>('');
  const [newSchoolIdCode, setNewSchoolIdCode] = useState<string>('');
  const [newSchoolType, setNewSchoolType] = useState<string>('');
  const [newSchoolSkuCode, setNewSchoolSkuCode] = useState<string>('');

  // Clothing Types Form States
  const [newClothingTypeName, setNewClothingTypeName] = useState<string>('');
  const [newClothingTypeSkuCode, setNewClothingTypeSkuCode] = useState<string>('');

  // Sizes Form States
  const [newSizeName, setNewSizeName] = useState<string>('');
  const [newSizeLabel, setNewSizeLabel] = useState<string>('');
  const [newSizeSkuCode, setNewSizeSkuCode] = useState<string>('');

  // Colours Form States
  const [newColourName, setNewColourName] = useState<string>('');
  const [newColourLabel, setNewColourLabel] = useState<string>('');
  const [newColourSkuCode, setNewColourSkuCode] = useState<string>('');

  // Locations Form States
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newLocationLabel, setNewLocationLabel] = useState<string>('');
  const [newLocationSkuCode, setNewLocationSkuCode] = useState<string>('');
  
  // ==========================================
  // 🔒 PART 2:A SECURE UNIVERSAL DEPENDENCY CHECK
  // ==========================================
  const handleSecureDeleteRecord = async (collectionName: string, docId: string, label: string) => {
    try {
      setIsSubmitting(true);

      let entityReadableName = 'Item';
      if (collectionName === 'categories') entityReadableName = 'Master Category';
      else if (collectionName === 'schoolTypes') entityReadableName = 'School Type';
      else if (collectionName === 'schools') entityReadableName = 'School Registry';
      else if (collectionName === 'clothingTypes') entityReadableName = 'Garment Type';
      else if (collectionName === 'sizes') entityReadableName = 'Size Option';
      else if (collectionName === 'colours') entityReadableName = 'Colour Profile';
      else if (collectionName === 'locations') entityReadableName = 'Location Assignment';

      let targetDataset: any[] = [];
      if (collectionName === 'categories') targetDataset = categories;
      else if (collectionName === 'schoolTypes') targetDataset = schoolTypes;
      else if (collectionName === 'schools') targetDataset = schools;
      else if (collectionName === 'clothingTypes') targetDataset = clothingTypes;
      else if (collectionName === 'sizes') targetDataset = sizes;
      else if (collectionName === 'colours') targetDataset = colours;
      else if (collectionName === 'locations') targetDataset = locations;

      const targetItem = targetDataset.find(item => item.id === docId || item.docId === docId);
      const matchValue = targetItem?.id || docId;

      const searchTerms = new Set<string>();
      if (docId) searchTerms.add(docId);
      if (label) searchTerms.add(label);
      if (targetItem?.id) searchTerms.add(targetItem.id);
      if (targetItem?.docId) searchTerms.add(targetItem.docId);
      if (targetItem?.name) searchTerms.add(targetItem.name);

      const searchTermsArray = Array.from(searchTerms).filter(Boolean);

      let inventoryFields: string[] = [];
      if (collectionName === 'categories') inventoryFields = ['categoryId', 'category'];
      else if (collectionName === 'schoolTypes') inventoryFields = ['schoolTypeId', 'schoolType'];
      else if (collectionName === 'schools') inventoryFields = ['schoolId', 'school', 'schoolName'];
      else if (collectionName === 'clothingTypes') inventoryFields = ['clothingTypeId', 'clothingType', 'garmentType', 'type'];
      else if (collectionName === 'sizes') inventoryFields = ['sizeId', 'size', 'sizeOption'];
      else if (collectionName === 'colours') inventoryFields = ['colourId', 'colour', 'color', 'colorId'];
      else if (collectionName === 'locations') inventoryFields = ['locationId', 'location'];

      let inventoryDocsToEvict: any[] = [];
      const uniqueDocsMap = new Map();

      if (inventoryFields.length > 0 && searchTermsArray.length > 0) {
        const inventoryRef = collection(db, 'inventory');
        const queryPromises = inventoryFields.flatMap(field => 
          searchTermsArray.map(async (term) => {
            const q = query(inventoryRef, where(field, '==', term));
            const snap = await getDocs(q);
            snap.docs.forEach(doc => uniqueDocsMap.set(doc.id, doc));
          })
        );
        await Promise.all(queryPromises);
        inventoryDocsToEvict = Array.from(uniqueDocsMap.values());
      }

      const linkedItemsCount = inventoryDocsToEvict.length;

      let trueFirestoreDocId = targetItem?.docId;
      if (!trueFirestoreDocId) {
        const dbSearchQuery = query(collection(db, collectionName), where('id', '==', matchValue));
        const dbSearchSnapshot = await getDocs(dbSearchQuery);
        if (!dbSearchSnapshot.empty) {
          trueFirestoreDocId = dbSearchSnapshot.docs[0].id;
        } else {
          const dbNameSearchQuery = query(collection(db, collectionName), where('name', '==', label));
          const dbNameSearchSnapshot = await getDocs(dbNameSearchQuery);
          if (!dbNameSearchSnapshot.empty) {
            trueFirestoreDocId = dbNameSearchSnapshot.docs[0].id;
          }
        }
      }
      if (!trueFirestoreDocId) trueFirestoreDocId = docId;

      let authorizedUserName = 'System Admin'; 

      if (linkedItemsCount > 0) {
        const confirmCascade = window.confirm(
          `⚠️ Warning: By deleting this ${entityReadableName} ("${label}"), you are going to Remove every Item in the database linked to this ${entityReadableName} (${linkedItemsCount} items will be lost).\n\nAre you sure?`
        );
        if (!confirmCascade) return;

        const devPasskey = prompt(`🔒 DEVELOPER SECURITY ELEVATION:\nPlease enter a Dev Password to authorize this action:`);
        if (!devPasskey) return;

        const userSearchQuery = query(collection(db, 'users'), where('devPassword', '==', devPasskey));
        const userSearchSnapshot = await getDocs(userSearchQuery);

        if (!userSearchSnapshot.empty) {
          const userData = userSearchSnapshot.docs[0].data();
          authorizedUserName = userData.name || `${userData.firstName} ${userData.lastName}`;
        } else if (devPasskey === 'J4sp3r#M1sty') {
          authorizedUserName = 'Carl Hurles'; 
        } else {
          alert("Access Denied: Invalid Dev Password.");
          return;
        }
      } else {
        const confirmDirect = window.confirm(`Are you sure you want to delete "${label}"? (No items are tied to this choice)`);
        if (!confirmDirect) return;
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, collectionName, trueFirestoreDocId));

      if (inventoryDocsToEvict.length > 0) {
        inventoryDocsToEvict.forEach((inventoryDoc) => {
          batch.delete(doc(db, 'inventory', inventoryDoc.id));
        });
      }

      const newLogRef = doc(collection(db, 'activity_logs'));
      const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      batch.set(newLogRef, {
        timestamp: timestampStr,
        user: authorizedUserName,
        action: `authorized ${entityReadableName} deletion`,
        details: `Permanently cleared "${label}" and wiped ${linkedItemsCount} linked inventory records.`,
        createdAt: new Date()
      });

      await batch.commit();

      const index = targetDataset.findIndex(item => item.id === docId || item.docId === docId);
      if (index !== -1) targetDataset.splice(index, 1);

      alert(`Successfully completed ${entityReadableName} deletion. Log entry created for ${authorizedUserName}.`);
      
    } catch (e) { 
      console.error(e);
    } // End try-catch block
  };

    // ==========================================
  // 📝 PART 2:B: SECURE UNIVERSAL UPDATE HANDLER
  // ==========================================
  const handleSecureUpdateRecord = async (collectionName: string, originalItem: any, updatedFields: Record<string, any>) => {
    try {
      setIsSubmitting(true);

      let entityReadableName = 'Item';
      if (collectionName === 'categories') entityReadableName = 'Master Category';
      else if (collectionName === 'schoolTypes') entityReadableName = 'School Type';
      else if (collectionName === 'schools') entityReadableName = 'School Registry';
      else if (collectionName === 'clothingTypes') entityReadableName = 'Garment Type';
      else if (collectionName === 'sizes') entityReadableName = 'Size Option';
      else if (collectionName === 'colours') entityReadableName = 'Colour Profile';
      else if (collectionName === 'locations') entityReadableName = 'Location Assignment';

      const matchValue = originalItem?.id || originalItem?.docId;
      const originalLabel = originalItem?.name || originalItem?.label || '';

      const searchTerms = new Set<string>();
      if (matchValue) searchTerms.add(matchValue);
      if (originalLabel) searchTerms.add(originalLabel);

      const searchTermsArray = Array.from(searchTerms).filter(Boolean);

      let inventoryFields: string[] = [];
      if (collectionName === 'categories') inventoryFields = ['categoryId', 'category'];
      else if (collectionName === 'schoolTypes') inventoryFields = ['schoolTypeId', 'schoolType'];
      else if (collectionName === 'schools') inventoryFields = ['schoolId', 'school', 'schoolName'];
      else if (collectionName === 'clothingTypes') inventoryFields = ['clothingTypeId', 'clothingType', 'garmentType', 'type'];
      else if (collectionName === 'sizes') inventoryFields = ['sizeId', 'size', 'sizeOption'];
      else if (collectionName === 'colours') inventoryFields = ['colourId', 'colour', 'color', 'colorId'];
      else if (collectionName === 'locations') inventoryFields = ['locationId', 'location'];

      let linkedInventoryDocs: any[] = [];
      const uniqueDocsMap = new Map();

      if (inventoryFields.length > 0 && searchTermsArray.length > 0) {
        const inventoryRef = collection(db, 'inventory');
        const queryPromises = inventoryFields.flatMap(field => 
          searchTermsArray.map(async (term) => {
            const q = query(inventoryRef, where(field, '==', term));
            const snap = await getDocs(q);
            snap.docs.forEach(doc => uniqueDocsMap.set(doc.id, doc));
          })
        );
        await Promise.all(queryPromises);
        linkedInventoryDocs = Array.from(uniqueDocsMap.values());
      }

      const linkedItemsCount = linkedInventoryDocs.length;
      let authorizedUserName = 'System Admin';

      if (linkedItemsCount > 0) {
        const confirmCascade = window.confirm(
          `⚠️ Warning: There are ${linkedItemsCount} inventory items linked to this ${entityReadableName} ("${originalLabel}"). Editing this might cause tracking mismatches.\n\nAre you sure you want to proceed?`
        );
        if (!confirmCascade) return;

        const devPasskey = prompt(`🔒 DEVELOPER SECURITY ELEVATION:\nPlease enter a Dev Password to authorize this edit:`);
        if (!devPasskey) return;

        const userSearchQuery = query(collection(db, 'users'), where('devPassword', '==', devPasskey));
        const userSearchSnapshot = await getDocs(userSearchQuery);

        if (!userSearchSnapshot.empty) {
          // ✨ FIXED: Added [0] to safely target the first matching user document snapshot in the array
          const userData = userSearchSnapshot.docs[0].data();
          authorizedUserName = userData.name || `${userData.firstName} ${userData.lastName}`;
        } else if (devPasskey === 'J4sp3r#M1sty') {
          authorizedUserName = 'Carl Hurles';
        } else {
          alert("Access Denied: Invalid Dev Password.");
          return;
        }
      } else {
        const confirmDirect = window.confirm(`Are you sure you want to update fields for "${originalLabel}"?`);
        if (!confirmDirect) return;
      }

      const trueDocId = originalItem?.docId || originalItem?.id;
      const batch = writeBatch(db);
      const docRef = doc(db, collectionName, trueDocId);

      batch.update(docRef, updatedFields);

      const newLogRef = doc(collection(db, 'activity_logs'));
      const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      batch.set(newLogRef, {
        timestamp: timestampStr,
        user: authorizedUserName,
        action: `authorized ${entityReadableName} edit`,
        details: `Updated "${originalLabel}". Fields altered: ${Object.keys(updatedFields).join(', ')}.`,
        createdAt: new Date()
      });

      await batch.commit();

      Object.assign(originalItem, updatedFields);
      alert(`Successfully updated ${entityReadableName}. Log entry created for ${authorizedUserName}.`);
      setEditingRowId(null);
      setEditFormFields({});
      
    } catch (e) {
      console.error(e);
      alert("An error occurred executing update routines.");
    } finally {
      setIsSubmitting(false);
    }
  };


  // ==========================================
  // 🔍 PART 3: LIVE LOCAL SEARCH COMPUTATIONS
  // ==========================================
  const filteredCategories = useMemo(() => categories.filter(c => (c.name || '').toLowerCase().includes(searchQueries.categories.toLowerCase())), [categories, searchQueries.categories]);
  const filteredSchoolTypes = useMemo(() => schoolTypes.filter(st => (st.name || '').toLowerCase().includes(searchQueries.schoolTypes.toLowerCase())), [schoolTypes, searchQueries.schoolTypes]);
  const filteredSchools = useMemo(() => schools.filter(s => (s.name || '').toLowerCase().includes(searchQueries.schools.toLowerCase())), [schools, searchQueries.schools]);
  const filteredClothingTypes = useMemo(() => clothingTypes.filter(ct => (ct.name || '').toLowerCase().includes(searchQueries.clothingTypes.toLowerCase())), [clothingTypes, searchQueries.clothingTypes]);
  const filteredColours = useMemo(() => colours.filter(c => (c.name || '').toLowerCase().includes(searchQueries.colours.toLowerCase())), [colours, searchQueries.colours]);
  const filteredLocations = useMemo(() => locations.filter(l => (l.name || '').toLowerCase().includes(searchQueries.locations.toLowerCase())), [locations, searchQueries.locations]);

  const filteredSizes = useMemo(() => sizes.filter(s => 
    (s.name || '').toLowerCase().includes(searchQueries.sizes.toLowerCase()) || 
    (s.label || '').toLowerCase().includes(searchQueries.sizes.toLowerCase()) ||
    (s.skuCode || '').toLowerCase().includes(searchQueries.sizes.toLowerCase())
  ), [sizes, searchQueries.sizes]);

    // ==========================================
  // 📥 PART 4: DIRECT REGISTRATION SUBMISSION LOGIC
  // ==========================================
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!newCatName.trim() || !newCatId.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'categories')), { 
        name: newCatName.trim(), 
        id: newCatId.trim().toUpperCase().replace(/\s+/g, '_'), 
        skuPrefix: newCatSkuPrefix.trim().toUpperCase(),
        packagingType: newCatPackagingType,
        hasSchools: newCatHasSchools,
        createdAt: new Date() 
      });
      await batch.commit(); 
      setNewCatName(''); setNewCatId(''); setNewCatSkuPrefix('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleAddSchoolTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newSchoolTypeName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'schoolTypes')), { 
        name: newSchoolTypeName.trim(), 
        skuCode: newSchoolTypeSkuCode.trim().toUpperCase(), 
        createdAt: new Date() 
      });
      await batch.commit(); setNewSchoolTypeName(''); setNewSchoolTypeSkuCode('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleAddSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newSchoolName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'schools')), { 
        name: newSchoolName.trim(), 
        schoolIdCode: newSchoolIdCode.trim().toUpperCase(),
        schoolType: newSchoolType.trim().toUpperCase(),
        skuCode: newSchoolSkuCode.trim().toUpperCase(),
        createdAt: new Date() 
      });
      await batch.commit(); 
      setNewSchoolName(''); setNewSchoolIdCode(''); setNewSchoolType(''); setNewSchoolSkuCode('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleAddClothingTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newClothingTypeName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'clothingTypes')), { 
        name: newClothingTypeName.trim(), 
        skuCode: newClothingTypeSkuCode.trim().toUpperCase(), 
        createdAt: new Date() 
      });
      await batch.commit(); setNewClothingTypeName(''); setNewClothingTypeSkuCode('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleAddSizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newSizeName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'sizes')), {
        name: newSizeName.trim(),
        label: newSizeLabel.trim() || newSizeName.trim(),
        skuCode: newSizeSkuCode.trim().toUpperCase(), 
        createdAt: new Date()
      });
      await batch.commit();
      setNewSizeName(''); setNewSizeLabel(''); setNewSizeSkuCode('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleAddColourSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newColourName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'colours')), { 
        name: newColourName.trim(), 
        label: newColourLabel.trim() || newColourName.trim(),
        skuCode: newColourSkuCode.trim().toUpperCase(), 
        createdAt: new Date() 
      });
      await batch.commit(); setNewColourName(''); setNewColourLabel(''); setNewColourSkuCode('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleAddLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newLocationName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'locations')), { 
        name: newLocationName.trim(), 
        label: newLocationLabel.trim() || newLocationName.trim(),
        skuCode: newLocationSkuCode.trim(), 
        createdAt: new Date() 
      });
      await batch.commit(); setNewLocationName(''); setNewLocationLabel(''); setNewLocationSkuCode('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const startInlineEditingRow = (item: any) => {
    const idKey = item.id || item.docId;
    setEditingRowId(idKey);
    setEditFormFields({ ...item });
  };

  const cancelInlineEditingRow = () => {
    setEditingRowId(null);
    setEditFormFields({});
  };

    // ==========================================
  // 🎨 PART 5: NAVIGATION RIBBON & SEARCH LAYOUT UI
  // ==========================================
  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
      
      {/* Tab Navigation Ribbon */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
        {['categories', 'schoolTypes', 'schools', 'clothingTypes', 'sizes', 'colours', 'locations'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              cancelInlineEditingRow();
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all capitalize duration-150 ${
              activeTab === tab ? 'bg-[#00A896] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.replace(/([A-Z])/g, ' $1')}
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
            value={searchQueries[activeTab]}
            onChange={(e) => setSearchQueries(prev => ({ ...prev, [activeTab]: e.target.value }))}
            placeholder={`Search list...`}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A896] transition-all"
          />
        </div>

          {activeTab === 'categories' && (
            <div className="w-full">
              {/* ADD FORM - Remains the same */}
              <form onSubmit={handleAddCategorySubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newCatId} onChange={(e) => setNewCatId(e.target.value)} placeholder="Category ID" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newCatSkuPrefix} onChange={(e) => setNewCatSkuPrefix(e.target.value)} placeholder="SKU Prefix" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <select value={newCatPackagingType} onChange={(e) => setNewCatPackagingType(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-[#00A896]">
                  <option value="Both">Both</option> <option value="Single">Single</option> <option value="Bulk">Bulk</option>
                </select>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <input type="checkbox" checked={newCatHasSchools} onChange={(e) => setNewCatHasSchools(e.target.checked)} className="accent-[#00A896]" /> Has Schools
                  </label>
                  <button type="submit" className="bg-[#00A896] text-white px-3 py-1.5 rounded-lg text-xs font-bold">Add</button>
                </div>
              </form>

              {/* 🖥️ DESKTOP TABLE (Hidden on Mobile) */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2 px-4">Name</th> <th className="py-2 px-4">ID</th> <th className="py-2 px-4 text-[#FF6B35]">SKU</th> <th className="py-2 px-4">Pkg</th> <th className="py-2 px-4">Schools</th> <th className="py-2 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((cat) => {
                      const currentId = cat.id || cat.docId;
                      const isRowEditing = editingRowId === currentId;
                      return (
                        <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                          <td className="py-2 px-4">{isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold text-xs">{cat.name}</span>}</td>
                          <td className="py-2 px-4 text-slate-600 font-mono text-[10px]">{cat.id}</td>
                          <td className="py-2 px-4">{isRowEditing ? <input type="text" value={editFormFields.skuPrefix || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuPrefix: e.target.value }))} className="text-xs p-1 border rounded w-16 font-mono uppercase" /> : <span className="font-mono text-[10px] font-bold text-indigo-600">{cat.skuPrefix || '-'}</span>}</td>
                          <td className="py-2 px-4">{isRowEditing ? <select value={editFormFields.packagingType || 'Both'} onChange={(e) => setEditFormFields(prev => ({ ...prev, packagingType: e.target.value }))} className="text-xs p-1 border rounded bg-white"><option value="Both">Both</option><option value="Single">Single</option><option value="Bulk">Bulk</option></select> : <span className="text-slate-500 text-[10px]">{cat.packagingType || 'Both'}</span>}</td>
                          <td className="py-2 px-4">{isRowEditing ? <input type="checkbox" checked={editFormFields.hasSchools ?? true} onChange={(e) => setEditFormFields(prev => ({ ...prev, hasSchools: e.target.checked }))} className="accent-[#00A896]" /> : <span className="text-[10px]">{cat.hasSchools ? '✅' : '❌'}</span>}</td>
                          <td className="py-2 px-4 text-right">
                            {isRowEditing ? (
                              <div className="inline-flex gap-2">
                                <button type="button" onClick={() => handleSecureUpdateRecord('categories', cat, { name: editFormFields.name?.trim(), skuPrefix: editFormFields.skuPrefix?.trim().toUpperCase(), packagingType: editFormFields.packagingType, hasSchools: editFormFields.hasSchools })} className="text-[#00A896]"><Check className="w-4 h-4" /></button>
                                <button type="button" onClick={cancelInlineEditingRow} className="text-slate-400"><XCircle className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="inline-flex gap-3">
                                <button type="button" onClick={() => startInlineEditingRow(cat)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => handleSecureDeleteRecord('categories', cat.docId || cat.id, cat.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 📱 MOBILE CARD LIST (Hidden on Desktop) */}
              <div className="md:hidden space-y-3">
                {filteredCategories.map((cat) => {
                  const currentId = cat.id || cat.docId;
                  const isMobileEditing = editingRowId === currentId;

                  return (
                    <div key={currentId} className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3 ${isMobileEditing ? "bg-amber-50/40 border-amber-300" : "bg-white border-slate-200"}`}>
                      
                      <div className="w-full space-y-2">
                        {isMobileEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Category Name</label>
                              <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">SKU Prefix</label>
                              <input type="text" value={editFormFields.skuPrefix || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuPrefix: e.target.value }))} className="text-xs p-1.5 border rounded w-full font-mono uppercase bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Packaging</label>
                              <select value={editFormFields.packagingType || 'Both'} onChange={(e) => setEditFormFields(prev => ({ ...prev, packagingType: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white">
                                <option value="Both">Both</option>
                                <option value="Single">Single</option>
                                <option value="Bulk">Bulk</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <input type="checkbox" checked={editFormFields.hasSchools ?? true} onChange={(e) => setEditFormFields(prev => ({ ...prev, hasSchools: e.target.checked }))} className="accent-[#00A896] w-4 h-4" />
                              <label className="text-xs font-bold text-slate-600">Has Schools</label>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-sm text-slate-900">{cat.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1">ID: {cat.id} | SKU: <span className="font-mono text-indigo-600 font-bold">{cat.skuPrefix || '-'}</span></div>
                            <div className="text-[10px] font-bold mt-1 text-slate-700">{cat.packagingType} | {cat.hasSchools ? '✅ Has Schools' : '❌ No Schools'}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* ACTION BUTTONS Container */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                        {isMobileEditing ? (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => handleSecureUpdateRecord('categories', cat, { name: editFormFields.name?.trim(), skuPrefix: editFormFields.skuPrefix?.trim().toUpperCase(), packagingType: editFormFields.packagingType, hasSchools: editFormFields.hasSchools })} className="p-2 bg-[#00A896] text-white rounded-lg"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={cancelInlineEditingRow} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => startInlineEditingRow(cat)} className="text-[#00A896] p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100"><Edit3 className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleSecureDeleteRecord('categories', cat.docId || cat.id, cat.name)} className="text-[#FF6B35] p-2 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'sizes' && (
            <div className="w-full">
              {/* ADD FORM */}
              <form onSubmit={handleAddSizeSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="text" value={newSizeName} onChange={(e) => setNewSizeName(e.target.value)} placeholder="Size Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newSizeLabel} onChange={(e) => setNewSizeLabel(e.target.value)} placeholder="Label" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newSizeSkuCode} onChange={(e) => setNewSizeSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save New Size</button>
              </form>

              {/* 🖥️ DESKTOP TABLE */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2 px-4">Name</th> <th className="py-2 px-4">Label</th> <th className="py-2 px-4 text-[#FF6B35]">SKU</th> <th className="py-2 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSizes.map((sz) => {
                      const currentId = sz.id || sz.docId;
                      const isRowEditing = editingRowId === currentId;
                      return (
                        <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                          <td className="py-2 px-4">{isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{sz.name}</span>}</td>
                          <td className="py-2 px-4">{isRowEditing ? <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="text-slate-600">{sz.label}</span>}</td>
                          <td className="py-2 px-4">{isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-20 font-mono uppercase" /> : <span className="font-mono text-xs font-bold text-indigo-600">{sz.skuCode || 'NONE'}</span>}</td>
                          <td className="py-2 px-4 text-right">
                            {isRowEditing ? (
                              <div className="inline-flex gap-2">
                                <button type="button" onClick={() => handleSecureUpdateRecord('sizes', sz, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <div className="inline-flex gap-3">
                                <button type="button" onClick={() => startInlineEditingRow(sz)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => handleSecureDeleteRecord('sizes', sz.docId || sz.id, sz.name)} className="text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 📱 MOBILE CARD LIST (Hidden on Desktop) */}
              <div className="md:hidden space-y-3">
                {filteredSizes.map((sz) => {
                  const currentId = sz.id || sz.docId;
                  const isMobileEditing = editingRowId === currentId;

                  return (
                    <div key={currentId} className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3 ${isMobileEditing ? "bg-amber-50/40 border-amber-300" : "bg-white border-slate-200"}`}>
                      
                      {/* CARD CONTENT / INPUT FIELDS SWITCH */}
                      <div className="w-full space-y-2">
                        {isMobileEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Size Name</label>
                              <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Label</label>
                              <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">SKU Code</label>
                              <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1.5 border rounded w-full font-mono uppercase bg-white" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-sm text-slate-900">{sz.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Label: {sz.label} | SKU: <span className="font-mono text-indigo-600 font-bold">{sz.skuCode || 'NONE'}</span></div>
                          </div>
                        )}
                      </div>
                      
                      {/* ACTION BUTTONS Container */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                        {isMobileEditing ? (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => handleSecureUpdateRecord('sizes', sz, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-2 bg-[#00A896] text-white rounded-lg"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={cancelInlineEditingRow} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => startInlineEditingRow(sz)} className="text-[#00A896] p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100"><Edit3 className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleSecureDeleteRecord('sizes', sz.docId || sz.id, sz.name)} className="text-[#FF6B35] p-2 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'schoolTypes' && (
            <div>
              <form onSubmit={handleAddSchoolTypeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="text" value={newSchoolTypeName} onChange={(e) => setNewSchoolTypeName(e.target.value)} placeholder="School Type Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newSchoolTypeSkuCode} onChange={(e) => setNewSchoolTypeSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Add Type</button>
              </form>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchoolTypes.map((st) => {
                    const currentId = st.id || st.docId;
                    const isRowEditing = editingRowId === currentId;

                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{st.name}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono uppercase" /> : <span className="font-mono text-xs font-bold text-indigo-600">{st.skuCode || '-'}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('schoolTypes', st, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(st)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('schoolTypes', st.docId || st.id, st.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'schools' && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden w-full">
              {/* 🖥️ PC TABLE HEADER (Hidden on mobile) */}
              <div className="hidden md:grid grid-cols-5 gap-4 p-4 bg-slate-50 font-black text-slate-500 uppercase text-[10px] border-b">
                <div>Name</div>
                <div>ID Code</div>
                <div>Type</div>
                <div className="text-[#FF6B35]">SKU Code</div>
                <div className="text-right">Actions</div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredSchools.map((sch) => {
                  const currentId = sch.id || sch.docId;
                  const isRowEditing = editingRowId === currentId;

                  return (
                    <div key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                      
                      {/* 🖥️ PC ROW (Hidden on mobile) */}
                      <div className="hidden md:grid grid-cols-5 gap-4 p-4 items-center text-xs text-slate-700">
                        <div>
                          {isRowEditing ? (
                            <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" />
                          ) : (
                            <span className="font-semibold">{sch.name}</span>
                          )}
                        </div>
                        <div>
                          {isRowEditing ? (
                            <input type="text" value={editFormFields.schoolIdCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, schoolIdCode: e.target.value }))} className="text-xs p-1 border rounded w-full font-mono uppercase bg-white" />
                          ) : (
                            <span className="font-mono">{sch.schoolIdCode || '-'}</span>
                          )}
                        </div>
                        <div>
                          {isRowEditing ? (
                            <input type="text" value={editFormFields.schoolType || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, schoolType: e.target.value }))} className="text-xs p-1 border rounded w-full uppercase bg-white" />
                          ) : (
                            <span>{sch.schoolType || '-'}</span>
                          )}
                        </div>
                        <div>
                          {isRowEditing ? (
                            <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-full font-mono uppercase bg-white" />
                          ) : (
                            <span className="font-mono font-bold text-indigo-600">{sch.skuCode || '-'}</span>
                          )}
                        </div>
                        <div className="text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2 justify-end">
                              <button type="button" onClick={() => handleSecureUpdateRecord('schools', sch, { name: editFormFields.name?.trim(), schoolIdCode: editFormFields.schoolIdCode?.trim().toUpperCase(), schoolType: editFormFields.schoolType?.trim().toUpperCase(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3 justify-end">
                              <button type="button" onClick={() => startInlineEditingRow(sch)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('schools', sch.docId || sch.id, sch.name)} className="text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 📱 MOBILE CARD (Visible only on mobile) */}
                      <div className="md:hidden p-4 flex flex-col gap-3">
                        <div className="w-full space-y-2">
                          {isRowEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">School Name</label>
                                <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">ID Code</label>
                                <input type="text" value={editFormFields.schoolIdCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, schoolIdCode: e.target.value }))} className="text-xs p-1.5 border rounded w-full font-mono uppercase bg-white" />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">School Type</label>
                                <input type="text" value={editFormFields.schoolType || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, schoolType: e.target.value }))} className="text-xs p-1.5 border rounded w-full uppercase bg-white" />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">SKU Code</label>
                                <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1.5 border rounded w-full font-mono uppercase bg-white" />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-sm text-slate-900">{sch.name}</div>
                              <div className="text-[11px] text-slate-500 mt-1">ID: {sch.schoolIdCode || '-'} | Type: {sch.schoolType || '-'}</div>
                              <div className="text-[10px] font-mono text-indigo-600 mt-2">SKU: {sch.skuCode || '-'}</div>
                            </div>
                          )}
                        </div>

                        {/* ACTION BUTTONS Container */}
                        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('schools', sch, { name: editFormFields.name?.trim(), schoolIdCode: editFormFields.schoolIdCode?.trim().toUpperCase(), schoolType: editFormFields.schoolType?.trim().toUpperCase(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-2 bg-[#00A896] text-white rounded-lg"><Check className="w-4 h-4" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><XCircle className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => startInlineEditingRow(sch)} className="text-[#00A896] p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100"><Edit3 className="w-4 h-4" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('schools', sch.docId || sch.id, sch.name)} className="text-[#FF6B35] p-2 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'clothingTypes' && (
            <div className="w-full">
              {/* ADD FORM */}
              <form onSubmit={handleAddClothingTypeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="text" value={newClothingTypeName} onChange={(e) => setNewClothingTypeName(e.target.value)} placeholder="Clothing Type Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newClothingTypeSkuCode} onChange={(e) => setNewClothingTypeSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Add Clothing Type</button>
              </form>

              {/* 🖥️ DESKTOP TABLE (Hidden on Mobile) */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2 px-4">Name</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> <th className="py-2 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClothingTypes.map((ct) => {
                      const currentId = ct.id || ct.docId;
                      const isRowEditing = editingRowId === currentId;

                      return (
                        <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                          <td className="py-2 px-4">
                            {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{ct.name}</span>}
                          </td>
                          <td className="py-2 px-4">
                            {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono uppercase bg-white" /> : <span className="font-mono text-xs font-bold text-indigo-600">{ct.skuCode || '-'}</span>}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {isRowEditing ? (
                              <div className="inline-flex gap-2">
                                <button type="button" onClick={() => handleSecureUpdateRecord('clothingTypes', ct, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <div className="inline-flex gap-3">
                                <button type="button" onClick={() => startInlineEditingRow(ct)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => handleSecureDeleteRecord('clothingTypes', ct.docId || ct.id, ct.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 📱 MOBILE CARD LIST (Hidden on Desktop) */}
              <div className="md:hidden space-y-3">
                {filteredClothingTypes.map((ct) => {
                  const currentId = ct.id || ct.docId;
                  const isMobileEditing = editingRowId === currentId;

                  return (
                    <div key={currentId} className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3 ${isMobileEditing ? "bg-amber-50/40 border-amber-300" : "bg-white border-slate-200"}`}>
                      
                      {/* CARD CONTENT / INPUT FIELDS SWITCH */}
                      <div className="w-full space-y-2">
                        {isMobileEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Clothing Type Name</label>
                              <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">SKU Code</label>
                              <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1.5 border rounded w-full font-mono uppercase bg-white" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-sm text-slate-900">{ct.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1">SKU: <span className="font-mono text-indigo-600 font-bold">{ct.skuCode || '-'}</span></div>
                          </div>
                        )}
                      </div>
                      
                      {/* ACTION BUTTONS Container */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                        {isMobileEditing ? (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => handleSecureUpdateRecord('clothingTypes', ct, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-2 bg-[#00A896] text-white rounded-lg"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={cancelInlineEditingRow} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => startInlineEditingRow(ct)} className="text-[#00A896] p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100"><Edit3 className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleSecureDeleteRecord('clothingTypes', ct.docId || ct.id, ct.name)} className="text-[#FF6B35] p-2 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'colours' && (
            <div className="w-full">
              {/* ADD FORM */}
              <form onSubmit={handleAddColourSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="text" value={newColourName} onChange={(e) => setNewColourName(e.target.value)} placeholder="Colour Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newColourSkuCode} onChange={(e) => setNewColourSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Add Colour</button>
              </form>

              {/* 🖥️ DESKTOP TABLE (Hidden on Mobile) */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2 px-4">Name</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> <th className="py-2 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredColours.map((c) => {
                      const currentId = c.id || c.docId;
                      const isRowEditing = editingRowId === currentId;

                      return (
                        <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                          <td className="py-2 px-4">
                            {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full bg-white" /> : <span className="font-semibold">{c.name}</span>}
                          </td>
                          <td className="py-2 px-4">
                            {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono uppercase bg-white" /> : <span className="font-mono text-xs font-bold text-indigo-600">{c.skuCode || '-'}</span>}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {isRowEditing ? (
                              <div className="inline-flex gap-2">
                                <button type="button" onClick={() => handleSecureUpdateRecord('colours', c, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <div className="inline-flex gap-3">
                                <button type="button" onClick={() => startInlineEditingRow(c)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => handleSecureDeleteRecord('colours', c.docId || c.id, c.name)} className="text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 📱 MOBILE CARD LIST (Hidden on Desktop) */}
              <div className="md:hidden space-y-3">
                {filteredColours.map((c) => {
                  const currentId = c.id || c.docId;
                  const isMobileEditing = editingRowId === currentId;

                  return (
                    <div key={currentId} className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3 ${isMobileEditing ? "bg-amber-50/40 border-amber-300" : "bg-white border-slate-200"}`}>
                      
                      {/* CARD CONTENT / INPUT FIELDS SWITCH */}
                      <div className="w-full space-y-2">
                        {isMobileEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Colour Name</label>
                              <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">SKU Code</label>
                              <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1.5 border rounded w-full font-mono uppercase bg-white" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-sm text-slate-900">{c.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1">SKU: <span className="font-mono text-indigo-600 font-bold">{c.skuCode || '-'}</span></div>
                          </div>
                        )}
                      </div>
                      
                      {/* ACTION BUTTONS Container */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                        {isMobileEditing ? (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => handleSecureUpdateRecord('colours', c, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-2 bg-[#00A896] text-white rounded-lg"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={cancelInlineEditingRow} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => startInlineEditingRow(c)} className="text-[#00A896] p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100"><Edit3 className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleSecureDeleteRecord('colours', c.docId || c.id, c.name)} className="text-[#FF6B35] p-2 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="w-full">
              {/* ADD FORM */}
              <form onSubmit={handleAddLocationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="text" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="Location Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newLocationLabel} onChange={(e) => setNewLocationLabel(e.target.value)} placeholder="Label (e.g., WH-1)" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newLocationSkuCode} onChange={(e) => setNewLocationSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save Location</button>
              </form>

              {/* 🖥️ DESKTOP TABLE (Hidden on Mobile) */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
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
                    {filteredLocations.map((loc) => {
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
                                <button type="button" onClick={() => handleSecureUpdateRecord('locations', loc, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <div className="inline-flex gap-3">
                                <button type="button" onClick={() => startInlineEditingRow(loc)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => handleSecureDeleteRecord('locations', loc.docId || loc.id, loc.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 📱 MOBILE CARD LIST (Hidden on Desktop) */}
              <div className="md:hidden space-y-3">
                {filteredLocations.map((loc) => {
                  const currentId = loc.id || loc.docId;
                  const isMobileEditing = editingRowId === currentId;

                  return (
                    <div key={currentId} className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-3 ${isMobileEditing ? "bg-amber-50/40 border-amber-300" : "bg-white border-slate-200"}`}>
                      
                      {/* CARD CONTENT / INPUT FIELDS SWITCH */}
                      <div className="w-full space-y-2">
                        {isMobileEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Location Name</label>
                              <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Label</label>
                              <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="text-xs p-1.5 border rounded w-full bg-white" />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">SKU Code</label>
                              <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1.5 border rounded w-full font-mono uppercase bg-white" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-sm text-slate-900">{loc.name}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Label: {loc.label || '-'} | SKU: <span className="font-mono text-indigo-600 font-bold">{loc.skuCode || '-'}</span></div>
                          </div>
                        )}
                      </div>
                      
                      {/* ACTION BUTTONS Container */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                        {isMobileEditing ? (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => handleSecureUpdateRecord('locations', loc, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-2 bg-[#00A896] text-white rounded-lg"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={cancelInlineEditingRow} className="p-2 bg-slate-200 text-slate-600 rounded-lg"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => startInlineEditingRow(loc)} className="text-[#00A896] p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100"><Edit3 className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleSecureDeleteRecord('locations', loc.docId || loc.id, loc.name)} className="text-[#FF6B35] p-2 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          </div>
    </div>
  );
}