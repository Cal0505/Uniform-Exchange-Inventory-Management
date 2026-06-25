import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { clearInventoryToZero } from '../customSeeder';
import { 
  School as SchoolIcon, Shirt, Maximize2, Palette, MapPin, Trash2, Plus, 
  AlertCircle, Edit2, Check, X, Users, Wrench, Shield, Mail, ShieldAlert, CheckCircle
} from 'lucide-react';

// ⚙️ UPGRADED MASTER TYPES FOR DATA STRUCTURE INTERFACES
interface AdvancedSchool {
  id: string;
  name: string;
  schoolType: 'JIN' | 'IN' | 'M' | 'H'; // Junior Infant Nursery, Infant Nursery, Middle, High
  schoolIdCode: string; // e.g. AHW
  skuCode: string; // The generated combination: JINAHW
  logoUrl?: string; // Optional crest media link URL
}

interface AdvancedAttribute {
  id: string;
  name?: string; // Used for garment types, colours, locations
  label?: string; // Used for sizes option
  skuCode: string; // typed manually by user (e.g. JUMP, s0708, BLK, PS)
  ruleProfile?: string; // Specific fallback modifier for locations mapping
}

interface AdminPanelProps {
  schools: AdvancedSchool[];
  clothingTypes: AdvancedAttribute[];
  sizes: AdvancedAttribute[];
  colours: AdvancedAttribute[];
  locations: AdvancedAttribute[];
  categories: any[];
  itemTypes: any[];
  userRole?: string;
}

type MainTabType = 'attributes' | 'staff' | 'dev';
type SubTabType = 'schools' | 'types' | 'sizes' | 'colours' | 'locations';

