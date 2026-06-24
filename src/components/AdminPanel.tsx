import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, ClothingType, Size, Colour, Location, Category, ItemType } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  seedAllSizes, seedAllClothingTypes, seedSchools, seedColours, clearInventoryToZero 
} from '../customSeeder';
import { 
  School as SchoolIcon, Shirt, Maximize2, Palette, MapPin, Trash2, Plus, 
  AlertCircle, Sparkles, Edit2, Check, X, Upload, Download, Database, RefreshCw,
  Layers, Settings
} from 'lucide-react';

interface AdminPanelProps {
  schools: School[];
  clothingTypes: ClothingType[];
  sizes: Size[];
  colours: Colour[];
  locations: Location[];
  categories: Category[];
  itemTypes: ItemType[];
}

type SubTabType = 'schools' | 'types' | 'sizes' | 'colours' | 'locations' | 'categories' | 'itemTypes';

export default function AdminPanel({
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  categories,
  itemTypes,
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('schools');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states (manual SKU inputs removed as SKUs are now automatic)
  const [schoolName, setSchoolName] = useState('');
  const [typeName, setTypeName] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [colourName, setColourName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [itemTypeName, setItemTypeName] = useState('');
  const [locationProfile, setLocationProfile] = useState<'Pickers Shelf' | 'VacPac Storage Area'>('Pickers Shelf');

  // CSV Import state
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  // Custom metadata deletion state
  const [metadataToDelete, setMetadataToDelete] = useState<{ collectionName: string; id: string; label: string } | null>(null);
  const [isDeletingMetadata, setIsDeletingMetadata] = useState(false);

  // Multi-select state
  const [selectedMetadataIds, setSelectedMetadataIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeletingMetadata, setIsBulkDeletingMetadata] = useState(false);

  // System Database Action states
  const [runningDbAction, setRunningDbAction] = useState<string | null>(null);

  const handleDbAction = async (actionName: string, actionFn: () => Promise<void>) => {
    setRunningDbAction(actionName);
    setError(null);
    setSuccess(null);
    try {
      await actionFn();
      setSuccess(`Database action "${actionName}" completed successfully.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(`Action failed: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setRunningDbAction(null);
    }
  };

  // Clear selection when activeSubTab changes
  useEffect(() => {
    setSelectedMetadataIds([]);
  }, [activeSubTab]);

  const getActiveSubTabItems = (): { id: string; label: string }[] => {
    switch (activeSubTab) {
      case 'schools':
        return schools.map(s => ({ id: s.id, label: s.name }));
      case 'types':
        return clothingTypes.map(t => ({ id: t.id, label: t.name }));
      case 'sizes':
        return sizes.map(s => ({ id: s.id, label: s.label }));
      case 'colours':
        return colours.map(c => ({ id: c.id, label: c.name }));
      case 'locations':
        return locations.map(l => ({ id: l.id, label: l.name }));
      case 'categories':
        return categories.map(c => ({ id: c.id, label: c.name }));
      case 'itemTypes':
        return itemTypes.map(i => ({ id: i.id, label: i.name }));
      default:
        return [];
    }
  };



  const clearForm = () => {
    setError(null);
    setSchoolName('');
    setTypeName('');
    setSizeLabel('');
    setColourName('');
    setLocationName('');
    setCategoryName('');
    setItemTypeName('');
    setImportText('');
  };

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editSkuValue, setEditSkuValue] = useState('');
  const [editProfileValue, setEditProfileValue] = useState<'Pickers Shelf' | 'VacPac Storage Area'>('Pickers Shelf');

  const startEdit = (id: string, name: string, sku: string, profile?: 'Pickers Shelf' | 'VacPac Storage Area') => {
    setEditingId(id);
    setEditNameValue(name);
    setEditSkuValue(sku);
    if (profile) setEditProfileValue(profile);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNameValue('');
    setEditSkuValue('');
  };

  // Generates a unique short SKU uppercase code internally based on user-entered descriptive name/label
  const generateUniqueSku = (name: string, type: SubTabType): string => {
    let base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!base) {
      base = 'META';
    }
    base = base.substring(0, 6);
    let sku = base;
    let counter = 1;
    let existingSkus: string[] = [];
    if (type === 'schools') {
      existingSkus = schools.map(s => s.skuCode);
    } else if (type === 'types') {
      existingSkus = clothingTypes.map(t => t.skuCode);
    } else if (type === 'sizes') {
      existingSkus = sizes.map(s => s.skuCode);
    } else if (type === 'colours') {
      existingSkus = colours.map(c => c.skuCode);
    } else if (type === 'locations') {
      existingSkus = locations.map(l => l.skuCode);
    } else if (type === 'categories') {
      existingSkus = categories.map(c => c.skuCode);
    } else if (type === 'itemTypes') {
      existingSkus = itemTypes.map(i => i.skuCode);
    }

    while (existingSkus.includes(sku)) {
      sku = `${base.substring(0, 5)}${counter}`;
      counter++;
    }
    return sku;
  };

  const handleSaveEdit = async (collectionName: string, id: string) => {
    if (!editNameValue.trim()) {
      return showNotification('error', 'The name or label is required.');
    }

    try {
      const updateData: any = {};
      if (collectionName === 'sizes') {
        updateData.label = editNameValue.trim();
      } else {
        updateData.name = editNameValue.trim();
      }
      if (collectionName === 'locations') {
        updateData.ruleProfile = editProfileValue;
      }

      await updateDoc(doc(db, collectionName, id), updateData);
      showNotification('success', 'Metadata mapping updated successfully.');
      setEditingId(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${id}`);
      showNotification('error', 'Error updating record: ' + err.message);
    }
  };

  const showNotification = (type: 'error' | 'success', message: string) => {
    if (type === 'error') {
      setError(message);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      return showNotification('error', 'School Name is required.');
    }

    // Auto generate the internal SKU code
    const skuCode = generateUniqueSku(schoolName, 'schools');

    try {
      await addDoc(collection(db, 'schools'), {
        name: schoolName.trim(),
        skuCode,
      });
      showNotification('success', 'School metadata added successfully.');
      clearForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'schools');
      showNotification('error', 'Error adding record to Firestore: ' + err.message);
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) {
      return showNotification('error', 'Clothing Type Name is required.');
    }

    const skuCode = generateUniqueSku(typeName, 'types');

    try {
      await addDoc(collection(db, 'clothingTypes'), {
        name: typeName.trim(),
        skuCode,
      });
      showNotification('success', 'Clothing Type metadata added successfully.');
      clearForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'clothingTypes');
      showNotification('error', 'Error adding record to Firestore: ' + err.message);
    }
  };

  const handleAddSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sizeLabel.trim()) {
      return showNotification('error', 'Size Label is required.');
    }

    const skuCode = generateUniqueSku(sizeLabel, 'sizes');

    try {
      await addDoc(collection(db, 'sizes'), {
        label: sizeLabel.trim(),
        skuCode,
      });
      showNotification('success', 'Size metadata added successfully.');
      clearForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'sizes');
      showNotification('error', 'Error adding record to Firestore: ' + err.message);
    }
  };

  const handleAddColour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colourName.trim()) {
      return showNotification('error', 'Colour Name is required.');
    }

    const skuCode = generateUniqueSku(colourName, 'colours');

    try {
      await addDoc(collection(db, 'colours'), {
        name: colourName.trim(),
        skuCode,
      });
      showNotification('success', 'Colour metadata added successfully.');
      clearForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'colours');
      showNotification('error', 'Error adding record to Firestore: ' + err.message);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim()) {
      return showNotification('error', 'Location Name is required.');
    }

    const skuCode = generateUniqueSku(locationName, 'locations');

    try {
      await addDoc(collection(db, 'locations'), {
        name: locationName.trim(),
        skuCode,
        ruleProfile: locationProfile,
      });
      showNotification('success', 'Location metadata added successfully.');
      clearForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'locations');
      showNotification('error', 'Error adding record to Firestore: ' + err.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      return showNotification('error', 'Category Name is required.');
    }

    const skuCode = generateUniqueSku(categoryName, 'categories');

    try {
      await addDoc(collection(db, 'categories'), {
        name: categoryName.trim(),
        skuCode,
      });
      showNotification('success', 'Category metadata added successfully.');
      clearForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'categories');
      showNotification('error', 'Error adding Category: ' + err.message);
    }
  };

  const handleAddItemType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTypeName.trim()) {
      return showNotification('error', 'Item Type Name is required.');
    }

    const skuCode = generateUniqueSku(itemTypeName, 'itemTypes');

    try {
      await addDoc(collection(db, 'itemTypes'), {
        name: itemTypeName.trim(),
        skuCode,
      });
      showNotification('success', 'Item Type metadata added successfully.');
      clearForm();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'itemTypes');
      showNotification('error', 'Error adding Item Type: ' + err.message);
    }
  };

  const handleDelete = (collectionName: string, id: string, label: string) => {
    setMetadataToDelete({ collectionName, id, label });
  };

  const confirmDeleteMetadata = async () => {
    if (!metadataToDelete) return;
    setIsDeletingMetadata(true);
    try {
      await deleteDoc(doc(db, metadataToDelete.collectionName, metadataToDelete.id));
      showNotification('success', 'Record deleted successfully from metadata.');
      setMetadataToDelete(null);
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `${metadataToDelete.collectionName}/${metadataToDelete.id}`);
      } catch (firestoreErr: any) {
        showNotification('error', 'Error deleting record: ' + firestoreErr.message);
      }
    } finally {
      setIsDeletingMetadata(false);
    }
  };

  const handleOpenBulkDelete = () => {
    if (selectedMetadataIds.length > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const confirmBulkDeleteMetadata = async () => {
    if (selectedMetadataIds.length === 0) return;
    setIsBulkDeletingMetadata(true);
    try {
      const collectionName = activeSubTab === 'types' ? 'clothingTypes' : activeSubTab;
      await Promise.all(
        selectedMetadataIds.map((id) => deleteDoc(doc(db, collectionName, id)))
      );
      showNotification('success', `Successfully deleted ${selectedMetadataIds.length} records.`);
      setSelectedMetadataIds([]);
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      showNotification('error', `Error deleting records: ${err.message}`);
    } finally {
      setIsBulkDeletingMetadata(false);
    }
  };

  const tabsConfig = [
    { id: 'schools' as SubTabType, label: 'Schools', icon: SchoolIcon, count: schools.length },
    { id: 'types' as SubTabType, label: 'Clothing Types', icon: Shirt, count: clothingTypes.length },
    { id: 'sizes' as SubTabType, label: 'Sizes', icon: Maximize2, count: sizes.length },
    { id: 'colours' as SubTabType, label: 'Colours', icon: Palette, count: colours.length },
    { id: 'locations' as SubTabType, label: 'Locations', icon: MapPin, count: locations.length },
    { id: 'categories' as SubTabType, label: 'Category', icon: Layers, count: categories.length },
    { id: 'itemTypes' as SubTabType, label: 'Item Type', icon: Settings, count: itemTypes.length },
  ];

  const handleExportCSV = () => {
    let headers = '';
    let rows = '';
    let filename = '';

    if (activeSubTab === 'schools') {
      headers = 'School Name\n';
      rows = schools.map(s => `"${s.name.replace(/"/g, '""')}"`).join('\n');
      filename = 'schools_export.csv';
    } else if (activeSubTab === 'types') {
      headers = 'Garment Type\n';
      rows = clothingTypes.map(t => `"${t.name.replace(/"/g, '""')}"`).join('\n');
      filename = 'garment_types_export.csv';
    } else if (activeSubTab === 'sizes') {
      headers = 'Size Option\n';
      rows = sizes.map(s => `"${s.label.replace(/"/g, '""')}"`).join('\n');
      filename = 'sizes_export.csv';
    } else if (activeSubTab === 'colours') {
      headers = 'Colour\n';
      rows = colours.map(c => `"${c.name.replace(/"/g, '""')}"`).join('\n');
      filename = 'colours_export.csv';
    } else if (activeSubTab === 'locations') {
      headers = 'Location Name,Rule Profile\n';
      rows = locations.map(l => `"${l.name.replace(/"/g, '""')}","${l.ruleProfile}"`).join('\n');
      filename = 'locations_export.csv';
    } else if (activeSubTab === 'categories') {
      headers = 'Category Name\n';
      rows = categories.map(c => `"${c.name.replace(/"/g, '""')}"`).join('\n');
      filename = 'categories_export.csv';
    } else if (activeSubTab === 'itemTypes') {
      headers = 'Item Type Name\n';
      rows = itemTypes.map(i => `"${i.name.replace(/"/g, '""')}"`).join('\n');
      filename = 'item_types_export.csv';
    }

    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', `Exported ${filename} successfully.`);
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      return showNotification('error', 'Please paste some CSV data or names to import.');
    }

    setImporting(true);
    let count = 0;
    try {
      const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
      const collectionName = activeSubTab === 'schools' ? 'schools'
                           : activeSubTab === 'types' ? 'clothingTypes'
                           : activeSubTab === 'sizes' ? 'sizes'
                           : activeSubTab === 'colours' ? 'colours'
                           : activeSubTab === 'categories' ? 'categories'
                           : activeSubTab === 'itemTypes' ? 'itemTypes'
                           : 'locations';

      // Load existing SKUs to avoid duplicates during import loop
      let existingSkus: string[] = [];
      if (activeSubTab === 'schools') existingSkus = schools.map(s => s.skuCode);
      else if (activeSubTab === 'types') existingSkus = clothingTypes.map(t => t.skuCode);
      else if (activeSubTab === 'sizes') existingSkus = sizes.map(s => s.skuCode);
      else if (activeSubTab === 'colours') existingSkus = colours.map(c => c.skuCode);
      else if (activeSubTab === 'locations') existingSkus = locations.map(l => l.skuCode);
      else if (activeSubTab === 'categories') existingSkus = categories.map(c => c.skuCode);
      else if (activeSubTab === 'itemTypes') existingSkus = itemTypes.map(i => i.skuCode);

      for (let line of lines) {
        let parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length === 0 || !parts[0]) continue;

        const firstPartLower = parts[0].toLowerCase();
        if (firstPartLower === 'school name' || firstPartLower === 'garment type' || firstPartLower === 'size option' || firstPartLower === 'colour' || firstPartLower === 'location name' || firstPartLower === 'name' || firstPartLower === 'label') {
          continue;
        }

        const nameValue = parts[0];
        const sku = generateUniqueSku(nameValue, activeSubTab);
        existingSkus.push(sku);

        const data: any = {};
        if (activeSubTab === 'sizes') {
          if (sizes.some(s => s.label.toLowerCase() === nameValue.toLowerCase())) continue;
          data.label = nameValue;
        } else {
          if (activeSubTab === 'schools' && schools.some(s => s.name.toLowerCase() === nameValue.toLowerCase())) continue;
          if (activeSubTab === 'types' && clothingTypes.some(t => t.name.toLowerCase() === nameValue.toLowerCase())) continue;
          if (activeSubTab === 'colours' && colours.some(c => c.name.toLowerCase() === nameValue.toLowerCase())) continue;
          if (activeSubTab === 'locations' && locations.some(l => l.name.toLowerCase() === nameValue.toLowerCase())) continue;
          if (activeSubTab === 'categories' && categories.some(c => c.name.toLowerCase() === nameValue.toLowerCase())) continue;
          if (activeSubTab === 'itemTypes' && itemTypes.some(i => i.name.toLowerCase() === nameValue.toLowerCase())) continue;
          data.name = nameValue;
        }

        data.skuCode = sku;

        if (activeSubTab === 'locations') {
          const rawProfile = parts[1] || 'Pickers Shelf';
          data.ruleProfile = rawProfile.toLowerCase().includes('vac') ? 'VacPac Storage Area' : 'Pickers Shelf';
        }

        await addDoc(collection(db, collectionName), data);
        count++;
      }

      showNotification('success', `Imported ${count} records successfully.`);
      setImportText('');
    } catch (err: any) {
      showNotification('error', `Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const activeItems = getActiveSubTabItems();

  return (
    <div id="admin-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-2 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => {
                  setActiveSubTab(tab.id);
                  clearForm();
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {/* Alerts and Notices */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2.5 p-4 mb-6 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm"
              id="admin-alert-error"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2.5 p-4 mb-6 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm"
              id="admin-alert-success"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Add Form Container */}
            <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit">
              <h3 className="text-base font-semibold text-slate-950 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Add {tabsConfig.find(t => t.id === activeSubTab)?.label} Mapping</span>
              </h3>

              {/* School Form */}
              {activeSubTab === 'schools' && (
                <form onSubmit={handleAddSchool} className="space-y-4" id="form-schools">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      School Name
                    </label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. All Hallows Primary"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Mapping
                  </button>
                </form>
              )}

              {/* Clothing Type Form */}
              {activeSubTab === 'types' && (
                <form onSubmit={handleAddType} className="space-y-4" id="form-types">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Garment Type Name
                    </label>
                    <input
                      type="text"
                      value={typeName}
                      onChange={(e) => setTypeName(e.target.value)}
                      placeholder="e.g. Unisex Polo Shirts"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Mapping
                  </button>
                </form>
              )}

              {/* Size Form */}
              {activeSubTab === 'sizes' && (
                <form onSubmit={handleAddSize} className="space-y-4" id="form-sizes">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Size Label
                    </label>
                    <input
                      type="text"
                      value={sizeLabel}
                      onChange={(e) => setSizeLabel(e.target.value)}
                      placeholder="e.g. 3-4yrs or M"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Mapping
                  </button>
                </form>
              )}

              {/* Colour Form */}
              {activeSubTab === 'colours' && (
                <form onSubmit={handleAddColour} className="space-y-4" id="form-colours">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Colour Name
                    </label>
                    <input
                      type="text"
                      value={colourName}
                      onChange={(e) => setColourName(e.target.value)}
                      placeholder="e.g. Red"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Mapping
                  </button>
                </form>
              )}

              {/* Location Form */}
              {activeSubTab === 'locations' && (
                <form onSubmit={handleAddLocation} className="space-y-4" id="form-locations">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Location Name
                    </label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Under Office"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Location Rule Profile
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        id="profile-pickers-shelf"
                        onClick={() => setLocationProfile('Pickers Shelf')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          locationProfile === 'Pickers Shelf'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Pickers Shelf
                        <span className="block text-[10px] font-normal text-indigo-500 mt-0.5">Loose Single Items</span>
                      </button>
                      <button
                        type="button"
                        id="profile-vacpac"
                        onClick={() => setLocationProfile('VacPac Storage Area')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          locationProfile === 'VacPac Storage Area'
                            ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        VacPac Storage Area
                        <span className="block text-[10px] font-normal text-purple-500 mt-0.5">Vacuum Bulk Packs</span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Mapping
                  </button>
                </form>
              )}

              {/* Category Form */}
              {activeSubTab === 'categories' && (
                <form onSubmit={handleAddCategory} className="space-y-4" id="form-categories">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Logo, Plain"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Mapping
                  </button>
                </form>
              )}

              {/* Item Type Form */}
              {activeSubTab === 'itemTypes' && (
                <form onSubmit={handleAddItemType} className="space-y-4" id="form-itemTypes">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Item Type Name
                    </label>
                    <input
                      type="text"
                      value={itemTypeName}
                      onChange={(e) => setItemTypeName(e.target.value)}
                      placeholder="e.g. single, vacpac"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Mapping
                  </button>
                </form>
              )}

              {/* Import & Export Card */}
              <div className="mt-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-500" />
                    <span>Import / Export CSV</span>
                  </h4>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition border border-slate-100"
                    title="Export Current to CSV"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>

                <form onSubmit={handleImportCSV} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Paste Names (one per line) or CSV Text:
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={
                        activeSubTab === 'locations'
                          ? "e.g.\nShelving Unit A,Pickers Shelf\nZone B Storage,VacPac Storage Area"
                          : "e.g.\nSchool A\nSchool B\nSchool C"
                      }
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={importing}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs tracking-wide transition flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {importing ? 'Processing Import...' : 'Run CSV Import'}
                  </button>
                </form>
              </div>

              {/* Master System Operations Card */}
              <div className="mt-6 bg-rose-50/40 p-5 rounded-2xl border border-rose-100 shadow-sm space-y-4 animate-fade-in">
                <div className="border-b border-rose-100 pb-3">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-rose-600" />
                    <span>System Database Operations</span>
                  </h4>
                  <p className="text-[10px] text-rose-600 mt-1">
                    Destructive master tools. Overwrites or purges database collections to standard baseline values.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={runningDbAction !== null}
                    onClick={() => handleDbAction('Purge Inventory Collection', clearInventoryToZero)}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-xl text-xs tracking-wide transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {runningDbAction === 'Purge Inventory Collection' ? 'Purging...' : 'Clear Inventory (Reset to 0 items)'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={runningDbAction !== null}
                      onClick={() => handleDbAction('Sync Master Sizes', seedAllSizes)}
                      className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
                      Sync Master Sizes
                    </button>

                    <button
                      type="button"
                      disabled={runningDbAction !== null}
                      onClick={() => handleDbAction('Sync Master Types', seedAllClothingTypes)}
                      className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
                      Sync Master Types
                    </button>

                    <button
                      type="button"
                      disabled={runningDbAction !== null}
                      onClick={() => handleDbAction('Sync Master Schools', seedSchools)}
                      className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
                      Sync Schools
                    </button>

                    <button
                      type="button"
                      disabled={runningDbAction !== null}
                      onClick={() => handleDbAction('Sync Master Colours', seedColours)}
                      className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
                      Sync Colours
                    </button>
                  </div>
                </div>
              </div>
            </div>

          {/* List Display Container */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4 h-9">
              <h3 className="text-base font-semibold text-slate-950">
                Current Registered {tabsConfig.find(t => t.id === activeSubTab)?.label}
              </h3>
              <AnimatePresence>
                {selectedMetadataIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    onClick={handleOpenBulkDelete}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition border border-red-200/50 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedMetadataIds.length})</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={activeItems.length > 0 && selectedMetadataIds.length === activeItems.length}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = selectedMetadataIds.length > 0 && selectedMetadataIds.length < activeItems.length;
                          }
                        }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMetadataIds(activeItems.map((item) => item.id));
                          } else {
                            setSelectedMetadataIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                      />
                    </th>
                    {activeSubTab === 'schools' && (
                      <>
                        <th className="px-5 py-3">School Name</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </>
                    )}
                    {activeSubTab === 'types' && (
                      <>
                        <th className="px-5 py-3">Garment Type Name</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </>
                    )}
                    {activeSubTab === 'sizes' && (
                      <>
                        <th className="px-5 py-3">Size Label</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </>
                    )}
                    {activeSubTab === 'colours' && (
                      <>
                        <th className="px-5 py-3">Colour Name</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </>
                    )}
                    {activeSubTab === 'locations' && (
                      <>
                        <th className="px-5 py-3">Location Name</th>
                        <th className="px-5 py-3">Rule Profile</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </>
                    )}
                    {activeSubTab === 'categories' && (
                      <>
                        <th className="px-5 py-3">Category Name</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </>
                    )}
                    {activeSubTab === 'itemTypes' && (
                      <>
                        <th className="px-5 py-3">Item Type Name</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeSubTab === 'schools' && schools.map((s) => {
                    const isEditing = editingId === s.id;
                    return isEditing ? (
                      <tr key={s.id} className="bg-indigo-50/10">
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit('schools', s.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedMetadataIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadataIds((prev) => [...prev, s.id]);
                              } else {
                                setSelectedMetadataIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{s.name}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(s.id, s.name, s.skuCode)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('schools', s.id, s.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeSubTab === 'types' && clothingTypes.map((t) => {
                    const isEditing = editingId === t.id;
                    return isEditing ? (
                      <tr key={t.id} className="bg-indigo-50/10">
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit('clothingTypes', t.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={t.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedMetadataIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadataIds((prev) => [...prev, t.id]);
                              } else {
                                setSelectedMetadataIds((prev) => prev.filter((id) => id !== t.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{t.name}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(t.id, t.name, t.skuCode)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('clothingTypes', t.id, t.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeSubTab === 'sizes' && sizes.map((s) => {
                    const isEditing = editingId === s.id;
                    return isEditing ? (
                      <tr key={s.id} className="bg-indigo-50/10">
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit('sizes', s.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedMetadataIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadataIds((prev) => [...prev, s.id]);
                              } else {
                                setSelectedMetadataIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{s.label}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(s.id, s.label, s.skuCode)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('sizes', s.id, s.label)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeSubTab === 'colours' && colours.map((c) => {
                    const isEditing = editingId === c.id;
                    return isEditing ? (
                      <tr key={c.id} className="bg-indigo-50/10">
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit('colours', c.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedMetadataIds.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadataIds((prev) => [...prev, c.id]);
                              } else {
                                setSelectedMetadataIds((prev) => prev.filter((id) => id !== c.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(c.id, c.name, c.skuCode)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('colours', c.id, c.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeSubTab === 'locations' && locations.map((l) => {
                    const isEditing = editingId === l.id;
                    return isEditing ? (
                      <tr key={l.id} className="bg-indigo-50/10">
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2">
                          <select
                            value={editProfileValue}
                            onChange={(e) => setEditProfileValue(e.target.value as any)}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                          >
                            <option value="Pickers Shelf">Pickers Shelf</option>
                            <option value="VacPac Storage Area">VacPac Storage Area</option>
                          </select>
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit('locations', l.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={l.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedMetadataIds.includes(l.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadataIds((prev) => [...prev, l.id]);
                              } else {
                                setSelectedMetadataIds((prev) => prev.filter((id) => id !== l.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{l.name}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              l.ruleProfile === 'Pickers Shelf'
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                            }`}
                          >
                            {l.ruleProfile}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(l.id, l.name, l.skuCode, l.ruleProfile)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('locations', l.id, l.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeSubTab === 'categories' && categories.map((c) => {
                    const isEditing = editingId === c.id;
                    return isEditing ? (
                      <tr key={c.id} className="bg-indigo-50/10">
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit('categories', c.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedMetadataIds.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadataIds((prev) => [...prev, c.id]);
                              } else {
                                setSelectedMetadataIds((prev) => prev.filter((id) => id !== c.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(c.id, c.name, c.skuCode)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('categories', c.id, c.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeSubTab === 'itemTypes' && itemTypes.map((i) => {
                    const isEditing = editingId === i.id;
                    return isEditing ? (
                      <tr key={i.id} className="bg-indigo-50/10">
                        <td className="px-5 py-2"></td>
                        <td className="px-5 py-2">
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit('itemTypes', i.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={i.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-center w-12">
                          <input
                            type="checkbox"
                            checked={selectedMetadataIds.includes(i.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMetadataIds((prev) => [...prev, i.id]);
                              } else {
                                setSelectedMetadataIds((prev) => prev.filter((id) => id !== i.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{i.name}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(i.id, i.name, i.skuCode)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Mapping"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('itemTypes', i.id, i.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {activeSubTab === 'schools' && schools.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">No schools registered yet.</td></tr>
                  )}
                  {activeSubTab === 'types' && clothingTypes.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">No clothing types registered yet.</td></tr>
                  )}
                  {activeSubTab === 'sizes' && sizes.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">No sizes registered yet.</td></tr>
                  )}
                  {activeSubTab === 'colours' && colours.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">No colours registered yet.</td></tr>
                  )}
                  {activeSubTab === 'locations' && locations.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-400">No locations registered yet.</td></tr>
                  )}
                  {activeSubTab === 'categories' && categories.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">No categories registered yet.</td></tr>
                  )}
                  {activeSubTab === 'itemTypes' && itemTypes.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">No item types registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM METADATA DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {metadataToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => !isDeletingMetadata && setMetadataToDelete(null)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10 text-left"
            >
              <div className="bg-red-600 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Confirm Metadata Delete</h3>
                  <p className="text-[10px] text-red-100 mt-0.5">May affect existing stock items mapping</p>
                </div>
                <button
                  onClick={() => !isDeletingMetadata && setMetadataToDelete(null)}
                  className="p-1 rounded-lg text-red-200 hover:text-white hover:bg-red-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete this metadata record? It may affect existing stock mapping.
                </p>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-800">
                  <span className="text-slate-400 font-normal uppercase text-[10px] block mb-1">
                    {metadataToDelete.collectionName}
                  </span>
                  {metadataToDelete.label}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isDeletingMetadata}
                    onClick={() => setMetadataToDelete(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteMetadata}
                    disabled={isDeletingMetadata}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeletingMetadata ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM METADATA BULK DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => !isBulkDeletingMetadata && setShowBulkDeleteModal(false)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10 text-left"
            >
              <div className="bg-red-600 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Confirm Bulk Delete</h3>
                  <p className="text-[10px] text-red-100 mt-0.5">This will delete multiple records at once</p>
                </div>
                <button
                  onClick={() => !isBulkDeletingMetadata && setShowBulkDeleteModal(false)}
                  className="p-1 rounded-lg text-red-200 hover:text-white hover:bg-red-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you absolutely sure you want to delete these <strong className="text-red-600 font-bold">{selectedMetadataIds.length}</strong> selected metadata records? This may affect existing stock mapping.
                </p>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl max-h-40 overflow-y-auto space-y-2">
                  <span className="text-slate-400 font-normal uppercase text-[10px] block border-b border-slate-200 pb-1 mb-1">
                    Selected Items for Deletion ({tabsConfig.find(t => t.id === activeSubTab)?.label})
                  </span>
                  {activeItems.filter(item => selectedMetadataIds.includes(item.id)).map(item => (
                    <div key={item.id} className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {item.label}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isBulkDeletingMetadata}
                    onClick={() => setShowBulkDeleteModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmBulkDeleteMetadata}
                    disabled={isBulkDeletingMetadata}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isBulkDeletingMetadata ? 'Deleting...' : 'Confirm Bulk Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
