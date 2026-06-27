import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { storage } from '../firebase'; // 💼 LINK TO THE REBOOTED FIRESTORE CORE STORAGE CONFIG
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // 🖼️ UTILITIES TO CHUNK & UPLOAD LOCAL IMAGE ASSETS
import { clearInventoryToZero, seedSchools } from '../customSeeder';
import { 
  School as SchoolIcon, Shirt, Maximize2, Palette, MapPin, Trash2, Plus, 
  AlertCircle, Edit2, Check, X, Users, Wrench, Shield, Mail, ShieldAlert, CheckCircle,
  GripVertical, ArrowUp, ArrowDown
} from 'lucide-react';


// ⚙️ UPGRADED MASTER TYPES FOR DATA STRUCTURE INTERFACES
interface AdvancedSchool {
  id: string;
  name: string;
  schoolType: string; // 🔓 UNLOCKED TO ALLOW ANY FLEXIBLE DESIGNATION LOGIC (e.g. NMH, JI)
  schoolIdCode: string; 
  skuCode: string; 
  logoUrl?: string; 
}

interface AdvancedAttribute {
  id: string;
  name?: string; // Used for garment types, colours, locations
  label?: string; // Used for sizes option
  skuCode: string; // typed manually by user (e.g. JUMP, s0708, BLK, PS)
  ruleProfile?: string; // Specific fallback modifier for locations mapping
}

// ⚙️ EXTENDED ATTRIBUTES PROP STRUCTURING WITH WEIGHTING LOGIC
interface AdvancedSchool {
  id: string;
  name: string;
  schoolType: string; 
  schoolIdCode: string; 
  skuCode: string; 
  logoUrl?: string; 
}

interface AdvancedAttribute {
  id: string;
  name?: string; 
  label?: string; 
  skuCode: string; 
  ruleProfile?: string; 
  sortOrder?: number;        // ⚖️ Numerical weight to dynamically position tabs & checkboxes from left to right
  sizeGroupTag?: string;     // 🏷️ Connects sizing options dynamically to specific garment categories
  requiresSchool?: boolean;  // 🏫 Enforces whether a top-level category tab requires school crest structures
}

interface AdminPanelProps {
  categories: AdvancedAttribute[]; // 📂 Dynamically streams your workspace navigation tabs right out of Firestore
  schoolClassifications: AdvancedAttribute[]; // 🧬 Mutable checkbox targets (e.g. F, J, I, N, M, H)
  schools: AdvancedSchool[];
  clothingTypes: AdvancedAttribute[];
  sizes: AdvancedAttribute[];
  colours: AdvancedAttribute[];
  locations: AdvancedAttribute[];
  userRole?: string;
}

type MainTabType = 'attributes' | 'staff' | 'dev';
// 🎛️ INFINITELY EXTENDED ATTRIBUTE SUB-TAB TYPE ROUTER LITERALS
type SubTabType = 'categories' | 'schoolClassifications' | 'schools' | 'types' | 'sizes' | 'colours' | 'locations';