export default function AdminPanel({
  schools, clothingTypes, sizes, colours, locations, userRole = 'Dev'
}: AdminPanelProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('attributes');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('schools');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 📝 EXPANDED FORM INPUT STATES FOR DYNAMIC LOGO MEDIA STRINGS
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState<'JIN' | 'IN' | 'M' | 'H'>('JIN');
  const [schoolIdCode, setSchoolIdCode] = useState('');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(''); // 🖼️ BRAND NEW DYNAMIC CREST ACCREDITATION URL LINK HOOK

  // 📝 ATTRIBUTE STATE INPUT CONTROLS
  const [customSkuSuffix, setCustomSkuSuffix] = useState(''); 
  const [attributeName, setAttributeName] = useState('');
  const [locationProfile, setLocationProfile] = useState<'Pickers Shelf' | 'VacPac Storage Area'>('Pickers Shelf');
  
  // 📝 EXPANDED DUAL INLINE EDIT TRACKING BUFFERS
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editSkuValue, setEditSkuValue] = useState(''); // 🔧 OVERRIDE HOOK FIELD TO FREELY AMEND BACKGROUND CODES
  const [editProfileValue, setEditProfileValue] = useState<'Pickers Shelf' | 'VacPac Storage Area'>('Pickers Shelf');

  const [editSchoolType, setEditSchoolType] = useState<'JIN' | 'IN' | 'M' | 'H'>('JIN');
  const [editSchoolIdCode, setEditSchoolIdCode] = useState('');
  const [editSchoolLogoUrl, setEditSchoolLogoUrl] = useState('');

  // Manual Staff Addition Form States
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Staff' | 'Admin'>('Staff');
  const [newStaffName, setNewStaffName] = useState('');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  
  const [metadataToDelete, setMetadataToDelete] = useState<{ collectionName: string; id: string; label: string } | null>(null);
  const [isDeletingMetadata, setIsDeletingMetadata] = useState(false);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Staff Removal Popup Controls
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Staff Status Filter Chips Row State
  const [staffStatusFilter, setStaffStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Pending Setup' | 'Suspended'>('All');

  const isDevUser = userRole === 'Dev' || userRole === 'dev';

  // 📊 COMPONENT COUNTER CHIPS ROW TEXT CONFIGURATIONS
  const tabsConfig = [
    { id: 'schools', label: 'Schools Registry', icon: SchoolIcon, count: schools.length },
    { id: 'types', label: 'Garment Types', icon: Shirt, count: clothingTypes.length },
    { id: 'sizes', label: 'Sizes Option', icon: Maximize2, count: sizes.length },
    { id: 'colours', label: 'Colours Profile', icon: Palette, count: colours.length },
    { id: 'locations', label: 'Locations Mapping', icon: MapPin, count: locations.length },
  ];

  useEffect(() => {
    if (activeMainTab === 'staff') fetchStaffUsers();
    if (activeMainTab === 'dev' && isDevUser) fetchSupportMessages();
  }, [activeMainTab]);

  const cancelEdit = () => { 
    setEditingId(null); setEditNameValue(''); setEditSkuValue(''); 
    setEditSchoolIdCode(''); setEditSchoolLogoUrl('');
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditNameValue(item.label || '');
    setEditSkuValue(item.sku || '');
    if (item.profile) setEditProfileValue(item.profile);
    
    // Grabs legacy data states from the active list item row properties
    if (activeSubTab === 'schools') {
      const match = schools.find(s => s.id === item.id);
      if (match) {
        setEditSchoolType(match.schoolType || 'JIN');
        setEditSchoolIdCode(match.schoolIdCode || '');
        setEditSchoolLogoUrl(match.logoUrl || '');
      }
    }
  };


  const fetchStaffUsers = async () => {
    setLoadingStaff(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setStaffUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setLoadingStaff(false); }
  };

  const fetchSupportMessages = async () => {
    setLoadingMessages(true);
    try {
      const snap = await getDocs(collection(db, 'support_messages'));
      setSupportMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setLoadingMessages(false); }
  };

  const showNotification = (type: 'error' | 'success', message: string) => {
    if (type === 'error') { setError(message); setTimeout(() => setError(null), 5000); }
    else { setSuccess(message); setTimeout(() => setSuccess(null), 3000); }
  };

  const handleAddStaffManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail.trim() || !newStaffName.trim()) return showNotification('error', 'All fields are required.');
    try {
      await addDoc(collection(db, 'users'), {
        name: newStaffName.trim(), email: newStaffEmail.trim().toLowerCase(), role: newStaffRole, status: 'Pending Setup'
      });
      showNotification('success', 'Staff whitelisted successfully.');
      setNewStaffEmail(''); setNewStaffName(''); fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleApproveUserStatus = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'Active' });
      showNotification('success', 'Staff profile verified and activated.');
      fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'Admin' ? 'Staff' : 'Admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: nextRole });
      showNotification('success', 'Permissions altered.'); fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    try {
      await updateDoc(doc(db, 'users', userId), { status: nextStatus });
      showNotification('success', 'Status toggled.'); fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleDeleteSupportMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'support_messages', msgId));
      showNotification('success', 'Message cleared from support queue.');
      fetchSupportMessages();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handlePermanentDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      showNotification('success', `Permanently removed staff member registry row.`);
      setUserToDelete(null); fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); } 
    finally { setIsDeletingUser(false); }
  };

   // 📡 INLINE DATABASE EDIT SAVER (UPGRADED TO CALCULATE MULTI-COLUMN SCHOOL RECORDS)
  const handleSaveEdit = async (collectionName: string, id: string) => {
    if (!editNameValue.trim()) return showNotification('error', 'The entry field cannot be blank.');
    try {
      const updateData: any = {};
      
      if (collectionName === 'schools') {
        if (!editSchoolIdCode.trim()) return showNotification('error', 'School machine ID code is required.');
        const recalculatedSku = `${editSchoolType}${editSchoolIdCode.trim().toUpperCase()}`;
        
        updateData.name = editNameValue.trim();
        updateData.schoolType = editSchoolType;
        updateData.schoolIdCode = editSchoolIdCode.trim().toUpperCase();
        updateData.skuCode = recalculatedSku; // 🔒 Recalculates master machine combination automatically
        updateData.logoUrl = editSchoolLogoUrl.trim();
      } else {
        if (collectionName === 'sizes') updateData.label = editNameValue.trim();
        else updateData.name = editNameValue.trim();
        
        if (editSkuValue.trim()) {
          updateData.skuCode = editSkuValue.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
        if (collectionName === 'locations') updateData.ruleProfile = editProfileValue;
      }
      
      await updateDoc(doc(db, collectionName, id), updateData);
      showNotification('success', 'Configuration parameter dynamically updated.');
      cancelEdit();
    } catch (err: any) { showNotification('error', err.message); }
  };


  // 📡 UPDATED SOURCE ENTRY CREATOR (UPGRADED FOR OPTIONAL LOGO CREST TRACKING LINKS)
  const executeAddMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    const colMap = activeSubTab === 'types' ? 'clothingTypes' : activeSubTab;
    
    try {
      if (activeSubTab === 'schools') {
        if (!schoolName.trim() || !schoolIdCode.trim()) return showNotification('error', 'All school layout fields are required.');
        const combinedSchoolSku = `${schoolType}${schoolIdCode.trim().toUpperCase()}`;
        
        await addDoc(collection(db, 'schools'), {
          name: schoolName.trim(),
          schoolType: schoolType,
          schoolIdCode: schoolIdCode.trim().toUpperCase(),
          skuCode: combinedSchoolSku,
          logoUrl: schoolLogoUrl.trim()
        });
      } else {
        if (!attributeName.trim() || !customSkuSuffix.trim()) return showNotification('error', 'Both name label and SKU suffix code are required.');
        const data: any = activeSubTab === 'sizes' ? { label: attributeName.trim() } : { name: attributeName.trim() };
        
        data.skuCode = customSkuSuffix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (activeSubTab === 'locations') data.ruleProfile = locationProfile;
        
        await addDoc(collection(db, colMap), data);
      }
      
      showNotification('success', 'Component parameter generated successfully.');
      setSchoolName(''); setSchoolIdCode(''); setSchoolLogoUrl(''); setAttributeName(''); setCustomSkuSuffix('');
    } catch (err: any) { showNotification('error', err.message); }
  };
  const handleExportCSV = () => {
    let headers = 'Name,SKU_Code\n';
    let rows = '';
    if (activeSubTab === 'schools') {
      headers = 'School Name,School Type,ID_Code,Logo_URL,Full_SKU\n';
      rows = schools.map(s => `"${s.name}","${s.schoolType}","${s.schoolIdCode}","${s.logoUrl || ''}","${s.skuCode}"`).join('\n');
    } else if (activeSubTab === 'types') {
      rows = clothingTypes.map(t => `"${t.name}","${t.skuCode}"`).join('\n');
    } else if (activeSubTab === 'sizes') {
      headers = 'Size Option,SKU_Code\n';
      rows = sizes.map(s => `"${s.label}","${s.skuCode}"`).join('\n');
    } else if (activeSubTab === 'colours') {
      rows = colours.map(c => `"${c.name}","${c.skuCode}"`).join('\n');
    } else if (activeSubTab === 'locations') {
      headers = 'Location Name,Profile,SKU_Code\n';
      rows = locations.map(l => `"${l.name}","${l.ruleProfile}","${l.skuCode}"`).join('\n');
    }
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.setAttribute('href', url); link.setAttribute('download', `${activeSubTab}_codes_export.csv`); link.click();
  };

  const getActiveSubTabItems = (): { id: string; label: string; sku: string; profile?: string; logoUrl?: string; schoolType?: string; schoolIdCode?: string }[] => {
    switch (activeSubTab) {
      case 'schools': return schools.map(s => ({ id: s.id, label: s.name, sku: s.skuCode, profile: `${s.schoolType} (${s.schoolIdCode})`, logoUrl: s.logoUrl, schoolType: s.schoolType, schoolIdCode: s.schoolIdCode }));
      case 'types': return clothingTypes.map(t => ({ id: t.id, label: t.name || '', sku: t.skuCode }));
      case 'sizes': return sizes.map(s => ({ id: s.id, label: s.label || '', sku: s.skuCode }));
      case 'colours': return colours.map(c => ({ id: c.id, label: c.name || '', sku: c.skuCode }));
      case 'locations': return locations.map(l => ({ id: l.id, label: l.name || '', sku: l.skuCode, profile: l.ruleProfile }));
      default: return [];
    }
  };

  const activeItems = getActiveSubTabItems();
  const handleDeleteMetadata = (collectionName: string, id: string, label: string) => { setMetadataToDelete({ collectionName, id, label }); };
  
  const confirmDeleteMetadata = async () => {
    if (!metadataToDelete) return;
    setIsDeletingMetadata(true);
    try {
      await deleteDoc(doc(db, metadataToDelete.collectionName, metadataToDelete.id));
      showNotification('success', 'Mapping configuration deleted.'); setMetadataToDelete(null);
    } catch (e: any) { showNotification('error', e.message); } finally { setIsDeletingMetadata(false); }
  };

  return (
    <div id="admin-panel" className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden text-left">
      {/* 📁 Administrative Main Tab Controls Selector buttons */}
      <div className="border-b border-slate-200 bg-slate-50/50 p-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => setActiveMainTab('attributes')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${activeMainTab === 'attributes' ? 'bg-brand-primary text-white border-brand-primary shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>🎛️ Stock Attributes</button>
        <button type="button" onClick={() => setActiveMainTab('staff')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 transition ${activeMainTab === 'staff' ? 'bg-brand-primary text-white border-brand-primary shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Users className="w-3.5 h-3.5" /><span>Manage Staff</span></button>
        {isDevUser && <button type="button" onClick={() => setActiveMainTab('dev')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 transition ${activeMainTab === 'dev' ? 'bg-brand-secondary text-white border-brand-secondary shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Wrench className="w-3.5 h-3.5" /><span>Dev Tools</span></button>}
      </div>

      {activeMainTab === 'attributes' && (
        <div className="divide-y divide-slate-100">
          <div className="bg-white px-4 py-2 flex flex-wrap gap-2">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon; const isActive = activeSubTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { setActiveSubTab(tab.id as SubTabType); cancelEdit(); }} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${isActive ? 'bg-brand-yellow text-slate-900 border border-brand-yellow' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}><Icon className="w-3.5 h-3.5" /><span>{tab.label}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{tab.count}</span></button>
              );
            })}
          </div>
          
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50/60 border border-slate-200/60 p-5 rounded-2xl h-fit space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Configure Parameter</h4>
              
              <form onSubmit={executeAddMetadata} className="space-y-3">
                {activeSubTab === 'schools' ? (
                  <>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase font-sans">School Full Name</label>
                      <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g. All Hallows Primary" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase font-sans">School Category Classification Type</label>
                      <select value={schoolType} onChange={(e) => setSchoolType(e.target.value as any)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none">
                        <option value="JIN">JIN - Junior Infants Nursery</option>
                        <option value="IN">IN - Infants and Nursery</option>
                        <option value="M">M - Middle School</option>
                        <option value="H">H - High School</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase font-sans">Machine Abbreviation ID Code</label>
                      <input type="text" value={schoolIdCode} onChange={(e) => setSchoolIdCode(e.target.value)} placeholder="e.g. AHW" maxLength={6} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none" />
                    </div>
                    <div>
                      {/* 🖼️ BRAND NEW DYNAMIC SCHOOL LOGO CREST LINK FIELD */}
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase font-sans">School Crest Logo Image Link URL</label>
                      <input type="text" value={schoolLogoUrl} onChange={(e) => setSchoolLogoUrl(e.target.value)} placeholder="https://example.com" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase font-sans">Friendly Display Label Description</label>
                      <input type="text" value={attributeName} onChange={(e) => setAttributeName(e.target.value)} placeholder={activeSubTab === 'sizes' ? "e.g. 7-8yrs" : activeSubTab === 'colours' ? "e.g. Black" : "Type display value..."} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase font-sans">Machine SKU Suffix Identifier Code</label>
                      <input type="text" value={customSkuSuffix} onChange={(e) => setCustomSkuSuffix(e.target.value)} placeholder={activeSubTab === 'sizes' ? "e.g. s0708" : activeSubTab === 'colours' ? "e.g. BLK" : "e.g. CARD"} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none" />
                    </div>
                    {activeSubTab === 'locations' && (
                      <div>
                        <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase font-sans">Facility Operation Rules Profile</label>
                        <select value={locationProfile} onChange={(e) => setLocationProfile(e.target.value as any)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none">
                          <option value="Pickers Shelf">Pickers Shelf Profile</option>
                          <option value="VacPac Storage Area">VacPac Storage Profile</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
                <button type="submit" className="w-full py-2.5 px-4 bg-brand-primary text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer">Register Component Code</button>
              </form>
              <div className="border-t border-slate-200/60 pt-4">
                <button type="button" onClick={handleExportCSV} className="w-full py-2 bg-white text-slate-700 font-bold rounded-xl border text-[11px] hover:bg-slate-50">Download Codes Template</button>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Active Configuration Parameters</h4>
              <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold">
                    <tr>
                      <th className="px-4 py-3">Component Identifier Label</th>
                      {activeSubTab === 'locations' && <th className="px-4 py-3">Rule Profile</th>}
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeItems.map((item) => {
                      const isEditing = editingId === item.id;
                      const isSchoolTab = activeSubTab === 'schools';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {isEditing ? (
                              isSchoolTab ? (
                                <div className="space-y-2 max-w-sm bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">School Full Name</label>
                                    <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white w-full focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Classification Type</label>
                                    <select value={editSchoolType} onChange={(e) => setEditSchoolType(e.target.value as any)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white w-full focus:outline-none">
                                      <option value="JIN">JIN - Junior Infants</option>
                                      <option value="IN">IN - Infants Nursery</option>
                                      <option value="M">M - Middle School</option>
                                      <option value="H">H - High School</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Machine Abbreviation ID</label>
                                    <input type="text" value={editSchoolIdCode} onChange={(e) => setEditSchoolIdCode(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white w-full uppercase font-mono tracking-wider focus:outline-none" maxLength={6} />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Crest Logo URL Link</label>
                                    <input type="text" value={editSchoolLogoUrl} onChange={(e) => setEditSchoolLogoUrl(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white w-full focus:outline-none" placeholder="https://example.com" />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5 max-w-xs text-left">
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Edit Display Label</label>
                                  <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white w-full focus:outline-none focus:ring-1 focus:ring-brand-primary" />
                            {(activeSubTab as string) !== 'schools' && (
                                    <>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase pt-1">Edit Suffix Code</label>
                                      <input type="text" value={editSkuValue} onChange={(e) => setEditSkuValue(e.target.value)} placeholder="Edit Suffix Code" className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white w-full uppercase font-mono tracking-wider focus:outline-none" />
                                    </>
                                  )}
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-3 space-y-0.5 text-left">
                                {isSchoolTab && item.logoUrl && (
                                  <img src={item.logoUrl} alt="Crest" className="w-7 h-7 object-contain rounded-md border p-0.5 bg-slate-50 flex-shrink-0" onError={(e: any) => { e.target.style.display='none'; }} />
                                )}
                                <div>
                                  <span className="block font-semibold text-slate-900">{item.label}</span>
                                  <span className="inline-block text-[9px] font-mono tracking-wider text-slate-400 bg-slate-50 border border-slate-100 px-1 rounded mt-0.5">
                                    SKU CODE: {item.sku}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                          {activeSubTab === 'locations' && (
                            <td className="px-4 py-3 text-slate-500 text-left">
                              {isEditing ? (
                                <select value={editProfileValue} onChange={(e) => setEditProfileValue(e.target.value as any)} className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white">
                                  <option value="Pickers Shelf">Pickers Shelf</option>
                                  <option value="VacPac Storage Area">VacPac Storage Area</option>
                                </select>
                              ) : item.profile}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => handleSaveEdit(activeSubTab === 'types' ? 'clothingTypes' : activeSubTab, item.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"><Check className="w-4 h-4" /></button>
                                <button type="button" onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => startEdit(item)} className="p-1 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-lg cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => handleDeleteMetadata(activeSubTab === 'types' ? 'clothingTypes' : activeSubTab, item.id, item.label)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {activeItems.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-slate-400">No layout parameters configured yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* RENDER TAB PANEL 2: TEAM OPERATIONS AND MANAGE STAFF MEMBERS */}
      {activeMainTab === 'staff' && (
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
            <div><h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Add Staff Account Manually</h4><p className="text-[11px] text-slate-500 mt-0.5">Authorise workspace permissions credentials for new employees.</p></div>
            <form onSubmit={handleAddStaffManually} className="flex flex-wrap items-center gap-2 flex-1 md:justify-end">
              <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Staff Full Name" className="p-2 bg-white border border-slate-200 rounded-xl text-xs w-full max-w-[150px] focus:outline-none" />
              <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="employee@company.com" className="p-2 bg-white border border-slate-200 rounded-xl text-xs w-full max-w-xs focus:outline-none" />
              <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as any)} className="p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none">
                <option value="Staff">Staff Tier</option>
                <option value="Admin">Admin Tier</option>
                {isDevUser && <option value="Dev">Dev Tier</option>}
              </select>
              <button type="submit" className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add Staff</button>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-serif font-black text-slate-900 text-base tracking-tight">Active Staff Directory Registry</h4>
              <p className="text-xs text-slate-500 mt-0.5">Modify permission parameters or filter active team directories.</p>
            </div>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border w-fit">
              {(['All', 'Active', 'Pending', 'Pending Setup', 'Suspended'] as const).map((filter) => {
                const isCurrent = staffStatusFilter === filter;
                const count = filter === 'All' ? staffUsers.length : staffUsers.filter(u => u.status === filter || (filter === 'Active' && !u.status)).length;
                return (
                  <button key={filter} type="button" onClick={() => setStaffStatusFilter(filter)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-tight transition cursor-pointer ${isCurrent ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                    {filter === 'Pending' ? 'Approval Req' : filter}
                    <span className={`ml-1 px-1 py-0.5 rounded text-[9px] ${isCurrent ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {loadingStaff ? <div className="py-12 text-center text-xs font-mono text-slate-400 animate-pulse">Gathering directory security cards...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffUsers.filter(u => staffStatusFilter === 'All' || u.status === staffStatusFilter || (staffStatusFilter === 'Active' && !u.status)).map((u: any) => {
                const isTargetDev = u.role === 'Dev' || u.role === 'dev';
                const isPending = u.status === 'Pending';
                return (
                  <div key={u.id} className={`bg-white border p-5 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between transition ${u.status === 'Suspended' ? 'border-red-200 bg-red-50/10' : isTargetDev ? 'border-indigo-200 bg-indigo-50/5' : isPending ? 'border-orange-200 bg-orange-50/5 animate-pulse' : u.status === 'Pending Setup' ? 'border-amber-200 bg-amber-50/5' : 'border-slate-200/80 hover:border-slate-300'}`}>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isTargetDev ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : u.role === 'Admin' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>{u.role || 'Staff'}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${u.status === 'Suspended' ? 'bg-red-100 text-red-700' : isPending ? 'bg-orange-100 text-orange-800' : u.status === 'Pending Setup' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}><span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Suspended' ? 'bg-red-500' : isPending ? 'bg-orange-500' : u.status === 'Pending Setup' ? 'bg-amber-500' : 'bg-emerald-500'}`} />{u.status || 'Active'}</span>
                          {!isTargetDev && <button type="button" onClick={() => setUserToDelete({ id: u.id, email: u.email })} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 pt-1">
                        <div className="p-2 bg-slate-100 rounded-xl text-slate-600 flex-shrink-0"><Mail className="w-4 h-4" /></div>
                        <div className="overflow-hidden">
                          <span className="block text-xs font-black text-slate-900 truncate tracking-tight">{u.name || 'Awaiting Activation'}</span>
                          <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">{u.email}</span>
                          <span className="text-[9px] font-mono tracking-wider text-slate-400 block mt-0.5">ID: {u.id.substring(0,8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      {isPending ? (
                        <button type="button" onClick={() => handleApproveUserStatus(u.id)} className="col-span-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer transition shadow-xs"><Check className="w-3 h-3" /> Approve Profile</button>
                      ) : (
                        <>
                          <button type="button" disabled={isTargetDev} onClick={() => handleUpdateRole(u.id, u.role)} className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold border border-slate-200 rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer"><Shield className="w-3 h-3" /> {isTargetDev ? 'Dev Locked' : 'Toggle Rank'}</button>
                          <button type="button" disabled={isTargetDev} onClick={() => handleToggleUserStatus(u.id, u.status)} className={`py-1.5 px-2 font-bold border rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${u.status === 'Suspended' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}><ShieldAlert className="w-3 h-3" /> {isTargetDev ? 'Dev Immutable' : u.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {staffUsers.length === 0 && <div className="col-span-full py-12 border border-dashed text-center text-xs text-slate-400 rounded-2xl">No employee profiles matching criteria logs.</div>}
            </div>
          )}
        </div>
      )}
      {/* RENDER PANEL 3: MASTER OVERRIDES CORE DEVELOPER OVERLAYS */}
      {activeMainTab === 'dev' && isDevUser && (
        <div className="p-6 space-y-6 bg-slate-950 text-slate-200 font-mono rounded-b-3xl">
          <div>
            <h4 className="font-mono font-bold text-brand-yellow text-sm tracking-wide">⚡ Core Database Tools & Support Log Console</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Direct data streaming overrides and incoming user terminal assistance channels.</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <span className="text-[10px] text-brand-yellow uppercase tracking-widest font-bold block">📥 Active Technical Support Assistance Queues</span>
            {loadingMessages ? <div className="py-6 text-center text-xs text-slate-500 animate-pulse">Gathering terminal log alerts...</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportMessages.map((m: any) => (
                  <div key={m.id} className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-teal-400 truncate max-w-[180px]">{m.email}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-red-950/40 text-red-400 border border-red-900/30 uppercase tracking-wider">{m.status || 'Unread'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 bg-slate-900/50 p-2.5 border border-slate-900 rounded-lg font-sans leading-relaxed break-words whitespace-pre-wrap">{m.message}</p>
                    </div>
                    <button type="button" onClick={() => handleDeleteSupportMessage(m.id)} className="w-full py-1.5 bg-red-950/20 hover:bg-red-900/40 text-red-400 font-bold border border-red-950/50 rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" /> Clear Ticket</button>
                  </div>
                ))}
                {supportMessages.length === 0 && <div className="col-span-full py-8 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">Your system support communication queue is completely empty.</div>}
              </div>
            )}
          </div>

          <div className="p-5 bg-rose-950/20 border border-rose-900/40 rounded-2xl space-y-3">
            <div><span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">💥 Destructive Global Purge</span><p className="text-[11px] text-slate-400 mt-0.5">Wipes inventory structures inside Firestore collections completely back to 0 items maps.</p></div>
            <button type="button" onClick={async () => { if(confirm("Purge global entries?")) { try { await clearInventoryToZero(); alert('Purged successfully.'); } catch(e: any) { alert(e.message); } } }} className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold rounded-xl text-xs cursor-pointer shadow-md">FORCE RESET DATABASE</button>
          </div>
        </div>
      )}
      {/* ⚠️ SAFETY DELETION CONFIRMATION OVERLAYS MODALS POPUPS */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => !isDeletingUser && setUserToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10 text-left">
              <div className="bg-red-600 p-5 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">⚠️ Confirm Permanent Account Removal?</h3>
                <button type="button" onClick={() => setUserToDelete(null)} className="p-1 rounded-lg text-red-200 hover:text-white transition"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600">Are you sure you want to permanently delete this user profile? This action will immediately terminate all access clearances inside the system portal.</p>
                <div className="p-4 bg-slate-50 border rounded-2xl text-xs font-semibold text-slate-800">{userToDelete.email}</div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" disabled={isDeletingUser} onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="button" onClick={handlePermanentDeleteUser} disabled={isDeletingUser} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer transition hover:bg-red-700 shadow-sm">Delete Account</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {metadataToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setMetadataToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10 text-left">
              <div className="bg-red-600 p-5 text-white flex justify-between items-center"><h3 className="font-bold text-sm tracking-wide">Permanently Delete Option?</h3><button type="button" onClick={() => setMetadataToDelete(null)} className="p-1 rounded-lg text-red-200 hover:text-white transition"><X className="w-5 h-5" /></button></div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600">Are you sure you want to delete this metadata configuration record profile row?</p>
                <div className="p-4 bg-slate-50 border rounded-2xl text-xs font-semibold text-slate-800">{metadataToDelete.label}</div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setMetadataToDelete(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Cancel</button>
                  <button type="button" onClick={confirmDeleteMetadata} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold">Delete Option</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
