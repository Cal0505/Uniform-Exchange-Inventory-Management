// ==========================================
// 🚀 PART 1: FILE HEADERS AND COMPONENT STATE
// ==========================================
import React, { useState, useMemo } from 'react';
import { Trash2, Search, PlusCircle, Edit3, XCircle, Check, ArrowUp, ArrowDown } from 'lucide-react';
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
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  activeTab,
  setActiveTab,
  userRole,
  forcedSubTabOverride
}: ManagementDashboardProps) {
  // Form Submission States (activeTab is now managed via props)
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
  const [selectedSchoolTypes, setSelectedSchoolTypes] = useState<string[]>([]); // New State for Multi-Select
  const [editSelectedSchoolTypes, setEditSelectedSchoolTypes] = useState<string[]>([]);

  // Clothing Types Form States
  const [newClothingTypeName, setNewClothingTypeName] = useState<string>('');
  const [newClothingTypeSkuCode, setNewClothingTypeSkuCode] = useState<string>('');
  const [newClothingTypeFlags, setNewClothingTypeFlags] = useState({ logo: true, plain: true, new: true });

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
  // ⚡ DYNAMIC SCHOOL TYPE LOGIC
  // ==========================================
  const orderedSchoolTypes = useMemo(() => {
    return [...schoolTypes].sort((a, b) => {
      const orderA = Number(a.sortOrder ?? 0);
      const orderB = Number(b.sortOrder ?? 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [schoolTypes]);

  const nextSchoolTypeSortOrder = useMemo(() => {
    const maxSort = orderedSchoolTypes.reduce((maxValue, item) => {
      const order = Number(item.sortOrder ?? 0);
      return Math.max(maxValue, order);
    }, 0);
    return maxSort + 10;
  }, [orderedSchoolTypes]);

  const handleToggleSchoolType = (typeName: string) => {
    setSelectedSchoolTypes(prev => {
      const next = prev.includes(typeName) ? prev.filter(t => t !== typeName) : [...prev, typeName];
      const sortedNext = [...next].sort((a, b) => {
        const indexA = orderedSchoolTypes.findIndex(st => st.name === a);
        const indexB = orderedSchoolTypes.findIndex(st => st.name === b);
        return indexA - indexB;
      });
      const combinedType = sortedNext.map(t => t.charAt(0).toUpperCase()).join('');
      setNewSchoolType(combinedType);
      return sortedNext;
    });
  };

  const parseSchoolTypeCodeToNames = (schoolTypeCode: string) => {
    const codeLetters = schoolTypeCode.trim().toUpperCase().split('');
    const result: string[] = [];
    codeLetters.forEach(letter => {
      const match = orderedSchoolTypes.find(st => (st.name || '').charAt(0).toUpperCase() === letter);
      if (match && !result.includes(match.name)) {
        result.push(match.name);
      }
    });
    return result;
  };

  const handleToggleEditSchoolType = (typeName: string) => {
    setEditSelectedSchoolTypes(prev => {
      const next = prev.includes(typeName) ? prev.filter(t => t !== typeName) : [...prev, typeName];
      const sortedNext = [...next].sort((a, b) => {
        const indexA = orderedSchoolTypes.findIndex(st => st.name === a);
        const indexB = orderedSchoolTypes.findIndex(st => st.name === b);
        return indexA - indexB;
      });
      const combinedType = sortedNext.map(t => t.charAt(0).toUpperCase()).join('');
      setEditFormFields(prev => ({ ...prev, schoolType: combinedType }));
      return sortedNext;
    });
  };

  const handleShiftSchoolTypeOrder = async (docId: string, direction: 'up' | 'down') => {
    try {
      setIsSubmitting(true);
      const currentList = [...orderedSchoolTypes];
      const currentIndex = currentList.findIndex((item) => item.docId === docId || item.id === docId);
      if (currentIndex === -1) return;
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= currentList.length) return;

      const [itemToMove] = currentList.splice(currentIndex, 1);
      currentList.splice(nextIndex, 0, itemToMove);

      const batch = writeBatch(db);
      currentList.forEach((item, index) => {
        const newOrder = (index + 1) * 10;
        if (Number(item.sortOrder ?? 0) !== newOrder) {
          batch.update(doc(db, 'schoolTypes', item.docId || item.id), { sortOrder: newOrder });
        }
      });

      await batch.commit();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 🔒 PART 2:A SECURE UNIVERSAL DEPENDENCY CHECK
  // ==========================================
  const handleSecureDeleteRecord = async (collectionName: string, docId: string, label: string) => {
    try {
      setIsSubmitting(true);

      let entityReadableName = 'Item';
      if (collectionName === 'categories') entityReadableName = 'Category';
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
    } 
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

      // Resolve actual Firestore document id when only business `id` or `name` is present
      let trueFirestoreDocId = trueDocId;
      if (!originalItem?.docId) {
        const dbSearchQuery = query(collection(db, collectionName), where('id', '==', trueDocId));
        const dbSearchSnapshot = await getDocs(dbSearchQuery);
        if (!dbSearchSnapshot.empty) {
          trueFirestoreDocId = dbSearchSnapshot.docs[0].id;
        } else {
          const dbNameSearchQuery = query(collection(db, collectionName), where('name', '==', originalLabel));
          const dbNameSearchSnapshot = await getDocs(dbNameSearchQuery);
          if (!dbNameSearchSnapshot.empty) {
            trueFirestoreDocId = dbNameSearchSnapshot.docs[0].id;
          }
        }
      }
      if (!trueFirestoreDocId) trueFirestoreDocId = trueDocId;

      const batch = writeBatch(db);
      const docRef = doc(db, collectionName, trueFirestoreDocId);

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
  const filteredSchoolTypes = useMemo(() => {
    return schoolTypes
      .filter(st => (st.name || '').toLowerCase().includes(searchQueries.schoolTypes.toLowerCase()))
      .sort((a, b) => {
        const orderA = Number(a.sortOrder ?? 0);
        const orderB = Number(b.sortOrder ?? 0);
        if (orderA !== orderB) return orderA - orderB;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [schoolTypes, searchQueries.schoolTypes]);
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
        sortOrder: nextSchoolTypeSortOrder,
        createdAt: new Date() 
      });
      await batch.commit(); setNewSchoolTypeName(''); setNewSchoolTypeSkuCode('');
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const autoGeneratedSchoolSkuCode = useMemo(() => {
    const typeCode = newSchoolType.trim().toUpperCase();
    const idCode = newSchoolIdCode.trim().toUpperCase();
    if (!typeCode || !idCode) return '';
    return `${typeCode}${idCode}`;
  }, [newSchoolType, newSchoolIdCode]);

  const handleAddSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newSchoolName.trim()) return;
    try {
      setIsSubmitting(true);
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'schools')), { 
        name: newSchoolName.trim(), 
        schoolIdCode: newSchoolIdCode.trim().toUpperCase(),
        schoolType: newSchoolType.trim().toUpperCase(),
        skuCode: autoGeneratedSchoolSkuCode,
        createdAt: new Date() 
      });
      await batch.commit(); 
      
      // Clear forms and reset pills
      setNewSchoolName(''); 
      setNewSchoolIdCode(''); 
      setNewSchoolType(''); 
      setSelectedSchoolTypes([]); 
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
        logo: newClothingTypeFlags.logo,
        plain: newClothingTypeFlags.plain,
        new: newClothingTypeFlags.new,
        createdAt: new Date()
      });
      await batch.commit();
      setNewClothingTypeName('');
      setNewClothingTypeSkuCode('');
      setNewClothingTypeFlags({ logo: true, plain: true, new: true });
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
    if (item.schoolType) {
      setEditSelectedSchoolTypes(parseSchoolTypeCodeToNames(item.schoolType));
    } else {
      setEditSelectedSchoolTypes([]);
    }
  };

  const cancelInlineEditingRow = () => {
    setEditingRowId(null);
    setEditFormFields({});
    setEditSelectedSchoolTypes([]);
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
            {tab === 'schools' ? 'School Registry' : tab.replace(/([A-Z])/g, ' $1')}
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

        {/* ==========================================
           📑 SUB-Category (CATEGORY)
           ========================================== */}
        {activeTab === 'categories' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Categories</h3>
              <p className="text-xs text-slate-500">Manage Categories to group inventory Lists (EG Logo, Plain) and control each Catergory if it handles Single(Loose) items or VacPac(boxs, or other containers) and has a School tied to it.</p>
            </div>
            <form onSubmit={handleAddCategorySubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newCatId} onChange={(e) => setNewCatId(e.target.value)} placeholder="Category ID" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newCatSkuPrefix} onChange={(e) => setNewCatSkuPrefix(e.target.value)} placeholder="SKU Prefix" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <select value={newCatPackagingType} onChange={(e) => setNewCatPackagingType(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-[#00A896]">
                <option value="Both">Both</option> <option value="Single">Single</option> <option value="VacPac">VacPac</option>
              </select>
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <input type="checkbox" checked={newCatHasSchools} onChange={(e) => setNewCatHasSchools(e.target.checked)} className="accent-[#00A896]" /> Has Schools
                </label>
                <button type="submit" className="bg-[#00A896] text-white px-3 py-1.5 rounded-lg text-xs font-bold">Add</button>
              </div>
            </form>

            <div className="hidden md:block">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th> <th className="py-2 px-4">ID</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Prefix</th> <th className="py-2 px-4">Packaging</th> <th className="py-2 px-4">Schools</th> <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategories.map((cat) => {
                    const currentId = cat.id || cat.docId;
                    const isRowEditing = editingRowId === currentId;

                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{cat.name}</span>}
                        </td>
                        <td className="py-2 px-4 text-slate-600 font-mono text-xs">{cat.id}</td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.skuPrefix || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuPrefix: e.target.value }))} className="text-xs p-1 border rounded w-24 font-mono uppercase" /> : <span className="font-mono text-xs font-bold text-indigo-600">{cat.skuPrefix || '-'}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? (
                            <select value={editFormFields.packagingType || 'Both'} onChange={(e) => setEditFormFields(prev => ({ ...prev, packagingType: e.target.value }))} className="text-xs p-1 border rounded bg-white">
                              <option value="Both">Both</option> <option value="Single">Single</option> <option value="VacPac">VacPac</option>
                            </select>
                          ) : <span className="text-slate-500 text-xs">{cat.packagingType || 'Both'}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="checkbox" checked={editFormFields.hasSchools ?? true} onChange={(e) => setEditFormFields(prev => ({ ...prev, hasSchools: e.target.checked }))} className="accent-[#00A896]" /> : <span>{cat.hasSchools ? '✅ True' : '❌ False'}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('categories', cat, { name: editFormFields.name?.trim(), skuPrefix: editFormFields.skuPrefix?.trim().toUpperCase(), packagingType: editFormFields.packagingType, hasSchools: editFormFields.hasSchools })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
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

            <div className="md:hidden space-y-3">
              {filteredCategories.map((cat) => {
                const currentId = cat.id || cat.docId;
                const isRowEditing = editingRowId === currentId;

                return (
                  <div key={currentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Category</p>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="mt-2 w-full text-sm p-2 border rounded-xl bg-white font-black text-slate-900" />
                        ) : (
                          <h4 className="mt-1 text-sm font-black text-slate-900 truncate">{cat.name}</h4>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => startInlineEditingRow(cat)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleSecureDeleteRecord('categories', cat.docId || cat.id, cat.name)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">ID</span>
                        <span className="mt-1 block font-black text-slate-800">{cat.id || '-'}</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">SKU</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.skuPrefix || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuPrefix: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded font-mono uppercase bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-black text-indigo-700">{cat.skuPrefix || '-'}</span>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Packaging</span>
                        {isRowEditing ? (
                          <select value={editFormFields.packagingType || 'Both'} onChange={(e) => setEditFormFields(prev => ({ ...prev, packagingType: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded bg-slate-50">
                            <option value="Both">Both</option> <option value="Single">Single</option> <option value="VacPac">VacPac</option>
                          </select>
                        ) : (
                          <span className="mt-1 block font-black text-slate-800">{cat.packagingType || 'Both'}</span>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Schools</span>
                        {isRowEditing ? (
                          <label className="mt-1 flex items-center gap-2 text-slate-700 font-bold"><input type="checkbox" checked={editFormFields.hasSchools ?? true} onChange={(e) => setEditFormFields(prev => ({ ...prev, hasSchools: e.target.checked }))} className="accent-[#00A896]" />Has Schools</label>
                        ) : (
                          <span className="mt-1 block font-black text-slate-800">{cat.hasSchools ? '✅ Has Schools' : '❌ No Schools'}</span>
                        )}
                      </div>
                    </div>

                    {isRowEditing && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => handleSecureUpdateRecord('categories', cat, { name: editFormFields.name?.trim(), skuPrefix: editFormFields.skuPrefix?.trim().toUpperCase(), packagingType: editFormFields.packagingType, hasSchools: editFormFields.hasSchools })} className="px-3 py-1.5 rounded-lg bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider">Save</button>
                        <button type="button" onClick={cancelInlineEditingRow} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
           📑 SUB-Category (SIZE)
           ========================================== */}
        {activeTab === 'sizes' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Sizes</h3>
              <p className="text-xs text-slate-500">Create and edit size options and labels used across garments and categories.</p>
            </div>
            <form onSubmit={handleAddSizeSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newSizeName} onChange={(e) => setNewSizeName(e.target.value)} placeholder="Size Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newSizeLabel} onChange={(e) => setNewSizeLabel(e.target.value)} placeholder="Label" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newSizeSkuCode} onChange={(e) => setNewSizeSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Save New Size</button>
            </form>

            <div className="hidden md:block">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th> <th className="py-2 px-4">Label</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSizes.map((sz) => {
                    const currentId = sz.id || sz.docId;
                    const isRowEditing = editingRowId === currentId;

                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{sz.name}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="text-slate-600">{sz.label}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono uppercase" /> : <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded inline-block">{sz.skuCode || 'NONE'}</span>}
                        </td>
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

            <div className="md:hidden space-y-3">
              {filteredSizes.map((sz) => {
                const currentId = sz.id || sz.docId;
                const isRowEditing = editingRowId === currentId;

                return (
                  <div key={currentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Size</p>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="mt-2 w-full text-sm p-2 border rounded-xl bg-white font-black text-slate-900" />
                        ) : (
                          <h4 className="mt-1 text-sm font-black text-slate-900">{sz.name}</h4>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => startInlineEditingRow(sz)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleSecureDeleteRecord('sizes', sz.docId || sz.id, sz.name)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Label</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-black text-slate-800">{sz.label}</span>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">SKU</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded font-mono uppercase bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-mono font-black text-indigo-700">{sz.skuCode || 'NONE'}</span>
                        )}
                      </div>
                    </div>

                    {isRowEditing && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => handleSecureUpdateRecord('sizes', sz, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="px-3 py-1.5 rounded-lg bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider">Save</button>
                        <button type="button" onClick={cancelInlineEditingRow} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
           📑 SUB-Category (SCHOOL_TYPE)
           ========================================== */}
        {activeTab === 'schoolTypes' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">School Types</h3>
              <p className="text-xs text-slate-500">Configure school type profiles and their SKU codes; order determines display priority.</p>
            </div>
            <form onSubmit={handleAddSchoolTypeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newSchoolTypeName} onChange={(e) => setNewSchoolTypeName(e.target.value)} placeholder="School Type Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newSchoolTypeSkuCode} onChange={(e) => setNewSchoolTypeSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Add Type</button>
            </form>
            <div className="hidden md:block">
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
                            <div className="inline-flex gap-2 items-center">
                              <button type="button" onClick={() => handleSecureUpdateRecord('schoolTypes', st, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-2 items-center justify-end">
                              <button type="button" onClick={() => handleShiftSchoolTypeOrder(st.docId || st.id, 'up')} className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleShiftSchoolTypeOrder(st.docId || st.id, 'down')} className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><ArrowDown className="w-3.5 h-3.5" /></button>
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

            <div className="md:hidden space-y-3">
              {filteredSchoolTypes.map((st) => {
                const currentId = st.id || st.docId;
                const isRowEditing = editingRowId === currentId;

                return (
                  <div key={currentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Type</p>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="mt-2 w-full text-sm p-2 border rounded-xl bg-white font-black text-slate-900" />
                        ) : (
                          <h4 className="mt-1 text-sm font-black text-slate-900">{st.name}</h4>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => handleShiftSchoolTypeOrder(st.docId || st.id, 'up')} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleShiftSchoolTypeOrder(st.docId || st.id, 'down')} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">SKU</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded font-mono uppercase bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-mono font-black text-indigo-700">{st.skuCode || '-'}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => startInlineEditingRow(st)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleSecureDeleteRecord('schoolTypes', st.docId || st.id, st.name)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    {isRowEditing && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => handleSecureUpdateRecord('schoolTypes', st, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="px-3 py-1.5 rounded-lg bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider">Save</button>
                        <button type="button" onClick={cancelInlineEditingRow} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
           📑 SUB-Category (SCHOOL)
           ========================================== */}
        {activeTab === 'schools' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">School Registry</h3>
              <p className="text-xs text-slate-500">Register and manage schools. Select types to generate the combined school SKU automatically.</p>
            </div>
            <form onSubmit={handleAddSchoolSubmit} className="flex flex-col gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              
              {/* Dynamic Pill Multi-Selector */}
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="w-full text-[10px] uppercase font-bold text-slate-500 mb-1">Select School Types:</span>
                {orderedSchoolTypes.map((st) => (
                  <button
                    key={st.id || st.docId}
                    type="button"
                    onClick={() => handleToggleSchoolType(st.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedSchoolTypes.includes(st.name)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>

              {/* Standard Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} placeholder="School Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <input type="text" value={newSchoolIdCode} onChange={(e) => setNewSchoolIdCode(e.target.value)} placeholder="ID Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
                <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-[#008f80]">Register</button>
              </div>
            </form>

            <div className="hidden md:block">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th> <th className="py-2 px-4">ID Code</th> <th className="py-2 px-4">School Type</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchools.map((sch) => {
                    const currentId = sch.id || sch.docId;
                    const isRowEditing = editingRowId === currentId;

                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{sch.name}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.schoolIdCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, schoolIdCode: e.target.value }))} className="text-xs p-1 border rounded w-full font-mono uppercase" /> : <span className="font-mono text-xs">{sch.schoolIdCode || '-'}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? (
                            <div className="flex flex-wrap gap-2">
                              {orderedSchoolTypes.map((st) => (
                                <button
                                  key={st.id || st.docId}
                                  type="button"
                                  onClick={() => handleToggleEditSchoolType(st.name)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                    editSelectedSchoolTypes.includes(st.name)
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {st.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs font-bold">{sch.schoolType || '-'}</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? (
                            <input
                              type="text"
                              readOnly
                              value={`${(editFormFields.schoolType || sch.schoolType || '').trim().toUpperCase()}${(editFormFields.schoolIdCode || sch.schoolIdCode || '').trim().toUpperCase()}`}
                              className="text-xs p-1 border rounded w-full font-mono uppercase bg-slate-100 text-slate-500"
                            />
                          ) : (
                            <span className="font-mono text-xs font-bold text-indigo-600">{sch.skuCode || '-'}</span>
                          )}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => {
                                const updatedSchoolType = editFormFields.schoolType?.trim().toUpperCase() || sch.schoolType || '';
                                const updatedSchoolIdCode = editFormFields.schoolIdCode?.trim().toUpperCase() || sch.schoolIdCode || '';
                                const updatedSkuCode = `${updatedSchoolType}${updatedSchoolIdCode}`;
                                handleSecureUpdateRecord('schools', sch, {
                                  name: editFormFields.name?.trim(),
                                  schoolIdCode: updatedSchoolIdCode,
                                  schoolType: updatedSchoolType,
                                  skuCode: updatedSkuCode
                                });
                              }} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(sch)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('schools', sch.docId || sch.id, sch.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {filteredSchools.map((sch) => {
                const currentId = sch.id || sch.docId;
                const isRowEditing = editingRowId === currentId;

                return (
                  <div key={currentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">School</p>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="mt-2 w-full text-sm p-2 border rounded-xl bg-white font-black text-slate-900" />
                        ) : (
                          <h4 className="mt-1 text-sm font-black text-slate-900 truncate">{sch.name}</h4>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => startInlineEditingRow(sch)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleSecureDeleteRecord('schools', sch.docId || sch.id, sch.name)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">ID Code</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.schoolIdCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, schoolIdCode: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded font-mono uppercase bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-mono font-black text-slate-800">{sch.schoolIdCode || '-'}</span>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Type</span>
                        <span className="mt-1 block font-black text-slate-800">{sch.schoolType || '-'}</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">SKU</span>
                        <span className="mt-1 block font-mono font-black text-indigo-700">{sch.skuCode || '-'}</span>
                      </div>
                    </div>

                    {isRowEditing && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => {
                          const updatedSchoolType = editFormFields.schoolType?.trim().toUpperCase() || sch.schoolType || '';
                          const updatedSchoolIdCode = editFormFields.schoolIdCode?.trim().toUpperCase() || sch.schoolIdCode || '';
                          const updatedSkuCode = `${updatedSchoolType}${updatedSchoolIdCode}`;
                          handleSecureUpdateRecord('schools', sch, {
                            name: editFormFields.name?.trim(),
                            schoolIdCode: updatedSchoolIdCode,
                            schoolType: updatedSchoolType,
                            skuCode: updatedSkuCode
                          });
                        }} className="px-3 py-1.5 rounded-lg bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider">Save</button>
                        <button type="button" onClick={cancelInlineEditingRow} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
           📑 SUB-Category (Clothin_Type)
           ========================================== */}
        {activeTab === 'clothingTypes' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Garment Types</h3>
              <p className="text-xs text-slate-500">Manage garment types used to classify inventory (e.g., shirts, trousers).</p>
            </div>
            <form onSubmit={handleAddClothingTypeSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newClothingTypeName} onChange={(e) => setNewClothingTypeName(e.target.value)} placeholder="Garment Type Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newClothingTypeSkuCode} onChange={(e) => setNewClothingTypeSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <div className="flex items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white px-2 py-2">
                {(['logo', 'plain', 'new'] as const).map((flag) => (
                  <label key={flag} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    <input
                      type="checkbox"
                      checked={newClothingTypeFlags[flag]}
                      onChange={(e) => setNewClothingTypeFlags(prev => ({ ...prev, [flag]: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-[#00A896]"
                    />
                    {flag}
                  </label>
                ))}
              </div>
              <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Add</button>
            </form>
            <div className="hidden md:block">
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
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{ct.name}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono uppercase" /> : <span className="font-mono text-xs font-bold text-indigo-600">{ct.skuCode || '-'}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? (
                            <div className="flex flex-wrap gap-2">
                              {(['logo', 'plain', 'new'] as const).map((flag) => (
                                <label key={flag} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(editFormFields[flag] ?? ct[flag] ?? true)}
                                    onChange={(e) => setEditFormFields(prev => ({ ...prev, [flag]: e.target.checked }))}
                                    className="h-3 w-3 accent-[#00A896]"
                                  />
                                  {flag}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
                              {(['logo', 'plain', 'new'] as const).map((flag) => (
                                <span key={flag} className={`rounded-full px-2 py-0.5 ${ct[flag] === false ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('clothingTypes', ct, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase(), logo: editFormFields.logo ?? ct.logo ?? true, plain: editFormFields.plain ?? ct.plain ?? true, new: editFormFields.new ?? ct.new ?? true })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
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

            <div className="md:hidden space-y-3">
              {filteredClothingTypes.map((ct) => {
                const currentId = ct.id || ct.docId;
                const isRowEditing = editingRowId === currentId;

                return (
                  <div key={currentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Garment</p>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="mt-2 w-full text-sm p-2 border rounded-xl bg-white font-black text-slate-900" />
                        ) : (
                          <h4 className="mt-1 text-sm font-black text-slate-900">{ct.name}</h4>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => startInlineEditingRow(ct)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleSecureDeleteRecord('clothingTypes', ct.docId || ct.id, ct.name)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2 text-[11px]">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">SKU</span>
                      {isRowEditing ? (
                        <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded font-mono uppercase bg-slate-50" />
                      ) : (
                        <span className="mt-1 block font-mono font-black text-indigo-700">{ct.skuCode || '-'}</span>
                      )}
                    </div>

                    {isRowEditing ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Visible in</span>
                        <div className="flex flex-wrap gap-2">
                          {(['logo', 'plain', 'new'] as const).map((flag) => (
                            <label key={flag} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-600">
                              <input
                                type="checkbox"
                                checked={Boolean(editFormFields[flag] ?? ct[flag] ?? true)}
                                onChange={(e) => setEditFormFields(prev => ({ ...prev, [flag]: e.target.checked }))}
                                className="h-3.5 w-3.5 accent-[#00A896]"
                              />
                              {flag}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(['logo', 'plain', 'new'] as const).map((flag) => (
                          <span key={flag} className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${ct[flag] === false ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}

                    {isRowEditing && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => handleSecureUpdateRecord('clothingTypes', ct, { name: editFormFields.name?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase(), logo: editFormFields.logo ?? ct.logo ?? true, plain: editFormFields.plain ?? ct.plain ?? true, new: editFormFields.new ?? ct.new ?? true })} className="px-3 py-1.5 rounded-lg bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider">Save</button>
                        <button type="button" onClick={cancelInlineEditingRow} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
           📑 SUB-Category (COLOUR)
           ========================================== */}
        {activeTab === 'colours' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Colours</h3>
              <p className="text-xs text-slate-500">Add color profiles and labels to standardize inventory colour values.</p>
            </div>
            <form onSubmit={handleAddColourSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newColourName} onChange={(e) => setNewColourName(e.target.value)} placeholder="Colour Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newColourLabel} onChange={(e) => setNewColourLabel(e.target.value)} placeholder="Label" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newColourSkuCode} onChange={(e) => setNewColourSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Add</button>
            </form>
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th> <th className="py-2 px-4">Label</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredColours.map((col) => {
                    const currentId = col.id || col.docId;
                    const isRowEditing = editingRowId === currentId;

                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{col.name}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="text-slate-600">{col.label}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono uppercase" /> : <span className="font-mono text-xs font-bold text-indigo-600">{col.skuCode || '-'}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('colours', col, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={cancelInlineEditingRow} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-3">
                              <button type="button" onClick={() => startInlineEditingRow(col)} className="text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleSecureDeleteRecord('colours', col.docId || col.id, col.name)} className="text-[#FF6B35]"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {filteredColours.map((col) => {
                const currentId = col.id || col.docId;
                const isRowEditing = editingRowId === currentId;

                return (
                  <div key={currentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Colour</p>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="mt-2 w-full text-sm p-2 border rounded-xl bg-white font-black text-slate-900" />
                        ) : (
                          <h4 className="mt-1 text-sm font-black text-slate-900">{col.name}</h4>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => startInlineEditingRow(col)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleSecureDeleteRecord('colours', col.docId || col.id, col.name)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Label</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-black text-slate-800">{col.label}</span>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">SKU</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded font-mono uppercase bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-mono font-black text-indigo-700">{col.skuCode || '-'}</span>
                        )}
                      </div>
                    </div>

                    {isRowEditing && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => handleSecureUpdateRecord('colours', col, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim().toUpperCase() })} className="px-3 py-1.5 rounded-lg bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider">Save</button>
                        <button type="button" onClick={cancelInlineEditingRow} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
           📑 SUB-Category (LOCATIONS)
           ========================================== */}
        {activeTab === 'locations' && (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Locations</h3>
              <p className="text-xs text-slate-500">Define physical locations or storage areas for inventory tracking.</p>
            </div>
            <form onSubmit={handleAddLocationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input type="text" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} placeholder="Location Name" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newLocationLabel} onChange={(e) => setNewLocationLabel(e.target.value)} placeholder="Label" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <input type="text" value={newLocationSkuCode} onChange={(e) => setNewLocationSkuCode(e.target.value)} placeholder="SKU Code" className="text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00A896]" />
              <button type="submit" className="bg-[#00A896] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Add</button>
            </form>
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-4">Name</th> <th className="py-2 px-4">Label</th> <th className="py-2 px-4 text-[#FF6B35]">SKU Code</th> <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLocations.map((loc) => {
                    const currentId = loc.id || loc.docId;
                    const isRowEditing = editingRowId === currentId;

                    return (
                      <tr key={currentId} className={isRowEditing ? "bg-amber-50/40" : ""}>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="font-semibold">{loc.name}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="text-xs p-1 border rounded w-full" /> : <span className="text-slate-600">{loc.label}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {isRowEditing ? <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="text-xs p-1 border rounded w-32 font-mono" /> : <span className="font-mono text-xs font-bold text-indigo-600">{loc.skuCode || '-'}</span>}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {isRowEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => handleSecureUpdateRecord('locations', loc, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim() })} className="p-1 bg-[#00A896] text-white rounded hover:bg-[#008f80]"><Check className="w-3.5 h-3.5" /></button>
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

            <div className="md:hidden space-y-3">
              {filteredLocations.map((loc) => {
                const currentId = loc.id || loc.docId;
                const isRowEditing = editingRowId === currentId;

                return (
                  <div key={currentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Location</p>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.name || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, name: e.target.value }))} className="mt-2 w-full text-sm p-2 border rounded-xl bg-white font-black text-slate-900" />
                        ) : (
                          <h4 className="mt-1 text-sm font-black text-slate-900">{loc.name}</h4>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => startInlineEditingRow(loc)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#00A896]"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleSecureDeleteRecord('locations', loc.docId || loc.id, loc.name)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#FF6B35]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Label</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.label || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, label: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-black text-slate-800">{loc.label}</span>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-2 col-span-2">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">SKU</span>
                        {isRowEditing ? (
                          <input type="text" value={editFormFields.skuCode || ''} onChange={(e) => setEditFormFields(prev => ({ ...prev, skuCode: e.target.value }))} className="mt-1 w-full text-[11px] p-1 border rounded font-mono bg-slate-50" />
                        ) : (
                          <span className="mt-1 block font-mono font-black text-indigo-700">{loc.skuCode || '-'}</span>
                        )}
                      </div>
                    </div>

                    {isRowEditing && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => handleSecureUpdateRecord('locations', loc, { name: editFormFields.name?.trim(), label: editFormFields.label?.trim(), skuCode: editFormFields.skuCode?.trim() })} className="px-3 py-1.5 rounded-lg bg-[#00A896] text-white text-[10px] font-black uppercase tracking-wider">Save</button>
                        <button type="button" onClick={cancelInlineEditingRow} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">Cancel</button>
                      </div>
                    )}
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