export default function AdminPanel({
  categories, schoolClassifications, schools, clothingTypes, sizes, colours, locations, userRole = 'Dev'
}: AdminPanelProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('attributes');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('categories'); // 📂 Defaults cleanly to Categories Tab
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 📝 NEW MASTER CATEGORIES FORM STATE CONTROLS
  const [categoryName, setCategoryName] = useState('');
  const [categorySku, setCategorySku] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState(1);
  const [categoryRequiresSchool, setCategoryRequiresSchool] = useState(false);

  // 📝 NEW CLASSIFICATION TYPES STATE CONTROLS
  const [classValue, setClassValue] = useState('');
  const [classLabelName, setClassLabelName] = useState('');
  const [classSortOrder, setClassSortOrder] = useState(1);

  // 📝 SCHOOL REGISTRY CREATION INPUTS
  const [schoolName, setSchoolName] = useState('');
  const [schoolIdCode, setSchoolIdCode] = useState('');
    // 📝 SEQUENTIAL PREFIX TRACKER: Manages vertical sequential stacks for processing SKUs
  // 📝 UNIFIED SCHOOL CLASSIFICATION MATRIX FORM CONTROLS
  const [newClassificationLabel, setNewClassificationLabel] = useState('');
  const [newClassificationKey, setNewClassificationKey] = useState('');

  // 💾 CHECKS MEMORY SWITCH ARRAYS FOR MUTABLE LOGO PRE-SETS
  const [selectedCreationTypes, setSelectedCreationTypes] = useState<string[]>([]);
  const [selectedEditingTypes, setSelectedEditingTypes] = useState<string[]>([]);

  // 📝 EXTENDED NO-CODE PARAMETER INPUT TARGET HOOKS
  const [customSkuSuffix, setCustomSkuSuffix] = useState(''); 
  const [attributeName, setAttributeName] = useState('');
  const [sizeGroupChoice, setSizeGroupChoice] = useState('YOUTH_AGE'); // 🏷️ Maps to Sizing category folder groupings
  const [locationProfile, setLocationProfile] = useState<'Fixed Shelf' | 'VacPac Storage'>('Fixed Shelf');
  const [vacPacNumber, setVacPacNumber] = useState(1); // 📦 Used to dynamically generate padded locations like UO01
  const [vacPacZonePrefix, setVacPacZonePrefix] = useState('UO'); 
  
  // 📝 CORE INTERACTIVE DOUBLE INLINE ROWS LAYOUT BUFFERS
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editSkuValue, setEditSkuValue] = useState(''); 
  const [editProfileValue, setEditProfileValue] = useState<'Fixed Shelf' | 'VacPac Storage'>('Fixed Shelf');
  const [editSchoolIdCode, setEditSchoolIdCode] = useState('');
  const [editSchoolLogoUrl, setEditSchoolLogoUrl] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(1);
  const [editSizeGroupTag, setEditSizeGroupTag] = useState('YOUTH_AGE');
  const [editRequiresSchool, setEditRequiresSchool] = useState(false);

  // 💾 TEMPORARY FILE BUFFERS FOR PHYSICAL COMPUTER/PHONE IMAGE UPLOADS
  const [selectedCreationFile, setSelectedCreationFile] = useState<File | null>(null);
  const [selectedEditingFile, setSelectedEditingFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
    // 🛡️ DEV CONSOLE FIREWALL PASSWORD CONTROLS
  const [devPasswordModalOpen, setDevPasswordModalOpen] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [pendingDevAction, setPendingDevAction] = useState<'seed' | 'purge' | null>(null);
  // 🚪 DEV OVERRIDE CONTROL: Master switch flag to enable or disable the logo 5-click bypass door
  // 🚪 PERMANENT REPOSITORY FIREWALL LINK: Reads straight from physical disk storage state parameters
  const [devBypassActive, setDevBypassActive] = useState<boolean>(() => {
    return localStorage.getItem('ue_dev_bypass_flag') === 'true';
  });

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

  // 🎛️ MASTER NO-CODE ROUTER NAVIGATION CONFIG DECK (INFINITELY EXTENDABLE ATTR SWITCHES)
  const tabsConfig = [
    { id: 'categories', label: 'Master Categories', icon: Shirt, count: categories?.length || 0, placeholder: 'e.g. Logo Items', skuPlaceholder: 'e.g. LOGO' },
    { id: 'schoolClassifications', label: 'Classifications Matrix', icon: Maximize2, count: schoolClassifications?.length || 0, placeholder: 'e.g. First School', skuPlaceholder: 'e.g. F' },
    { id: 'schools', label: 'Schools Registry', icon: SchoolIcon, count: schools.length, placeholder: 'e.g. All Hallows Primary', skuPlaceholder: 'e.g. ALHW' },
    { id: 'types', label: 'Garment Types', icon: Shirt, count: clothingTypes.length, placeholder: 'e.g. Jumper', skuPlaceholder: 'e.g. JUMP' },
    { id: 'sizes', label: 'Sizes Option', icon: Maximize2, count: sizes.length, placeholder: 'e.g. 7-8yrs', skuPlaceholder: 'e.g. S0708' },
    { id: 'colours', label: 'Colours Profile', icon: Palette, count: colours.length, placeholder: 'e.g. Navy Blue', skuPlaceholder: 'e.g. NVBL' },
    { id: 'locations', label: 'Locations Mapping', icon: MapPin, count: locations.length, placeholder: 'e.g. Upper Office Pickers', skuPlaceholder: 'e.g. UO' },
  ];

  // 📡 REAL-TIME CLOUD HUB LIFECYCLE LISTENERS
  const [cloudBypassActive, setCloudBypassActive] = useState<boolean>(false);

  useEffect(() => {
    if (activeMainTab === 'staff') fetchStaffUsers();
    if (activeMainTab === 'dev' && isDevUser) fetchSupportMessages();

    // 🔒 Direct server document connection: forces your slider track to match your database live
    const unsubscribe = onSnapshot(doc(db, 'system_config', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        const serverState = snapshot.data().dev_bypass_active === true;
        setCloudBypassActive(serverState);
        localStorage.setItem('ue_cloud_bypass_ui', String(serverState)); // Pre-loads login layout hooks
      }
    });

    return () => unsubscribe(); // Unbinds the cloud data stream cleanly on unmount
  }, [activeMainTab]);


  const cancelEdit = () => { 
    setEditingId(null); 
    setEditNameValue(''); 
    setEditSkuValue(''); 
    setEditSchoolIdCode(''); 
    setEditSchoolLogoUrl('');
    setEditSortOrder(1);
    setEditSizeGroupTag('YOUTH_AGE');
    setEditRequiresSchool(false);
    setSelectedEditingTypes([]); 
    setSelectedEditingFile(null); 
  };

  const startEdit = (item: any) => {
    setSelectedEditingFile(null);
    setEditingId(item.id);
    setEditNameValue(item.label || item.name || '');
    setEditSkuValue(item.sku || item.skuCode || '');
    if (item.profile || item.ruleProfile) setEditProfileValue(item.profile || item.ruleProfile);
    
    // 🧬 RECURSIVE SYNC: Pre-load the fresh dynamic database parameters on-click
    if (activeSubTab === 'categories') {
      const match = categories.find(c => c.id === item.id);
      if (match) {
        setEditSortOrder(match.sortOrder || 1);
        setEditRequiresSchool(match.requiresSchool || false);
      }
    } else if (activeSubTab === 'schoolClassifications') {
      const match = schoolClassifications.find(c => c.id === item.id);
      if (match) setEditSortOrder(match.sortOrder || 1);
    } else if (activeSubTab === 'schools') {
      const match = schools.find(s => s.id === item.id);
      if (match) {
        setEditSchoolIdCode(match.schoolIdCode || '');
        setEditSchoolLogoUrl(match.logoUrl || '');
        setSelectedEditingTypes(match.schoolType ? match.schoolType.split('') : []);
      }
    } else if (activeSubTab === 'types') {
      const match = clothingTypes.find(t => t.id === item.id);
      if (match) setEditSizeGroupTag(match.sizeGroupTag || 'YOUTH_AGE');
    } else if (activeSubTab === 'sizes') {
      const match = sizes.find(s => s.id === item.id);
      if (match) setEditSizeGroupTag(match.sizeGroupTag || 'YOUTH_AGE');
    }
  };

  // 🧬 MATRIX STRING ASSEMBLER: Reads your mutable classifications collection and compiles left-to-right
  const compileMatrixString = (checkedKeysList: string[]): string => {
    return [...schoolClassifications]
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(cfg => cfg.skuCode || '')
      .filter(key => checkedKeysList.includes(key))
      .join('');
  };

  // ⚖️ MATRIX LAYER SWAPPER: Shuffles global sorting weights up or down in real-time
  const handleShiftClassificationOrder = async (index: number, direction: 'up' | 'down', currentList: any[]) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    try {
      setIsUploadingImage(true);
      const itemA = currentList[index];
      const itemB = currentList[targetIndex];

      // Swap their numerical sort order weights internally
      const weightA = itemA.sortOrder || index + 1;
      const weightB = itemB.sortOrder || targetIndex + 1;

      await Promise.all([
        updateDoc(doc(db, 'schoolClassifications', itemA.id), { sortOrder: weightB }),
        updateDoc(doc(db, 'schoolClassifications', itemB.id), { sortOrder: weightA })
      ]);
      
      showNotification('success', 'Global classification sorting order re-aligned.');
    } catch (err: any) {
      showNotification('error', `Sorting shift failed: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ➕ INLINE PARAMETER REGISTER: Appends a completely custom tier option straight to the database list
  const handleAddNewClassificationOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newClassificationLabel.trim();
    const cleanKey = newClassificationKey.trim().toUpperCase().replace(/[^A-Z]/g, '');

    if (!cleanLabel || !cleanKey) {
      return showNotification('error', 'Both the Display Label and 1-Letter Key are required.');
    }
    if (cleanKey.length !== 1) {
      return showNotification('error', 'The classification key must be exactly ONE single letter code.');
    }

    // Absolute duplicate blocker query check
    if (schoolClassifications.some(c => (c.skuCode || '').toUpperCase() === cleanKey || c.name?.toLowerCase() === cleanLabel.toLowerCase())) {
      return showNotification('error', `Registration Refused: An option with key "${cleanKey}" or name "${cleanLabel}" already exists.`);
    }

    try {
      setIsUploadingImage(true);
      const nextSortWeight = schoolClassifications.length + 1;

      await addDoc(collection(db, 'schoolClassifications'), {
        name: cleanLabel,
        skuCode: cleanKey,
        sortOrder: nextSortWeight
      });

      showNotification('success', `"${cleanLabel} (${cleanKey})" successfully integrated into option definitions.`);
      setNewClassificationLabel('');
      setNewClassificationKey('');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsUploadingImage(false);
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

  // 📡 INLINE DATABASE EDIT SAVER (UPGRADED FOR TICK-BOX MATRIX DESIGNATIONS)
  const handleSaveEdit = async (collectionName: string, id: string) => {
    if (!editNameValue.trim()) {
      showNotification('error', 'The display name field cannot be blank.');
      return;
    }
    
    try {
      const updateData: any = {};
      const targetedTable = collectionName === 'types' ? 'clothingTypes' : collectionName;
      
      if (targetedTable === 'schools') {
        // 🧬 Compile the individual selected ticks into a strict left-to-right ordered string
        const finalSchoolType = compileMatrixString(selectedEditingTypes);
        const finalSchoolIdCode = editSchoolIdCode.trim().toUpperCase();
        
        if (!finalSchoolIdCode) {
          showNotification('error', 'Save Cancelled: School 4-Letter Abbreviation ID is blank.');
          return;
        }
        
        const recalculatedSku = `${finalSchoolType}${finalSchoolIdCode}`;
        setIsUploadingImage(true);
        let dynamicCloudLogoUrl = editSchoolLogoUrl.trim();

        // 🖼️ Cloud Storage Media Pipe
        if (selectedEditingFile) {
          try {
            const safeSkuPath = recalculatedSku.replace(/[^A-Z0-9]/gi, '') || id;
            dynamicCloudLogoUrl = await uploadSchoolLogo(selectedEditingFile, safeSkuPath);
          } catch (storageErr: any) {
            showNotification('error', `Image Cloud Storage Upload Failed: ${storageErr.message}`);
            setIsUploadingImage(false);
            return;
          }
        }
        
        updateData.name = editNameValue.trim();
        updateData.schoolType = finalSchoolType;
        updateData.schoolIdCode = finalSchoolIdCode;
        updateData.skuCode = recalculatedSku;
        updateData.logoUrl = dynamicCloudLogoUrl;
      } else {
        if (targetedTable === 'sizes') updateData.label = editNameValue.trim();
        else updateData.name = editNameValue.trim();
        
        if (editSkuValue.trim()) {
          updateData.skuCode = editSkuValue.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
        if (targetedTable === 'locations') updateData.ruleProfile = editProfileValue;
      }
      
      await updateDoc(doc(db, targetedTable, id), updateData);
      showNotification('success', 'School record matrix cleanly updated and synchronized!');
      cancelEdit();
    } catch (err: any) { 
      showNotification('error', `Database Write Error: ${err.message}`); 
    } finally {
      setIsUploadingImage(false);
    }
  };

  // 🖼️ CORE LOCAL STORAGE FILE UPLOADER ENGINE
  const uploadSchoolLogo = async (file: File, finalSku: string): Promise<string> => {
    // Force specific file name structure to automatically overwrite matching old items in free tier bucket
    const storagePath = `school_logos/${finalSku.toUpperCase()}.png`;
    const storageRef = ref(storage, storagePath);
    
    // Upload the raw byte data chunk streams directly to Google Firebase Storage cloud buckets
    await uploadBytes(storageRef, file);
    
    // Snatch a secure, permanent, direct web link URL to inject straight into Firestore registry rows
    const directDownloadUrl = await getDownloadURL(storageRef);
    return directDownloadUrl;
  };


  // 📡 NO-CODE REGISTRY INJECTOR (WITH AUTOMATED DATA CASING & BLOCKERS)
  const executeAddMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Map internal tracking collections to their exact Firestore collection paths
    let targetedCollection = activeSubTab;
    if (activeSubTab === 'types') targetedCollection = 'clothingTypes' as any;
    if (activeSubTab === 'schoolClassifications') targetedCollection = 'schoolClassifications' as any;

    try {
      if (activeSubTab === 'categories') {
        if (!categoryName.trim() || !categorySku.trim()) return showNotification('error', 'Category Name and SKU Code are required.');
        const finalName = categoryName.trim();
        const finalSku = categorySku.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Absolute duplicate checker
        if (categories.some(c => c.name?.toLowerCase() === finalName.toLowerCase() || c.skuCode === finalSku)) {
          return showNotification('error', 'A category with this name or SKU already exists.');
        }

        await addDoc(collection(db, 'categories'), {
          name: finalName,
          skuCode: finalSku,
          sortOrder: Number(categorySortOrder) || 1,
          requiresSchool: categoryRequiresSchool
        });

      } else if (activeSubTab === 'schoolClassifications') {
        if (!classLabelName.trim() || !classValue.trim()) return showNotification('error', 'Classification Name and Ticket Key are required.');
        const finalKey = classValue.trim().toUpperCase().replace(/[^A-Z]/g, ''); // Enforces clean letter characters
        
        if (schoolClassifications.some(c => c.skuCode === finalKey || c.name?.toLowerCase() === classLabelName.trim().toLowerCase())) {
          return showNotification('error', 'This classification key or description is already registered.');
        }

        await addDoc(collection(db, 'schoolClassifications'), {
          name: classLabelName.trim(),
          skuCode: finalKey,
          sortOrder: Number(classSortOrder) || 1
        });

      } else if (activeSubTab === 'schools') {
        if (!schoolName.trim() || !schoolIdCode.trim()) return showNotification('error', 'School Name and 4-Letter Abbreviation ID are required.');
        const finalAbbreviation = schoolIdCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
        
        if (finalAbbreviation.length < 4) return showNotification('error', 'School Abbreviation ID must be exactly 4 letters long.');
        
        const finalTypePrefix = compileMatrixString(selectedCreationTypes);
        const combinedSchoolSku = `${finalTypePrefix}${finalAbbreviation}`;

        if (schools.some(s => s.schoolIdCode === finalAbbreviation || s.name.toLowerCase() === schoolName.trim().toLowerCase())) {
          return showNotification('error', 'This school name or abbreviation ID already exists.');
        }

        setIsUploadingImage(true);
        let dynamicCloudLogoUrl = '';

        if (selectedCreationFile) {
          dynamicCloudLogoUrl = await uploadSchoolLogo(selectedCreationFile, combinedSchoolSku);
        }

        await addDoc(collection(db, 'schools'), {
          name: schoolName.trim(),
          schoolType: finalTypePrefix,
          schoolIdCode: finalAbbreviation,
          skuCode: combinedSchoolSku,
          logoUrl: dynamicCloudLogoUrl
        });

      } else if (activeSubTab === 'types') {
        if (!attributeName.trim()) return showNotification('error', 'Garment Type Name is required.');
        
        // 🧼 RULE: Force dynamic Multi-Word snake_case layout format
        const normalisedGarmentName = attributeName.trim()
          .replace(/\s+/g, '_')
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('_');

        if (clothingTypes.some(t => t.name?.toLowerCase() === normalisedGarmentName.toLowerCase())) {
          return showNotification('error', `Registration Refused: "${normalisedGarmentName}" already exists.`);
        }

        // ✂️ RULE: Strip underscores and clip machine suffix code strictly to a 4-letter max upper limit
        const cleanSkuBase = normalisedGarmentName.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const finalEnforcedSku = cleanSkuBase.substring(0, 4);

        await addDoc(collection(db, 'clothingTypes'), {
          name: normalisedGarmentName,
          skuCode: finalEnforcedSku,
          sizeGroupTag: sizeGroupChoice
        });

      } else if (activeSubTab === 'sizes') {
        if (!attributeName.trim()) return showNotification('error', 'Size Option Label is required.');
        
        // 🧼 RULE: Force snake_case underscored labels for multi-word sizes (e.g. Adult_9-12)
        const normalisedSizeLabel = attributeName.trim()
          .replace(/\s+/g, '_')
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('_');

        // ✂️ RULE: Strip all quote symbols and punctuation marks to make clean machine codes (e.g. 2022)
        const cleanSizeSku = normalisedSizeLabel.replace(/[^A-Z0-9]/gi, '').toUpperCase();

        if (sizes.some(s => s.label?.toLowerCase() === normalisedSizeLabel.toLowerCase() && s.sizeGroupTag === sizeGroupChoice)) {
          return showNotification('error', 'This size option is already registered under this sizing group folder.');
        }

        await addDoc(collection(db, 'sizes'), {
          label: normalisedSizeLabel,
          skuCode: cleanSizeSku,
          sizeGroupTag: sizeGroupChoice
        });

      } else if (activeSubTab === 'colours') {
        if (!attributeName.trim()) return showNotification('error', 'Colour Profile Name is required.');
        const finalColourName = attributeName.trim().charAt(0).toUpperCase() + attributeName.trim().slice(1).toLowerCase();
        
        // ✂️ RULE: Force absolute 4-letter bold uppercase constraints (e.g. BLAK, BLUE)
        const cleanColourSku = finalColourName.replace(/[^A-Z]/gi, '').toUpperCase().substring(0, 4);

        if (colours.some(c => c.name?.toLowerCase() === finalColourName.toLowerCase() || c.skuCode === cleanColourSku)) {
          return showNotification('error', 'This colour name description or 4-letter SKU token already exists.');
        }

        await addDoc(collection(db, 'colours'), {
          name: finalColourName,
          skuCode: cleanColourSku
        });

      } else if (activeSubTab === 'locations') {
        if (!attributeName.trim()) return showNotification('error', 'Friendly Location Identifier Label is required.');
        const baseLocationLabel = attributeName.trim();
        let computedLocationSku = '';

        if (locationProfile === 'Fixed Shelf') {
          // 🧼 RULE: Fixed shelves bypass extensions and compile down strictly to 2 letters (e.g. PS)
          computedLocationSku = baseLocationLabel.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 2) || 'PS';
        } else {
          // 📦 RULE: VacPac Storage dynamically joins your zone code with a strict 2-digit padded package string
          const cleanZone = vacPacZonePrefix.trim().toUpperCase().replace(/[^A-Z]/g, '').substring(0, 2) || 'VP';
          const paddedNumber = String(vacPacNumber).padStart(2, '0'); // Pads 1 -> 01, 12 -> 12
          computedLocationSku = `${cleanZone}${paddedNumber}`;
        }

        if (locations.some(l => l.skuCode === computedLocationSku)) {
          return showNotification('error', `Location Slot Code "${computedLocationSku}" is already active in your system routing map.`);
        }

        await addDoc(collection(db, 'locations'), {
          name: baseLocationLabel,
          ruleProfile: locationProfile,
          skuCode: computedLocationSku
        });
      }

      showNotification('success', 'Component parameter generated and normalised successfully.');
      // Flush fields
      setCategoryName(''); setCategorySku(''); setClassLabelName(''); setClassValue('');
      setSchoolName(''); setSchoolIdCode(''); setAttributeName(''); setCustomSkuSuffix('');
      setSelectedCreationTypes([]); setSelectedCreationFile(null);
    } catch (err: any) { 
      showNotification('error', err.message); 
    } finally {
      setIsUploadingImage(false);
    }
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
      case 'categories': return categories.map(c => ({ id: c.id, label: c.name || '', sku: c.skuCode || '', profile: `Sort Order: ${c.sortOrder || 1} ${c.requiresSchool ? '★ Requires School' : ''}` }));
      case 'schoolClassifications': return schoolClassifications.map(c => ({ id: c.id, label: c.name || '', sku: c.skuCode || '', profile: `Weight Weight: ${c.sortOrder || 1}` }));
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
  
  // 🛡️ RECURSIVE DEPENDENCY PROTECTION SCANNER DEFINITION
  const verifyAttributeIsSafeToDelete = async (collectionName: string, id: string, label: string): Promise<boolean> => {
    try {
      // 1. Recursive check: Safeguard mutable School Classification toggles (e.g., "J") before checking warehouse stock
      if (collectionName === 'schoolClassifications') {
        const targetClassification = schoolClassifications.find(c => c.id === id);
        if (targetClassification && targetClassification.skuCode) {
          const classificationKey = targetClassification.skuCode;
          const assignedSchools = schools.filter(s => s.schoolType && s.schoolType.split('').includes(classificationKey));
          if (assignedSchools.length > 0) {
            showNotification('error', `Deletion Blocked: Classification "${classificationKey}" is actively assigned to ${assignedSchools.length} school profiles (e.g. ${assignedSchools[0].name}).`);
            return false;
          }
        }
      }

      // 📡 Dynamic cross-reference query layer: Fetch live inventory tracking rows
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      if (inventorySnapshot.empty) return true; // No warehouse stock exists; safe to clear parameter

      const allActiveStockRows = inventorySnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

      // Match targets to their actual configuration identifiers
      const targetRecord = 
        collectionName === 'categories' ? categories.find(c => c.id === id) :
        collectionName === 'clothingTypes' ? clothingTypes.find(t => t.id === id) :
        collectionName === 'sizes' ? sizes.find(s => s.id === id) :
        collectionName === 'colours' ? colours.find(c => c.id === id) :
        collectionName === 'locations' ? locations.find(l => l.id === id) : null;

      // Extract raw data keys for column mapping lookups
      const targetName = targetRecord?.name || '';
      const targetSku = targetRecord?.skuCode || '';
      const targetSizeLabel = (targetRecord as any)?.label || '';

      // 🚨 7-LAYER INTERACTIVE PROTECTION MATRIX FILTER LOGIC
      for (const item of allActiveStockRows) {
        // Condition 1: Safeguard Categories Column
        if (collectionName === 'categories' && targetName && item.category === targetName) {
          showNotification('error', `Deletion Blocked: "${targetName}" is attached to active stock items inside the warehouse floor.`);
          return false;
        }
        // Condition 2: Safeguard Schools Registry Column
        if (collectionName === 'schools') {
          const schoolMatch = schools.find(s => s.id === id);
          if (schoolMatch && item.school === schoolMatch.name) {
            showNotification('error', `Deletion Blocked: "${schoolMatch.name}" holds registered apparel items inside your stock grids.`);
            return false;
          }
        }
        // Condition 3: Safeguard Garment Types Column (Triggers on Name or Suffix SKU match)
        if (collectionName === 'clothingTypes' && ((targetName && item.garmentType === targetName) || (targetSku && item.skuCode?.includes(targetSku)))) {
          showNotification('error', `Deletion Blocked: Garment parameter "${targetName || targetSku}" is currently assigned to clothes on the warehouse floor.`);
          return false;
        }
        // Condition 4: Safeguard Sizes Option Column
        if (collectionName === 'sizes' && targetSizeLabel && item.size === targetSizeLabel) {
          showNotification('error', `Deletion Blocked: Size code "${targetSizeLabel}" holds active physical product quantities.`);
          return false;
        }
        // Condition 5: Safeguard Colours Profile Column
        if (collectionName === 'colours' && targetName && item.colour === targetName) {
          showNotification('error', `Deletion Blocked: Colour string "${targetName}" is tied to live products.`);
          return false;
        }
        // Condition 6 & 7: Safeguard Locations Mapping & Specific Vacuum Pack Numbers Columns
        if (collectionName === 'locations' && targetSku && item.location === targetSku) {
          const profileType = targetRecord?.ruleProfile || 'Storage Slot';
          showNotification('error', `Deletion Blocked: Location ${profileType} "${targetSku}" is not empty. Relocate its quantities first.`);
          return false;
        }
      }

      return true; // No blocking dependencies found; safe to delete document row
    } catch (e: any) {
      console.error("Dependency check failed: ", e);
      return false;
    }
  };

  const confirmDeleteMetadata = async () => {
    if (!metadataToDelete) return;
    setIsDeletingMetadata(true);
    
    try {
      // 🔓 Run the live 7-layer dependency scanner shield match
      const isSafe = await verifyAttributeIsSafeToDelete(
        metadataToDelete.collectionName, 
        metadataToDelete.id, 
        metadataToDelete.label
      );

      if (!isSafe) {
        setMetadataToDelete(null);
        return; // Scanner blocked deletion; system integrity preserved
      }

      // Execute deletion from Firestore configuration folders
      await deleteDoc(doc(db, metadataToDelete.collectionName, metadataToDelete.id));
      showNotification('success', 'Attribute mapping successfully deleted from parameters registry.');
      setMetadataToDelete(null);
    } catch (e: any) { 
      showNotification('error', `Database Deletion Failure: ${e.message}`); 
    } finally { 
      setIsDeletingMetadata(false); 
    }
  };

  return (
    <div id="admin-panel" className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden text-left">
      <div className="border-b border-slate-200 bg-slate-50/50 p-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => setActiveMainTab('attributes')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${activeMainTab === 'attributes' ? 'bg-brand-primary text-white border-brand-primary shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>🎛️ Stock Attributes</button>
        <button type="button" onClick={() => setActiveMainTab('staff')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 transition ${activeMainTab === 'staff' ? 'bg-brand-primary text-white border-brand-primary shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Users className="w-3.5 h-3.5" /><span>Manage Staff</span></button>
        {isDevUser && <button type="button" onClick={() => setActiveMainTab('dev')} className={`px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 transition ${activeMainTab === 'dev' ? 'bg-brand-secondary text-white border-brand-secondary shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Wrench className="w-3.5 h-3.5" /><span>Dev Tools</span></button>}
      </div>

      {activeMainTab === 'attributes' && (
        <div className="divide-y divide-slate-100">
          <div className="bg-white px-4 py-2 flex flex-wrap gap-2">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { setActiveSubTab(tab.id as SubTabType); cancelEdit(); }} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${isActive ? 'bg-brand-yellow text-slate-900 border border-brand-yellow' : 'text-slate-600 hover:bg-slate-100 border border-transparent'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{tab.count}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50/60 border border-slate-200/60 p-5 rounded-2xl h-fit space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Configure Parameter</h4>
              <form onSubmit={executeAddMetadata} className="space-y-3">
                {activeSubTab === 'categories' && (
                  <>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Category Name</label>
                      <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">SKU Code</label>
                      <input type="text" value={categorySku} onChange={(e) => setCategorySku(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs uppercase" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Sort Order</label>
                      <input type="number" value={categorySortOrder} onChange={(e) => setCategorySortOrder(Number(e.target.value))} className="w-full p-2.5 border rounded-xl text-xs" />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={categoryRequiresSchool} onChange={(e) => setCategoryRequiresSchool(e.target.checked)} />
                      Requires school selection
                    </label>
                  </>
                )}

                {activeSubTab === 'schoolClassifications' && (
                  <>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Classification Label</label>
                      <input type="text" value={classLabelName} onChange={(e) => setClassLabelName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Single Letter Key</label>
                      <input type="text" maxLength={1} value={classValue} onChange={(e) => setClassValue(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs uppercase" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Sort Order</label>
                      <input type="number" value={classSortOrder} onChange={(e) => setClassSortOrder(Number(e.target.value))} className="w-full p-2.5 border rounded-xl text-xs" />
                    </div>
                  </>
                )}

                {activeSubTab === 'schools' && (
                  <>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">School Name</label>
                      <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">School Abbreviation</label>
                      <input type="text" maxLength={4} value={schoolIdCode} onChange={(e) => setSchoolIdCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="w-full p-2.5 border rounded-xl text-xs uppercase" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Classification Type</label>
                      <div className="rounded-xl border bg-white p-2 space-y-2 max-h-48 overflow-auto">
                        {schoolClassifications.map((cfg) => {
                          const isChecked = selectedCreationTypes.includes(cfg.skuCode || '');
                          return (
                            <label key={cfg.id} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <input type="checkbox" checked={isChecked} onChange={() => setSelectedCreationTypes((prev) => prev.includes(cfg.skuCode || '') ? prev.filter((k) => k !== cfg.skuCode) : [...prev, cfg.skuCode || ''])} />
                              <span>{cfg.name} <span className="text-[10px] font-mono text-slate-400">({cfg.skuCode})</span></span>
                            </label>
                          );
                        })}
                        {schoolClassifications.length === 0 && <p className="text-[11px] text-slate-400">No classification options are currently available.</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">School Crest</label>
                      <input type="file" accept="image/*" onChange={(e) => setSelectedCreationFile(e.target.files ? e.target.files[0] : null)} className="w-full text-xs" />
                    </div>
                  </>
                )}

                {activeSubTab === 'types' && (
                  <div>
                    <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Garment Type Name</label>
                    <input type="text" value={attributeName} onChange={(e) => setAttributeName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                  </div>
                )}

                {activeSubTab === 'sizes' && (
                  <div>
                    <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Size Label</label>
                    <input type="text" value={attributeName} onChange={(e) => setAttributeName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                  </div>
                )}

                {activeSubTab === 'colours' && (
                  <div>
                    <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Colour Name</label>
                    <input type="text" value={attributeName} onChange={(e) => setAttributeName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                  </div>
                )}

                {activeSubTab === 'locations' && (
                  <>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Location Name</label>
                      <input type="text" value={attributeName} onChange={(e) => setAttributeName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Profile</label>
                      <select value={locationProfile} onChange={(e) => setLocationProfile(e.target.value as any)} className="w-full p-2.5 border rounded-xl text-xs">
                        <option value="Fixed Shelf">Fixed Shelf</option>
                        <option value="VacPac Storage">VacPac Storage</option>
                      </select>
                    </div>
                  </>
                )}

                <button type="submit" className="w-full py-2.5 px-4 bg-brand-primary text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer">Register Component Code</button>
              </form>
              <div className="border-t border-slate-200/60 pt-4">
                <button type="button" onClick={handleExportCSV} className="w-full py-2 bg-white text-slate-700 font-bold rounded-xl border text-[11px] hover:bg-slate-50">Download Codes Template</button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{activeSubTab === 'schools' ? 'Active Registered Schools' : 'Active Configuration Parameters'}</h4>
              <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold">
                    <tr>
                      {activeSubTab === 'schools' && <th className="px-4 py-3 w-16">School Logo</th>}
                      <th className="px-4 py-3">{activeSubTab === 'schools' ? 'School Identity Profile' : 'Component Identifier Label'}</th>
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
                          {isSchoolTab && (
                            <td className="px-4 py-3 align-middle">
                              {item.logoUrl ? <img src={item.logoUrl} alt="Crest" className="w-8 h-8 object-contain rounded-xl border border-slate-200 p-0.5 bg-slate-50" /> : <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 border-dashed flex items-center justify-center text-[10px] font-bold text-slate-400">N/A</div>}
                            </td>
                          )}
                          <td className="px-4 py-3 font-medium text-slate-900 align-middle">
                            {isEditing ? (
                              isSchoolTab ? (
                                <div className="space-y-2 max-w-sm bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">School Full Name</label>
                                    <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="p-1.5 border rounded-lg text-xs bg-white w-full" />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Classification String</label>
                                    <input type="text" value={selectedEditingTypes.join('')} onChange={(e) => setSelectedEditingTypes(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').split(''))} className="p-1.5 border rounded-lg text-xs bg-white w-full uppercase font-mono" />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Abbreviation</label>
                                    <input type="text" maxLength={4} value={editSchoolIdCode} onChange={(e) => setEditSchoolIdCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="p-1.5 border rounded-lg text-xs bg-white w-full uppercase font-mono" />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5 max-w-xs text-left">
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Edit Display Label</label>
                                  <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="p-1.5 border rounded-lg text-xs bg-white w-full" />
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Edit Suffix Code</label>
                                  <input type="text" value={editSkuValue} onChange={(e) => setEditSkuValue(e.target.value)} className="p-1.5 border rounded-lg text-xs bg-white w-full uppercase font-mono" />
                                </div>
                              )
                            ) : (
                              <div className="space-y-0.5 text-left">
                                <span className="block font-semibold text-slate-900">{item.label}</span>
                                <span className="inline-block text-[9px] font-mono tracking-wider text-slate-400 bg-slate-50 border border-slate-100 px-1 rounded mt-0.5">SKU CODE: {item.sku}</span>
                              </div>
                            )}
                          </td>
                          {activeSubTab === 'locations' && (
                            <td className="px-4 py-3 text-slate-500 text-left align-middle">
                              {isEditing ? <select value={editProfileValue} onChange={(e) => setEditProfileValue(e.target.value as any)} className="p-1.5 border rounded-lg text-xs bg-white"><option value="Fixed Shelf">Fixed Shelf</option><option value="VacPac Storage">VacPac Storage</option></select> : item.profile}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right align-middle">
                            {isEditing ? (
                              <div className="flex justify-end gap-1">
                                <button type="button" disabled={isUploadingImage} onClick={() => handleSaveEdit(activeSubTab, item.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer disabled:opacity-40"><Check className="w-4 h-4" /></button>
                                <button type="button" disabled={isUploadingImage} onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-40"><X className="w-4 h-4" /></button>
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
                    {activeItems.length === 0 && <tr><td colSpan={activeSubTab === 'schools' ? 4 : 3} className="text-center py-8 text-slate-400">No layout parameters configured yet.</td></tr>}
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
          
          {/* 📡 PERMANENT DATABASE-ANCHORED SHORTCUT ACCELERATOR CONSOLE */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] text-brand-yellow uppercase tracking-widest font-bold block font-mono">🔑 Automated Logo Bypass Access Gateway</span>
              <p className="text-[11px] text-slate-400 leading-normal">Toggles developer bypass permissions directly inside your secure Firebase cloud server database. This setting survives all front-end cache purges and logouts.</p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-center">
              <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${localStorage.getItem('ue_cloud_bypass_ui') === 'true' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {localStorage.getItem('ue_cloud_bypass_ui') === 'true' ? 'BYPASS ACTIVE' : 'BYPASS LOCKED'}
              </span>
              <button 
                type="button" 
                onClick={async () => {
                  try {
                    setIsUploadingImage(true);
                    const configRef = doc(db, 'system_config', 'settings');
                    const configSnap = await getDoc(configRef);
                    
                    let nextState = true;
                    if (configSnap.exists()) {
                      nextState = !configSnap.data().dev_bypass_active;
                      await updateDoc(configRef, { dev_bypass_active: nextState });
                    } else {
                      await setDoc(configRef, { dev_bypass_active: nextState });
                    }
                    
                    localStorage.setItem('ue_cloud_bypass_ui', String(nextState));
                    showNotification('success', `Cloud Configuration updated: Developer bypass shortcut is now ${nextState ? 'ENABLED' : 'DISABLED'}.`);
                    
                    // Quick layout flash to sync visual frames smoothly
                    setTimeout(() => window.location.reload(), 100);
                  } catch (err: any) {
                    showNotification('error', `Database write failed: ${err.message}`);
                  } finally {
                    setIsUploadingImage(false);
                  }
                }}
                className={`w-11 h-6 rounded-full p-0.5 transition cursor-pointer flex-shrink-0 ${
                  localStorage.getItem('ue_cloud_bypass_ui') === 'true' 
                    ? 'bg-emerald-600 flex justify-end' 
                    : 'bg-slate-800 flex justify-start'
                }`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </div>



          {/* ⚡ TWO-WAY ON-DEMAND DEVELOPER RE-SEEDING MANAGEMENT HUB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div>
                <span className="text-[10px] text-brand-yellow uppercase tracking-widest font-bold block">🌱 On-Demand Database Generation Suite</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Streams pristine mock datasets (schools, types, items tracking arrays) directly into your live Firestore database rows. These records are 100% editable and deletable.</p>
              </div>
              <button 
                type="button" 
                onClick={() => { setPendingDevAction('seed'); setDevPasswordModalOpen(true); }} 
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold rounded-xl text-xs cursor-pointer shadow-md transition"
              >
                RUN LIVE DATABASE SEEDER
              </button>
            </div>

            <div className="p-5 bg-rose-950/20 border border-rose-900/40 rounded-2xl space-y-3">
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold block">💥 Destructive Global Purge</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Wipes inventory structures inside Firestore collections completely back to 0 items maps. Entries will never reappear until seeded on-demand.</p>
              </div>
              <button 
                type="button" 
                onClick={() => { setPendingDevAction('purge'); setDevPasswordModalOpen(true); }} 
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold rounded-xl text-xs cursor-pointer shadow-md transition"
              >
                FORCE RESET DATABASE
              </button>
            </div>
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
            {/* 🛡️ SECURITY OVERLAY MODAL GATE: CONSOLE PASSWORD VERIFICATION FIREWALL */}
      <AnimatePresence>
        {devPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => { setDevPasswordModalOpen(false); setDevPasswordInput(''); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative z-10 text-left font-mono p-6 space-y-4 text-slate-200">
              <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <h3 className="font-bold text-sm tracking-wide uppercase">Developer Access Validation</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">Warning: You are attempting to run a destructive macro query override. Enter your project authorization credentials to authenticate this action.</p>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">System Password Code</label>
                <input 
                  type="password" 
                  value={devPasswordInput} 
                  onChange={(e) => setDevPasswordInput(e.target.value)} 
                  placeholder="••••••••••••" 
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black tracking-widest text-emerald-400 focus:outline-none focus:border-rose-500" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => { setDevPasswordModalOpen(false); setDevPasswordInput(''); }} 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    // Enforce structural project development password validation
                    if (devPasswordInput === 'DevMode2026') {
                      setDevPasswordModalOpen(false);
                      setDevPasswordInput('');
                      setIsUploadingImage(true);
                      try {
                        if (pendingDevAction === 'seed') {
                          await seedSchools();
                          showNotification('success', 'Smart stock data arrays successfully shuffled and injected!');
                        } else if (pendingDevAction === 'purge') {
                          await clearInventoryToZero();
                          showNotification('success', 'Global warehouse tracking database successfully cleared back to 0.');
                        }
                      } catch (err: any) {
                        showNotification('error', err.message);
                      } finally {
                        setIsUploadingImage(false);
                        setPendingDevAction(null);
                      }
                    } else {
                      showNotification('error', 'Authentication Failure: Invalid project developer credentials.');
                      setDevPasswordModalOpen(false);
                      setDevPasswordInput('');
                      setPendingDevAction(null);
                    }
                  }} 
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  Unlock & Execute
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
