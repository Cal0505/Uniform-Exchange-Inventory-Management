import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, ClothingType, Size, Colour, Location, InventoryItem, Category, ItemType } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { generateSkuid, validateShelfCode } from '../skuUtils';
import {
  Package,
  Layers,
  Sparkles,
  AlertTriangle,
  ArrowRightLeft,
  ChevronRight,
  Plus,
  Trash2,
  ListFilter,
  CheckCircle2,
  Info,
  Edit2,
  Download,
  Upload,
  ChevronDown,
  X,
  FileSpreadsheet,
  Search
} from 'lucide-react';

import AddStockModal from './AddStockModal';
import CsvImportModal from './CsvImportModal';

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
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'totals' | 'logo' | 'plain'>('totals');
  const [logoViewMode, setLogoViewMode] = useState<'traits' | 'containers'>('traits');
  
  // Consolidated Totals States
  const [consolidatedSearchQuery, setConsolidatedSearchQuery] = useState('');

  // Logo Table States
  const [logoSearchQuery, setLogoSearchQuery] = useState('');
  const [logoFilterSchoolId, setLogoFilterSchoolId] = useState('all');
  const [logoFilterTypeId, setLogoFilterTypeId] = useState('all');
  const [logoFilterColourId, setLogoFilterColourId] = useState('all');
  const [logoFilterSizeId, setLogoFilterSizeId] = useState('all');
  const [logoActiveDropdown, setLogoActiveDropdown] = useState<'school' | 'type' | 'colour' | 'size' | null>(null);
  const [logoFilterOptionSearch, setLogoFilterOptionSearch] = useState('');

  // Plain Table States
  const [plainSearchQuery, setPlainSearchQuery] = useState('');
  const [plainFilterTypeId, setPlainFilterTypeId] = useState('all');
  const [plainFilterColourId, setPlainFilterColourId] = useState('all');
  const [plainFilterSizeId, setPlainFilterSizeId] = useState('all');
  const [plainActiveDropdown, setPlainActiveDropdown] = useState<'type' | 'colour' | 'size' | null>(null);
  const [plainFilterOptionSearch, setPlainFilterOptionSearch] = useState('');

  useEffect(() => {
    setLogoFilterOptionSearch('');
  }, [logoActiveDropdown]);

  useEffect(() => {
    setPlainFilterOptionSearch('');
  }, [plainActiveDropdown]);

  // Floating Dynamic Add Item Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<'Plain' | 'Logo'>('Plain');
  const [formType, setFormType] = useState<'single' | 'vacpac'>('single');

  // CSV Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Form States (for creating new stock)
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [shelfCode, setShelfCode] = useState('');
  const [packNumber, setPackNumber] = useState<number>(1);
  const [unitsPerPack, setUnitsPerPack] = useState<number>(10);
  
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedColourId, setSelectedColourId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [singlesQuantity, setSinglesQuantity] = useState<number>(5);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [transactionLoading, setTransactionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Editing and Popping custom state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editItemQty, setEditItemQty] = useState<number>(0);
  const [editItemShelf, setEditItemShelf] = useState<string>('');
  const [editItemLocationId, setEditItemLocationId] = useState<string>('');

  const [poppingVacPac, setPoppingVacPac] = useState<InventoryItem | null>(null);
  const [targetShelf, setTargetShelf] = useState<string>('');
  const [popError, setPopError] = useState<string | null>(null);

  // Custom delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; description: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-set first options on load if lists are populated
  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
    if (schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
    if (colours.length > 0 && !selectedColourId) {
      setSelectedColourId(colours[0].id);
    }
    if (clothingTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(clothingTypes[0].id);
    }
    if (sizes.length > 0 && !selectedSizeId) {
      setSelectedSizeId(sizes[0].id);
    }
  }, [locations, schools, colours, clothingTypes, sizes]);

  // Synchronize selectedLocation with formType
  useEffect(() => {
    const targetProfile = formType === 'single' ? 'Pickers Shelf' : 'VacPac Storage Area';
    const matchingLoc = locations.find(l => l.ruleProfile === targetProfile);
    if (matchingLoc) {
      setSelectedLocationId(matchingLoc.id);
    }
  }, [formType, locations]);

  // Selected object helpers
  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const selectedColour = colours.find(c => c.id === selectedColourId);
  const selectedType = clothingTypes.find(t => t.id === selectedTypeId);
  const selectedSize = sizes.find(s => s.id === selectedSizeId);

  // Compute live SKU ID preview
  const getCompiledSkuPreview = () => {
    if (!selectedSchool || !selectedColour || !selectedType || !selectedSize || !selectedLocation) {
      return 'Awaiting selections...';
    }

    if (formType === 'single') {
      if (!shelfCode.trim() || !validateShelfCode(shelfCode)) {
        return 'Enter valid shelf grid (A1-Z10)';
      }
      return generateSkuid({
        ruleProfile: 'Pickers Shelf',
        locationSku: selectedLocation.skuCode,
        shelfCode: shelfCode.toUpperCase(),
        schoolSku: selectedSchool.skuCode,
        colourSku: selectedColour.skuCode,
        typeSku: selectedType.skuCode,
        sizeSku: selectedSize.skuCode,
      });
    } else {
      if (packNumber <= 0) {
        return 'Enter valid pack number';
      }
      return generateSkuid({
        ruleProfile: 'VacPac Storage Area',
        locationSku: selectedLocation.skuCode,
        packNumber,
        schoolSku: selectedSchool.skuCode,
        colourSku: selectedColour.skuCode,
        typeSku: selectedType.skuCode,
        sizeSku: selectedSize.skuCode,
      });
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedLocation || !selectedSchool || !selectedColour || !selectedType || !selectedSize) {
      setFormError('Please complete all selection dropdowns.');
      return;
    }

    const isPickers = formType === 'single';

    // Validation
    if (isPickers) {
      if (!shelfCode.trim()) {
        setFormError('Please enter a shelf grid code.');
        return;
      }
      if (!validateShelfCode(shelfCode)) {
        setFormError('Shelf grid code must be in the format A1 to Z10 (e.g. E7, B3, Z10).');
        return;
      }
      if (singlesQuantity <= 0) {
        setFormError('Quantity must be greater than zero.');
        return;
      }
    } else {
      if (packNumber <= 0) {
        setFormError('Pack tracker ID must be a positive number.');
        return;
      }
      if (unitsPerPack <= 0) {
        setFormError('Units per pack must be greater than zero.');
        return;
      }
    }

    try {
      const cleanShelf = isPickers ? shelfCode.trim().toUpperCase() : '';
      const skuid = generateSkuid({
        ruleProfile: isPickers ? 'Pickers Shelf' : 'VacPac Storage Area',
        locationSku: selectedLocation.skuCode,
        shelfCode: cleanShelf,
        packNumber: isPickers ? undefined : packNumber,
        schoolSku: selectedSchool.skuCode,
        colourSku: selectedColour.skuCode,
        typeSku: selectedType.skuCode,
        sizeSku: selectedSize.skuCode,
      });

      if (isPickers) {
        // Picker Shelf anti-duplication rule: Merge and increment quantity atomically in Firestore
        const docId = `${skuid}_${cleanShelf}`;
        const docRef = doc(db, 'inventory', docId);

        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(docRef);
          if (docSnap.exists()) {
            const currentQty = docSnap.data().quantity || 0;
            transaction.update(docRef, {
              quantity: currentQty + singlesQuantity,
              category: formCategory,
              updatedAt: serverTimestamp(),
            });
          } else {
            transaction.set(docRef, {
              id: docId,
              skuid,
              type: 'single',
              category: formCategory,
              locationId: selectedLocation.id,
              locationSku: selectedLocation.skuCode,
              shelfCode: cleanShelf,
              schoolId: selectedSchool.id,
              schoolSku: selectedSchool.skuCode,
              colourId: selectedColour.id,
              colourSku: selectedColour.skuCode,
              typeId: selectedType.id,
              typeSku: selectedType.skuCode,
              sizeId: selectedSize.id,
              sizeSku: selectedSize.skuCode,
              quantity: singlesQuantity,
              updatedAt: serverTimestamp(),
            });
          }
        });

        setFormSuccess(`Successfully stored ${singlesQuantity} Singles onto shelf ${cleanShelf}. (SKUID: ${skuid})`);
      } else {
        // VacPac rules: unique per pack code
        const docId = skuid;
        const docRef = doc(db, 'inventory', docId);

        await setDoc(docRef, {
          id: docId,
          skuid,
          type: 'vacpac',
          category: formCategory,
          locationId: selectedLocation.id,
          locationSku: selectedLocation.skuCode,
          packNumber,
          schoolId: selectedSchool.id,
          schoolSku: selectedSchool.skuCode,
          colourId: selectedColour.id,
          colourSku: selectedColour.skuCode,
          typeId: selectedType.id,
          typeSku: selectedType.skuCode,
          sizeId: selectedSize.id,
          sizeSku: selectedSize.skuCode,
          quantity: unitsPerPack,
          updatedAt: serverTimestamp(),
        });

        setFormSuccess(`Successfully stored VacPac #${packNumber} with ${unitsPerPack} items inside. (SKUID: ${skuid})`);
        setPackNumber(prev => prev + 1); // Increment pack number automatically for convenient consecutive adding
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'inventory');
      setFormError('Failed to save to database: ' + err.message);
    }
  };

  const handleDeleteItem = (id: string, description: string) => {
    setItemToDelete({ id, description });
    setDeleteError(null);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, 'inventory', itemToDelete.id));
      setItemToDelete(null);
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `inventory/${itemToDelete.id}`);
      } catch (firestoreErr: any) {
        setDeleteError(firestoreErr.message || 'Error deleting stock item.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Grouped consolidated totals calculation
  // "Global Consolidated Total: For every uniform type combination, dynamically calculate and display a live aggregate sum..."
  interface ConsolidatedGroup {
    key: string;
    schoolName: string;
    colourName: string;
    typeName: string;
    sizeLabel: string;
    singlesCount: number;
    vacpacCount: number;
    vacpacTotalUnits: number;
    grandTotal: number;
  }

  // Statistics and breakdowns for Tab 1 (Inventory Totals)
  const stats = useMemo(() => {
    const totalLogoUnits = inventory.filter(item => item.category === 'Logo').reduce((acc, item) => acc + item.quantity, 0);
    const totalPlainUnits = inventory.filter(item => (item.category || 'Plain') !== 'Logo').reduce((acc, item) => acc + item.quantity, 0);
    const totalUnits = totalLogoUnits + totalPlainUnits;

    const totalSingles = inventory.filter(item => item.type === 'single').reduce((acc, item) => acc + item.quantity, 0);
    const totalVacpacs = inventory.filter(item => item.type === 'vacpac').reduce((acc, item) => acc + item.quantity, 0);
    const vacpacCount = inventory.filter(item => item.type === 'vacpac').length;
    const singlesCount = inventory.filter(item => item.type === 'single').length;

    return {
      totalLogoUnits,
      totalPlainUnits,
      totalUnits,
      totalSingles,
      totalVacpacs,
      vacpacCount,
      singlesCount
    };
  }, [inventory]);

  const schoolBreakdown = useMemo(() => {
    const breakdown: { [schoolSku: string]: { name: string; total: number; logo: number; plain: number } } = {};
    inventory.forEach(item => {
      const sSku = item.schoolSku;
      if (!breakdown[sSku]) {
        const sch = schools.find(s => s.skuCode === sSku);
        breakdown[sSku] = {
          name: sch?.name || sSku,
          total: 0,
          logo: 0,
          plain: 0
        };
      }
      breakdown[sSku].total += item.quantity;
      if (item.category === 'Logo') {
        breakdown[sSku].logo += item.quantity;
      } else {
        breakdown[sSku].plain += item.quantity;
      }
    });
    return Object.values(breakdown).sort((a, b) => b.total - a.total);
  }, [inventory, schools]);

  const garmentBreakdown = useMemo(() => {
    const breakdown: { [typeSku: string]: { name: string; total: number } } = {};
    inventory.forEach(item => {
      const tSku = item.typeSku;
      if (!breakdown[tSku]) {
        const t = clothingTypes.find(ct => ct.skuCode === tSku);
        breakdown[tSku] = {
          name: t?.name || tSku,
          total: 0
        };
      }
      breakdown[tSku].total += item.quantity;
    });
    return Object.values(breakdown).sort((a, b) => b.total - a.total);
  }, [inventory, clothingTypes]);

  // Logo Consolidated calculation (School, Garment Type, Colour, Size, Loose Singles, VacPacs, Locations, Total)
  const logoConsolidatedItems = useMemo(() => {
    interface LogoGroup {
      key: string;
      schoolSku: string;
      typeSku: string;
      colourSku: string;
      sizeSku: string;
      schoolName: string;
      typeName: string;
      colourName: string;
      sizeLabel: string;
      singles: InventoryItem[];
      vacpacs: InventoryItem[];
      totalSinglesQty: number;
      totalVacpacsQty: number;
      grandTotal: number;
    }

    const groups: { [key: string]: LogoGroup } = {};

    inventory.forEach((item) => {
      if ((item.category || 'Plain') !== 'Logo') return;

      const key = `${item.schoolSku}_${item.typeSku}_${item.colourSku}_${item.sizeSku}`;

      if (!groups[key]) {
        const sch = schools.find(s => s.skuCode === item.schoolSku)?.name || item.schoolSku;
        const col = colours.find(c => c.skuCode === item.colourSku)?.name || item.colourSku;
        const typ = clothingTypes.find(t => t.skuCode === item.typeSku)?.name || item.typeSku;
        const siz = sizes.find(s => s.skuCode === item.sizeSku)?.label || item.sizeSku;

        groups[key] = {
          key,
          schoolSku: item.schoolSku,
          typeSku: item.typeSku,
          colourSku: item.colourSku,
          sizeSku: item.sizeSku,
          schoolName: sch,
          colourName: col,
          typeName: typ,
          sizeLabel: siz,
          singles: [],
          vacpacs: [],
          totalSinglesQty: 0,
          totalVacpacsQty: 0,
          grandTotal: 0,
        };
      }

      if (item.type === 'single') {
        groups[key].singles.push(item);
        groups[key].totalSinglesQty += item.quantity;
      } else {
        groups[key].vacpacs.push(item);
        groups[key].totalVacpacsQty += item.quantity;
      }
    });

    Object.values(groups).forEach(g => {
      g.grandTotal = g.totalSinglesQty + g.totalVacpacsQty;
    });

    return Object.values(groups).sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  }, [inventory, schools, clothingTypes, colours, sizes]);

  // Plain Consolidated calculation (Garment Type, Colour, Size, VacPacs %, Locations, VacPac Numbers)
  const plainConsolidatedItems = useMemo(() => {
    interface PlainGroup {
      key: string;
      typeSku: string;
      colourSku: string;
      sizeSku: string;
      typeName: string;
      colourName: string;
      sizeLabel: string;
      vacpacs: {
        id: string;
        packNumber: number;
        quantity: number;
        percentFull: number;
        locationName: string;
        itemObj: InventoryItem;
      }[];
    }

    const groups: { [key: string]: PlainGroup } = {};

    inventory.forEach((item) => {
      if ((item.category || 'Plain') === 'Logo') return;

      const key = `${item.typeSku}_${item.colourSku}_${item.sizeSku}`;

      if (!groups[key]) {
        const col = colours.find(c => c.skuCode === item.colourSku)?.name || item.colourSku;
        const typ = clothingTypes.find(t => t.skuCode === item.typeSku)?.name || item.typeSku;
        const siz = sizes.find(s => s.skuCode === item.sizeSku)?.label || item.sizeSku;

        groups[key] = {
          key,
          typeSku: item.typeSku,
          colourSku: item.colourSku,
          sizeSku: item.sizeSku,
          typeName: typ,
          colourName: col,
          sizeLabel: siz,
          vacpacs: [],
        };
      }

      if (item.type === 'vacpac') {
        const capacity = 20; // Assume 20 items per standard VacPac
        const percentFull = Math.min(100, Math.round((item.quantity / capacity) * 100));
        const locName = locations.find(l => l.id === item.locationId || l.skuCode === item.locationSku)?.name || item.locationSku;

        groups[key].vacpacs.push({
          id: item.id,
          packNumber: item.packNumber || 0,
          quantity: item.quantity,
          percentFull,
          locationName: locName,
          itemObj: item
        });
      }
    });

    return Object.values(groups).sort((a, b) => a.typeName.localeCompare(b.typeName));
  }, [inventory, clothingTypes, colours, sizes, locations]);

  // Logo VacPac physical containers grouping (grouped by School & Pack Number, showing variety of items)
  const logoVacPacContainers = useMemo(() => {
    interface LogoContainerItem {
      id: string;
      typeSku: string;
      typeName: string;
      colourSku: string;
      colourName: string;
      sizeSku: string;
      sizeLabel: string;
      quantity: number;
      itemObj: InventoryItem;
    }

    interface LogoVacPacContainer {
      key: string;
      schoolSku: string;
      schoolName: string;
      packNumber: number;
      locationSku: string;
      locationName: string;
      items: LogoContainerItem[];
      totalQuantity: number;
    }

    const containers: { [key: string]: LogoVacPacContainer } = {};

    inventory.forEach((item) => {
      if (item.category !== 'Logo') return;
      if (item.type !== 'vacpac') return;

      const key = `${item.schoolSku}_${item.packNumber || 0}`;

      if (!containers[key]) {
        const schoolName = schools.find(s => s.skuCode === item.schoolSku)?.name || item.schoolSku;
        const locName = locations.find(l => l.skuCode === item.locationSku || l.id === item.locationId)?.name || item.locationSku;
        containers[key] = {
          key,
          schoolSku: item.schoolSku,
          schoolName,
          packNumber: item.packNumber || 0,
          locationSku: item.locationSku,
          locationName: locName,
          items: [],
          totalQuantity: 0,
        };
      }

      const typeName = clothingTypes.find(t => t.skuCode === item.typeSku)?.name || item.typeSku;
      const colourName = colours.find(c => c.skuCode === item.colourSku)?.name || item.colourSku;
      const sizeLabel = sizes.find(s => s.skuCode === item.sizeSku)?.label || item.sizeSku;

      containers[key].items.push({
        id: item.id,
        typeSku: item.typeSku,
        typeName,
        colourSku: item.colourSku,
        colourName,
        sizeSku: item.sizeSku,
        sizeLabel,
        quantity: item.quantity,
        itemObj: item,
      });
      containers[key].totalQuantity += item.quantity;
    });

    return Object.values(containers).sort((a, b) => {
      if (a.schoolName !== b.schoolName) {
        return a.schoolName.localeCompare(b.schoolName);
      }
      return a.packNumber - b.packNumber;
    });
  }, [inventory, schools, locations, clothingTypes, colours, sizes]);

  // Plain VacPac grouping by Status level (% Full) & Item attributes
  const plainVacPacConsolidated = useMemo(() => {
    interface PlainConsolidatedItem {
      id: string;
      packNumber: number;
      quantity: number;
      locationName: string;
      itemObj: InventoryItem;
    }

    interface PlainConsolidatedGroup {
      key: string;
      percentFull: number; // 25, 50, 75, 100
      typeSku: string;
      colourSku: string;
      sizeSku: string;
      typeName: string;
      colourName: string;
      sizeLabel: string;
      totalCount: number; // number of VacPacs
      vacpacs: PlainConsolidatedItem[];
    }

    const groups: { [key: string]: PlainConsolidatedGroup } = {};

    inventory.forEach((item) => {
      if ((item.category || 'Plain') === 'Logo') return;
      if (item.type !== 'vacpac') return;

      // Standard capacity is 20 units.
      const capacity = 20;
      const rawPercent = Math.min(100, Math.round((item.quantity / capacity) * 100));
      // Bin rawPercent to the nearest 25: 25, 50, 75, or 100%
      const percentFull = Math.max(25, Math.min(100, Math.round(rawPercent / 25) * 25));

      const key = `${percentFull}_${item.typeSku}_${item.colourSku}_${item.sizeSku}`;

      if (!groups[key]) {
        const typ = clothingTypes.find(t => t.skuCode === item.typeSku)?.name || item.typeSku;
        const col = colours.find(c => c.skuCode === item.colourSku)?.name || item.colourSku;
        const siz = sizes.find(s => s.skuCode === item.sizeSku)?.label || item.sizeSku;

        groups[key] = {
          key,
          percentFull,
          typeSku: item.typeSku,
          colourSku: item.colourSku,
          sizeSku: item.sizeSku,
          typeName: typ,
          colourName: col,
          sizeLabel: siz,
          totalCount: 0,
          vacpacs: [],
        };
      }

      const locName = locations.find(l => l.id === item.locationId || l.skuCode === item.locationSku)?.name || item.locationSku;
      groups[key].totalCount += 1;
      groups[key].vacpacs.push({
        id: item.id,
        packNumber: item.packNumber || 0,
        quantity: item.quantity,
        locationName: locName,
        itemObj: item,
      });
    });

    return Object.values(groups).sort((a, b) => {
      if (b.percentFull !== a.percentFull) {
        return b.percentFull - a.percentFull;
      }
      return a.typeName.localeCompare(b.typeName);
    });
  }, [inventory, clothingTypes, colours, sizes, locations]);

  // Filtered lists for the new modes
  const filteredLogoVacPacContainers = useMemo(() => {
    return logoVacPacContainers.filter((container) => {
      // Filter by school ID
      const schoolObj = schools.find(s => s.skuCode === container.schoolSku);
      if (logoFilterSchoolId !== 'all' && schoolObj?.id !== logoFilterSchoolId) return false;

      // Filter items inside the container if traits filters are applied
      if (logoFilterTypeId !== 'all' || logoFilterColourId !== 'all' || logoFilterSizeId !== 'all' || logoSearchQuery.trim() !== '') {
        const query = logoSearchQuery.toLowerCase().trim();
        return container.items.some(it => {
          const typObj = clothingTypes.find(t => t.skuCode === it.typeSku);
          const colObj = colours.find(c => c.skuCode === it.colourSku);
          
          if (logoFilterTypeId !== 'all' && typObj?.id !== logoFilterTypeId) return false;
          if (logoFilterColourId !== 'all' && colObj?.id !== logoFilterColourId) return false;
          if (logoFilterSizeId !== 'all' && it.sizeSku !== logoFilterSizeId) return false;

          if (query !== '') {
            return (
              it.typeName.toLowerCase().includes(query) ||
              it.colourName.toLowerCase().includes(query) ||
              it.sizeLabel.toLowerCase().includes(query) ||
              container.schoolName.toLowerCase().includes(query)
            );
          }
          return true;
        });
      }
      return true;
    });
  }, [logoVacPacContainers, logoFilterSchoolId, logoFilterTypeId, logoFilterColourId, logoFilterSizeId, logoSearchQuery, schools, clothingTypes, colours]);

  const filteredPlainVacPacConsolidated = useMemo(() => {
    return plainVacPacConsolidated.filter((group) => {
      // Dropdown filters
      const typObj = clothingTypes.find(t => t.skuCode === group.typeSku);
      if (plainFilterTypeId !== 'all' && typObj?.id !== plainFilterTypeId) return false;

      const colObj = colours.find(c => c.skuCode === group.colourSku);
      if (plainFilterColourId !== 'all' && colObj?.id !== plainFilterColourId) return false;

      if (plainFilterSizeId !== 'all' && group.sizeSku !== plainFilterSizeId) return false;

      // Search query
      if (plainSearchQuery.trim() !== '') {
        const query = plainSearchQuery.toLowerCase();
        return (
          group.typeName.toLowerCase().includes(query) ||
          group.colourName.toLowerCase().includes(query) ||
          group.sizeLabel.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [plainVacPacConsolidated, plainFilterTypeId, plainFilterColourId, plainFilterSizeId, plainSearchQuery, clothingTypes, colours]);

  // Smart Restock Routine
  // Computes candidates where singles count < 5 (including 0 when singleItem is not present in collection) AND matching VacPacs are available to be unpacked.
  const lowStockWithMatches = useMemo(() => {
    const traitsMap: { [key: string]: {
      category: string;
      schoolSku: string;
      typeSku: string;
      colourSku: string;
      sizeSku: string;
      singleItem?: InventoryItem;
      vacpacs: InventoryItem[];
    }} = {};

    inventory.forEach(item => {
      const isLogo = item.category === 'Logo';
      const key = `${isLogo ? 'logo' : 'plain'}_${item.schoolSku || ''}_${item.typeSku}_${item.colourSku}_${item.sizeSku}`;
      
      if (!traitsMap[key]) {
        traitsMap[key] = {
          category: isLogo ? 'Logo' : 'Plain',
          schoolSku: item.schoolSku || '',
          typeSku: item.typeSku,
          colourSku: item.colourSku,
          sizeSku: item.sizeSku,
          vacpacs: []
        };
      }

      if (item.type === 'single') {
        traitsMap[key].singleItem = item;
      } else if (item.type === 'vacpac') {
        traitsMap[key].vacpacs.push(item);
      }
    });

    const candidates: {
      id: string;
      category: string;
      schoolSku: string;
      typeSku: string;
      colourSku: string;
      sizeSku: string;
      quantity: number;
      shelfCode: string;
      singleItemObj: InventoryItem;
      vacpacs: InventoryItem[];
    }[] = [];

    Object.values(traitsMap).forEach(trait => {
      const looseQty = trait.singleItem ? trait.singleItem.quantity : 0;
      if (looseQty < 5 && trait.vacpacs.length > 0) {
        const defaultShelf = 'E7';
        const singleId = trait.singleItem ? trait.singleItem.id : `dyn_single_${trait.schoolSku || 'plain'}_${trait.typeSku}_${trait.colourSku}_${trait.sizeSku}`;
        const singleItemObj: InventoryItem = trait.singleItem || ({
          id: singleId,
          skuid: `SKU-${trait.schoolSku || 'PLAIN'}-${trait.typeSku}-${trait.colourSku}-${trait.sizeSku}-SINGLE`,
          category: trait.category as any,
          schoolId: trait.vacpacs[0].schoolId || '',
          schoolSku: trait.schoolSku,
          typeId: trait.vacpacs[0].typeId || '',
          typeSku: trait.typeSku,
          colourId: trait.vacpacs[0].colourId || '',
          colourSku: trait.colourSku,
          sizeId: trait.vacpacs[0].sizeId || '',
          sizeSku: trait.sizeSku,
          type: 'single',
          quantity: 0,
          shelfCode: defaultShelf,
          updatedAt: new Date().toISOString(),
          locationId: trait.vacpacs[0].locationId,
          locationSku: trait.vacpacs[0].locationSku,
          packNumber: 0
        } as any);

        candidates.push({
          id: singleId,
          category: trait.category,
          schoolSku: trait.schoolSku,
          typeSku: trait.typeSku,
          colourSku: trait.colourSku,
          sizeSku: trait.sizeSku,
          quantity: looseQty,
          shelfCode: trait.singleItem?.shelfCode || defaultShelf,
          singleItemObj,
          vacpacs: trait.vacpacs
        });
      }
    });

    return candidates;
  }, [inventory]);

  const filteredLogoConsolidated = useMemo(() => {
    return logoConsolidatedItems.filter((group) => {
      // Dropdown filters
      const schObj = schools.find(s => s.skuCode === group.schoolSku);
      if (logoFilterSchoolId !== 'all' && schObj?.id !== logoFilterSchoolId) return false;

      const typObj = clothingTypes.find(t => t.skuCode === group.typeSku);
      if (logoFilterTypeId !== 'all' && typObj?.id !== logoFilterTypeId) return false;

      const colObj = colours.find(c => c.skuCode === group.colourSku);
      if (logoFilterColourId !== 'all' && colObj?.id !== logoFilterColourId) return false;

      if (logoFilterSizeId !== 'all' && group.sizeSku !== logoFilterSizeId) return false;

      // Search query
      if (logoSearchQuery.trim() !== '') {
        const query = logoSearchQuery.toLowerCase();
        return (
          group.schoolName.toLowerCase().includes(query) ||
          group.typeName.toLowerCase().includes(query) ||
          group.colourName.toLowerCase().includes(query) ||
          group.sizeLabel.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [logoConsolidatedItems, logoFilterSchoolId, logoFilterTypeId, logoFilterColourId, logoFilterSizeId, logoSearchQuery, schools, clothingTypes, colours]);

  const filteredPlainConsolidated = useMemo(() => {
    return plainConsolidatedItems.filter((group) => {
      // Dropdown filters
      const typObj = clothingTypes.find(t => t.skuCode === group.typeSku);
      if (plainFilterTypeId !== 'all' && typObj?.id !== plainFilterTypeId) return false;

      const colObj = colours.find(c => c.skuCode === group.colourSku);
      if (plainFilterColourId !== 'all' && colObj?.id !== plainFilterColourId) return false;

      if (plainFilterSizeId !== 'all' && group.sizeSku !== plainFilterSizeId) return false;

      // Search query
      if (plainSearchQuery.trim() !== '') {
        const query = plainSearchQuery.toLowerCase();
        return (
          group.typeName.toLowerCase().includes(query) ||
          group.colourName.toLowerCase().includes(query) ||
          group.sizeLabel.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [plainConsolidatedItems, plainFilterTypeId, plainFilterColourId, plainFilterSizeId, plainSearchQuery, clothingTypes, colours]);

  const filteredInventory = useMemo(() => {
    return inventory;
  }, [inventory]);

  const handleExportCsv = () => {
    const headers = [
      'SKUID',
      'Category',
      'Item Type',
      'Location',
      'Shelf',
      'Pack Number',
      'School',
      'Colour',
      'Garment Type',
      'Size',
      'Quantity'
    ];

    const rows = filteredInventory.map(item => {
      const locName = locations.find(l => l.id === item.locationId)?.name || '';
      const schoolName = schools.find(s => s.id === item.schoolId)?.name || '';
      const colourName = colours.find(c => c.id === item.colourId)?.name || '';
      const typeName = clothingTypes.find(t => t.id === item.typeId)?.name || '';
      const sizeLabel = sizes.find(s => s.id === item.sizeId)?.label || '';

      return [
        item.skuid,
        item.category || 'Plain',
        item.type,
        locName,
        item.shelfCode || '',
        item.packNumber || '',
        schoolName,
        colourName,
        typeName,
        sizeLabel,
        item.quantity
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `school_uniform_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // One-Click Transfer Transaction
  // "Pop Pack to Picker Shelf" button. Clicking this executes a safe transaction that deletes the VacPac document
  // from bulk storage, unpacks the content volume, and automatically increments the Single Items count straight onto
  // the designated target picker shelf.
  const handlePopPackToPickerShelf = async (singleItem: InventoryItem, matchingPack: InventoryItem) => {
    setTransactionLoading(matchingPack.id);
    const vacPacRef = doc(db, 'inventory', matchingPack.id);
    const targetSingleRef = doc(db, 'inventory', singleItem.id);

    try {
      await runTransaction(db, async (transaction) => {
        const vacPacSnap = await transaction.get(vacPacRef);
        if (!vacPacSnap.exists()) {
          throw new Error('Selected VacPac package is no longer available in the warehouse.');
        }

        const packQty = vacPacSnap.data().quantity || 0;

        // Verify the singles document again
        const singleSnap = await transaction.get(targetSingleRef);
        
        // Delete VacPac bulk pack completely
        transaction.delete(vacPacRef);

        if (singleSnap.exists()) {
          const currentSingleQty = singleSnap.data().quantity || 0;
          transaction.update(targetSingleRef, {
            quantity: currentSingleQty + packQty,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Fallback if singles row was somehow removed in the background
          transaction.set(targetSingleRef, {
            ...singleItem,
            quantity: packQty,
            updatedAt: serverTimestamp(),
          });
        }
      });
      
      // Flash a quick notice
      const packName = matchingPack.packNumber ? `#${matchingPack.packNumber}` : `ID ${matchingPack.id.slice(0, 4)}`;
      setToast({
        message: `Success! Pack ${packName} unpacked. Added +${matchingPack.quantity} units to Shelf ${singleItem.shelfCode}.`,
        type: 'success'
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${singleItem.id}`);
      setToast({
        message: `Restock Transaction Failed: ${err.message}`,
        type: 'error'
      });
    } finally {
      setTransactionLoading(null);
    }
  };

  const handleSaveInventoryEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem) return;

    try {
      const docRef = doc(db, 'inventory', editingItem.id);
      const locObj = locations.find(l => l.id === editItemLocationId);
      
      const updates: any = {
        quantity: Number(editItemQty),
        updatedAt: serverTimestamp(),
      };

      if (editingItem.type === 'single') {
        const cleanShelf = editItemShelf.trim().toUpperCase();
        if (!cleanShelf) {
          alert('Shelf code is required.');
          return;
        }
        if (!validateShelfCode(cleanShelf)) {
          alert('Shelf code must be a letter A-Z followed by 1-10 (e.g., E7, B2).');
          return;
        }
        updates.shelfCode = cleanShelf;
        if (locObj) {
          updates.locationId = locObj.id;
          updates.locationSku = locObj.skuCode;
        }

        // Regenerate SKUID if shelfCode changed
        const newSkuid = generateSkuid({
          ruleProfile: 'Pickers Shelf',
          locationSku: '',
          shelfCode: cleanShelf,
          schoolSku: editingItem.schoolSku,
          colourSku: editingItem.colourSku,
          typeSku: editingItem.typeSku,
          sizeSku: editingItem.sizeSku
        });
        updates.skuid = newSkuid;
      } else {
        // For vacpac
        if (locObj) {
          updates.locationId = locObj.id;
          updates.locationSku = locObj.skuCode;
        }

        // Regenerate SKUID if locationSku changed
        const newSkuid = generateSkuid({
          ruleProfile: 'VacPac Storage Area',
          locationSku: locObj?.skuCode || editingItem.locationSku,
          packNumber: editingItem.packNumber,
          schoolSku: editingItem.schoolSku,
          colourSku: editingItem.colourSku,
          typeSku: editingItem.typeSku,
          sizeSku: editingItem.sizeSku
        });
        updates.skuid = newSkuid;
      }

      await updateDoc(docRef, updates);
      setEditingItem(null);
      alert('Inventory item updated successfully!');
    } catch (err: any) {
      alert('Failed to update item: ' + err.message);
    }
  };

  const handleExecuteVacPacPop = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!poppingVacPac) return;
    
    const cleanShelf = targetShelf.trim().toUpperCase();
    if (!cleanShelf) {
      setPopError('Please specify a destination Picker Shelf.');
      return;
    }
    if (!validateShelfCode(cleanShelf)) {
      setPopError('Shelf code must be a letter A-Z followed by 1-10 (e.g., E7, B2).');
      return;
    }

    setTransactionLoading(poppingVacPac.id);
    setPopError(null);

    try {
      const targetSkuid = generateSkuid({
        ruleProfile: 'Pickers Shelf',
        locationSku: '',
        shelfCode: cleanShelf,
        schoolSku: poppingVacPac.schoolSku,
        colourSku: poppingVacPac.colourSku,
        typeSku: poppingVacPac.typeSku,
        sizeSku: poppingVacPac.sizeSku
      });

      const targetDocId = `${targetSkuid}_${cleanShelf}`;
      const targetSingleRef = doc(db, 'inventory', targetDocId);
      const vacPacRef = doc(db, 'inventory', poppingVacPac.id);

      await runTransaction(db, async (transaction) => {
        // Step A: Read selected VacPac document and extract units_inside
        const vacPacSnap = await transaction.get(vacPacRef);
        if (!vacPacSnap.exists()) {
          throw new Error('Selected VacPac package is no longer available in the warehouse.');
        }

        const units_inside = vacPacSnap.data().quantity || 0;

        // Step C: Check if a Single Item document already exists for that identical SKU at that Picker Shelf destination
        const singleSnap = await transaction.get(targetSingleRef);

        // Step D: Execute the transaction: Delete the source VacPac document from the database
        transaction.delete(vacPacRef);

        // and simultaneously use the Firestore 'increment(units_inside)' operator on target Picker Shelf document.
        if (singleSnap.exists()) {
          const currentSingleQty = singleSnap.data().quantity || 0;
          transaction.update(targetSingleRef, {
            quantity: currentSingleQty + units_inside,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Find picker shelf locations if possible
          const pickerLoc = locations.find(l => l.ruleProfile === 'Pickers Shelf');

          transaction.set(targetSingleRef, {
            id: targetDocId,
            skuid: targetSkuid,
            type: 'single',
            locationId: pickerLoc?.id || poppingVacPac.locationId,
            locationSku: pickerLoc?.skuCode || poppingVacPac.locationSku,
            shelfCode: cleanShelf,
            schoolId: poppingVacPac.schoolId,
            schoolSku: poppingVacPac.schoolSku,
            colourId: poppingVacPac.colourId,
            colourSku: poppingVacPac.colourSku,
            typeId: poppingVacPac.typeId,
            typeSku: poppingVacPac.typeSku,
            sizeId: poppingVacPac.sizeId,
            sizeSku: poppingVacPac.sizeSku,
            quantity: units_inside,
            updatedAt: serverTimestamp(),
          });
        }
      });

      alert(`Unpacking Complete! Successfully popped VacPac into ${poppingVacPac.quantity} loose units on Shelf ${cleanShelf}.`);
      setPoppingVacPac(null);
      setTargetShelf('');
    } catch (err: any) {
      setPopError(err.message);
    } finally {
      setTransactionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
{/* Workspace Content View Layer */}

      {/* Workspace Navigation Tabs across the screen */}
      <div className="flex border border-slate-200 bg-white p-1 rounded-2xl shadow-sm relative z-10">
        <button
          onClick={() => setActiveWorkspaceTab('totals')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
            activeWorkspaceTab === 'totals'
              ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
              : 'text-brand-text border-transparent hover:text-brand-primary hover:bg-orange-50/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Inventory Totals</span>
        </button>
        <button
          onClick={() => setActiveWorkspaceTab('logo')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
            activeWorkspaceTab === 'logo'
              ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
              : 'text-brand-text border-transparent hover:text-brand-primary hover:bg-orange-50/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Logo Items</span>
        </button>
        <button
          onClick={() => setActiveWorkspaceTab('plain')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
            activeWorkspaceTab === 'plain'
              ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
              : 'text-brand-text border-transparent hover:text-brand-primary hover:bg-orange-50/50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Plain Items</span>
        </button>
      </div>

      {/* Tab 1: Inventory Totals */}
      {activeWorkspaceTab === 'totals' && (
        <div className="space-y-6 text-left">
          {/* Dashboard Title & Overview Card */}
          <div className="bg-white rounded-3xl p-6 text-slate-800 space-y-4 shadow-xs relative overflow-hidden border border-slate-200 border-t-4 border-brand-primary">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-primary font-black">Facility Insights</span>
                <h3 className="text-xl font-serif font-black tracking-tight text-slate-900 mt-0.5">Stock Report</h3>
              </div>
              <span className="bg-slate-100 text-brand-primary font-bold text-xs px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                {stats.totalUnits} Total Units
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 relative z-10">
              {/* Card 1: Orange accent for Logo Badges */}
              <div className="bg-[#F8F9FA] border border-slate-200/60 rounded-2xl p-4 transition-colors hover:bg-slate-50">
                <span className="block text-[10px] text-brand-text uppercase font-mono font-bold">Logo Badged Items</span>
                <span className="block text-2xl font-black text-brand-orange mt-1">{stats.totalLogoUnits}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">units in stock</span>
              </div>
              
              {/* Card 2: Solid Slate Neutral for Plain Core */}
              <div className="bg-[#F8F9FA] border border-slate-200/60 rounded-2xl p-4 transition-colors hover:bg-slate-50">
                <span className="block text-[10px] text-brand-text uppercase font-mono font-bold">Plain Core Items</span>
                <span className="block text-2xl font-black text-slate-800 mt-1">{stats.totalPlainUnits}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">units in stock</span>
              </div>
              
              {/* Card 3: Crisp Teal accent for loose shelving stock */}
              <div className="bg-[#F8F9FA] border border-slate-200/60 rounded-2xl p-4 transition-colors hover:bg-slate-50">
                <span className="block text-[10px] text-brand-text uppercase font-mono font-bold">Loose Picker Stock</span>
                <span className="block text-2xl font-black text-brand-teal mt-1">{stats.totalSingles}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{stats.singlesCount} items on shelves</span>
              </div>
              
              {/* Card 4: Signature Yellow gold text for Bulk VacPac */}
              <div className="bg-[#F8F9FA] border border-slate-200/60 rounded-2xl p-4 transition-colors hover:bg-slate-50">
                <span className="block text-[10px] text-brand-text uppercase font-mono font-bold">Bulk VacPac Stock</span>
                <span className="block text-2xl font-black text-brand-yellow mt-1">{stats.totalVacpacs}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">units in {stats.vacpacCount} packs</span>
              </div>
            </div>
          </div>


          {/* Visual Distribution Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graph Card 1: Category composition */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-sm">
              <h4 className="font-sans font-extrabold text-brand-secondary text-sm tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                Category Distribution (Logo vs Plain)
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-brand-orange flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-orange inline-block" />
                    Logo Items: {stats.totalLogoUnits} units
                  </span>
                  <span className="text-brand-teal flex items-center gap-1">
                    Plain Items: {stats.totalPlainUnits} units
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-teal inline-block" />
                  </span>
                </div>
                {/* Visual Stacked bar */}
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${stats.totalUnits > 0 ? (stats.totalLogoUnits / stats.totalUnits) * 100 : 50}%` }}
                    className="bg-brand-orange transition-all duration-500"
                  />
                  <div
                    style={{ width: `${stats.totalUnits > 0 ? (stats.totalPlainUnits / stats.totalUnits) * 100 : 50}%` }}
                    className="bg-brand-teal transition-all duration-500"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-brand-text font-mono font-bold">
                  <span>{stats.totalUnits > 0 ? Math.round((stats.totalLogoUnits / stats.totalUnits) * 100) : 0}% Logo</span>
                  <span>{stats.totalUnits > 0 ? Math.round((stats.totalPlainUnits / stats.totalUnits) * 100) : 0}% Plain</span>
                </div>
              </div>

              {/* Garment type compositions list */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wide text-brand-text font-bold block">Top Clothing Types Stock Levels</span>
                <div className="space-y-2.5">
                  {garmentBreakdown.slice(0, 5).map(g => {
                    const percent = stats.totalUnits > 0 ? Math.round((g.total / stats.totalUnits) * 100) : 0;
                    return (
                      <div key={g.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-brand-secondary">
                          <span>{g.name}</span>
                          <span className="text-brand-text">{g.total} units ({percent}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="bg-brand-primary h-full rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {garmentBreakdown.length === 0 && (
                    <span className="text-brand-text text-xs italic">No garments found.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Graph Card 2: School Share */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h4 className="font-sans font-extrabold text-brand-secondary text-sm tracking-tight flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-primary" />
                School Stock Breakdown
              </h4>
              <p className="text-xs text-brand-text font-medium">Schools representing the largest portion of badged inventory stock inside the warehouse.</p>
              
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {schoolBreakdown.slice(0, 6).map(sch => {
                  const percent = stats.totalUnits > 0 ? Math.round((sch.total / stats.totalUnits) * 100) : 0;
                  return (
                    <div key={sch.name} className="space-y-1.5 p-2 bg-[#F8F9FA] hover:bg-slate-100/80 border border-slate-200/50 hover:border-slate-300 rounded-xl transition">
                      <div className="flex justify-between text-xs font-extrabold text-brand-secondary">
                        <span className="truncate max-w-[200px]">{sch.name}</span>
                        <span>{sch.total} units <span className="text-brand-text font-semibold">({percent}%)</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${sch.total > 0 ? (sch.logo / sch.total) * 100 : 0}%` }}
                            className="bg-brand-orange h-full"
                            title="Logo items portion"
                          />
                          <div
                            style={{ width: `${sch.total > 0 ? (sch.plain / sch.total) * 100 : 0}%` }}
                            className="bg-brand-teal h-full"
                            title="Plain items portion"
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-brand-text whitespace-nowrap">
                          {sch.logo}L &bull; {sch.plain}P
                        </span>
                      </div>
                    </div>
                  );
                })}
                {schoolBreakdown.length === 0 && (
                  <span className="text-brand-text text-xs italic block text-center py-10">No school data recorded.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Logo Items */}
      {activeWorkspaceTab === 'logo' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-sm text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-lg font-display font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Logo Items
              </h3>
              <p className="text-xs text-slate-500">
                School badged uniforms showing loose items on picking shelves, bulk VacPac storage, locations, and totals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setLogoViewMode('traits')}
                  className={`py-1.5 px-3 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                    logoViewMode === 'traits'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Uniform Traits View
                </button>
                <button
                  type="button"
                  onClick={() => setLogoViewMode('containers')}
                  className={`py-1.5 px-3 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                    logoViewMode === 'containers'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  VacPac Containers (1-99)
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
                <span>{logoViewMode === 'traits' ? `${filteredLogoConsolidated.length} Traits Groups` : `${filteredLogoVacPacContainers.length} Active Packs`}</span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={logoSearchQuery}
              onChange={(e) => setLogoSearchQuery(e.target.value)}
              placeholder="Search logo items (School, Garment, Colour, Size)..."
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-2xl text-xs focus:outline-none focus:bg-white transition"
            />
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            {logoSearchQuery && (
              <button
                onClick={() => setLogoSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Logo Filters Dropdown Pills */}
          <div className="flex flex-wrap gap-2 relative z-20">
            {/* School Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLogoActiveDropdown(logoActiveDropdown === 'school' ? null : 'school')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  logoFilterSchoolId !== 'all'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>School: {logoFilterSchoolId === 'all' ? 'All' : schools.find(s => s.id === logoFilterSchoolId)?.name}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {logoActiveDropdown === 'school' && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2.5 w-60 z-30 max-h-60 overflow-y-auto flex flex-col gap-1.5 text-left">
                  <input
                    type="text"
                    value={logoFilterOptionSearch}
                    onChange={(e) => setLogoFilterOptionSearch(e.target.value)}
                    placeholder="Search schools..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => { setLogoFilterSchoolId('all'); setLogoActiveDropdown(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold shrink-0"
                  >
                    All Schools
                  </button>
                  {schools.filter(s => s.name.toLowerCase().includes(logoFilterOptionSearch.toLowerCase())).map((sch) => (
                    <button
                      key={sch.id}
                      type="button"
                      onClick={() => { setLogoFilterSchoolId(sch.id); setLogoActiveDropdown(null); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold truncate shrink-0"
                    >
                      {sch.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Garment Type Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLogoActiveDropdown(logoActiveDropdown === 'type' ? null : 'type')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  logoFilterTypeId !== 'all'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Garment: {logoFilterTypeId === 'all' ? 'All' : clothingTypes.find(t => t.id === logoFilterTypeId)?.name}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {logoActiveDropdown === 'type' && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2.5 w-60 z-30 max-h-60 overflow-y-auto flex flex-col gap-1.5 text-left">
                  <input
                    type="text"
                    value={logoFilterOptionSearch}
                    onChange={(e) => setLogoFilterOptionSearch(e.target.value)}
                    placeholder="Search garment types..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => { setLogoFilterTypeId('all'); setLogoActiveDropdown(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold shrink-0"
                  >
                    All Garments
                  </button>
                  {clothingTypes.filter(t => t.name.toLowerCase().includes(logoFilterOptionSearch.toLowerCase())).map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setLogoFilterTypeId(type.id); setLogoActiveDropdown(null); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold truncate shrink-0"
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colour Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLogoActiveDropdown(logoActiveDropdown === 'colour' ? null : 'colour')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  logoFilterColourId !== 'all'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Colour: {logoFilterColourId === 'all' ? 'All' : colours.find(c => c.id === logoFilterColourId)?.name}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {logoActiveDropdown === 'colour' && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2.5 w-60 z-30 max-h-60 overflow-y-auto flex flex-col gap-1.5 text-left">
                  <input
                    type="text"
                    value={logoFilterOptionSearch}
                    onChange={(e) => setLogoFilterOptionSearch(e.target.value)}
                    placeholder="Search colours..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => { setLogoFilterColourId('all'); setLogoActiveDropdown(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold shrink-0"
                  >
                    All Colours
                  </button>
                  {colours.filter(c => c.name.toLowerCase().includes(logoFilterOptionSearch.toLowerCase())).map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => { setLogoFilterColourId(col.id); setLogoActiveDropdown(null); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold truncate shrink-0"
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Size Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLogoActiveDropdown(logoActiveDropdown === 'size' ? null : 'size')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  logoFilterSizeId !== 'all'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Size: {logoFilterSizeId === 'all' ? 'All' : sizes.find(s => s.skuCode === logoFilterSizeId)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {logoActiveDropdown === 'size' && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2.5 w-60 z-30 max-h-60 overflow-y-auto flex flex-col gap-1.5 text-left">
                  <input
                    type="text"
                    value={logoFilterOptionSearch}
                    onChange={(e) => setLogoFilterOptionSearch(e.target.value)}
                    placeholder="Search sizes..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => { setLogoFilterSizeId('all'); setLogoActiveDropdown(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold shrink-0"
                  >
                    All Sizes
                  </button>
                  {sizes.filter(s => s.label.toLowerCase().includes(logoFilterOptionSearch.toLowerCase())).map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => { setLogoFilterSizeId(size.skuCode); setLogoActiveDropdown(null); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold truncate shrink-0"
                    >
                      Size {size.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Button */}
            {(logoSearchQuery || logoFilterSchoolId !== 'all' || logoFilterTypeId !== 'all' || logoFilterColourId !== 'all' || logoFilterSizeId !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setLogoSearchQuery('');
                  setLogoFilterSchoolId('all');
                  setLogoFilterTypeId('all');
                  setLogoFilterColourId('all');
                  setLogoFilterSizeId('all');
                }}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                Clear Filters
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>

          {logoViewMode === 'containers' ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 font-medium text-left">
                  Showing <strong>{filteredLogoVacPacContainers.length}</strong> active Logo VacPac containers. Each school has a maximum of 99 VacPacs.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {filteredLogoVacPacContainers.map((container) => (
                  <div key={container.key} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition duration-300 relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-3.5 text-left">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">SCHOOL VACPAC CONTAINER</span>
                          <h4 className="font-display font-extrabold text-slate-900 text-sm tracking-tight mt-0.5 leading-snug">
                            {container.schoolName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {container.locationName}
                          </span>
                        </div>
                        <span className="bg-orange-600 text-white font-mono font-black text-xs px-3 py-1.5 rounded-xl border border-orange-700/10 shadow-xs shrink-0">
                          PACK #{container.packNumber}
                        </span>
                      </div>

                      {/* Items inside this specific container */}
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">Items Stored ({container.items.length})</span>
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {container.items.map((it) => (
                            <div key={it.id} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 truncate block">
                                  {it.typeName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  {it.colourName} &bull; <span className="text-orange-600 font-bold">Size {it.sizeLabel}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-extrabold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100">
                                  {it.quantity} Qty
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setPoppingVacPac(it.itemObj);
                                      setTargetShelf('E7');
                                    }}
                                    className="text-[10px] font-bold text-secondary hover:text-secondary-hover border border-secondary/20 hover:border-secondary px-1.5 py-0.5 rounded cursor-pointer"
                                    title="Pop specific item onto picking shelf"
                                  >
                                    Pop
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingItem(it.itemObj);
                                      setEditItemQty(it.quantity);
                                      setEditItemShelf('E7');
                                      setEditItemLocationId(it.itemObj.locationId);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 transition"
                                    title="Edit item quantity"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(it.id, `Pack #${container.packNumber} - ${it.typeName}`)}
                                    className="p-1 text-red-400 hover:text-red-700 transition"
                                    title="Delete item"
                                  >
                                    Del
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Total Volume</span>
                      <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full">{container.totalQuantity} items inside</span>
                    </div>
                  </div>
                ))}

                {filteredLogoVacPacContainers.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-400 text-xs font-medium">
                    No Logo VacPac containers found matching current filters.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-4 px-5">Logo Uniform Profile</th>
                      <th className="py-4 px-4 text-center">Picker's Shelf Qty</th>
                      <th className="py-4 px-4">VacPac Quantity & Details</th>
                      <th className="py-4 px-5 text-center">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredLogoConsolidated.map((group) => {
                      return (
                        <tr key={group.key} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-5">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 leading-normal block">
                                {group.schoolName}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 font-medium">
                                <span>{group.typeName}</span>
                                <span className="text-slate-300">&bull;</span>
                                <span>{group.colourName}</span>
                                <span className="text-slate-300">&bull;</span>
                                <span className="font-semibold text-orange-600">Size {group.sizeLabel}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="space-y-1.5">
                              <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 font-extrabold rounded-lg text-xs">
                                {group.totalSinglesQty} units
                              </span>
                              {group.singles.length > 0 && (
                                <div className="text-[10px] text-slate-400 font-medium">
                                  Shelf: {group.singles.map(s => s.shelfCode || 'E7').join(', ')}
                                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                                    {group.singles.map(single => (
                                      <div key={single.id} className="flex gap-1.5">
                                        <button
                                          onClick={() => {
                                            setEditingItem(single);
                                            setEditItemQty(single.quantity);
                                            setEditItemShelf(single.shelfCode || 'E7');
                                            setEditItemLocationId(single.locationId);
                                          }}
                                          className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(single.id, `${group.schoolName} ${group.typeName} (Shelf ${single.shelfCode})`)}
                                          className="text-[10px] text-red-600 hover:underline font-semibold cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-2">
                              <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold rounded-lg text-xs">
                                {group.totalVacpacsQty} units <span className="text-[10px] text-indigo-500 font-normal">({group.vacpacs.length} packs)</span>
                              </span>

                              {group.vacpacs.length > 0 ? (
                                <div className="space-y-1">
                                  {group.vacpacs.map((pack) => {
                                    const locName = locations.find(l => l.id === pack.locationId || l.skuCode === pack.locationSku)?.name || pack.locationSku;
                                    return (
                                      <div key={pack.id} className="p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                                        <div className="truncate text-slate-600">
                                          <span className="font-bold text-slate-800">Pack #{pack.packNumber || 0}</span>
                                          <span className="mx-1">&bull;</span>
                                          <span>{locName}</span>
                                          <span className="mx-1">&bull;</span>
                                          <span className="font-medium text-indigo-600">{pack.quantity} units</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            onClick={() => {
                                              setPoppingVacPac(pack);
                                              setTargetShelf('E7');
                                            }}
                                            className="text-[10px] text-secondary hover:text-secondary-hover font-bold border border-secondary/20 hover:border-secondary px-1.5 py-0.5 rounded cursor-pointer"
                                          >
                                            Pop
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingItem(pack);
                                              setEditItemQty(pack.quantity);
                                              setEditItemShelf(pack.shelfCode || 'E7');
                                              setEditItemLocationId(pack.locationId);
                                            }}
                                            className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteItem(pack.id, `Pack #${pack.packNumber || 0}`)}
                                            className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer"
                                          >
                                            Del
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 block italic">No packages in warehouse storage.</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="inline-block px-3 py-1 bg-orange-50 text-orange-700 font-extrabold rounded-full text-xs border border-orange-100">
                              {group.grandTotal} units total
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLogoConsolidated.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 text-xs font-medium">
                          No Logo items recorded matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Plain Items */}
      {activeWorkspaceTab === 'plain' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 shadow-sm text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-display font-extrabold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-500" />
                Plain Items
              </h3>
              <p className="text-xs text-slate-500">
                Core unbadged clothing base garments. Quantities are inside bulk VacPacs shown as storage fill percentages.
              </p>
            </div>
            <div className="bg-teal-50 border border-teal-100 text-teal-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
              <span>{filteredPlainConsolidated.length} Base Groups</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={plainSearchQuery}
              onChange={(e) => setPlainSearchQuery(e.target.value)}
              placeholder="Search plain items (Garment, Colour, Size)..."
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-2xl text-xs focus:outline-none focus:bg-white transition"
            />
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            {plainSearchQuery && (
              <button
                onClick={() => setPlainSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Plain Filters Dropdown Pills */}
          <div className="flex flex-wrap gap-2 relative z-20">
            {/* Garment Type Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPlainActiveDropdown(plainActiveDropdown === 'type' ? null : 'type')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  plainFilterTypeId !== 'all'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Garment: {plainFilterTypeId === 'all' ? 'All' : clothingTypes.find(t => t.id === plainFilterTypeId)?.name}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {plainActiveDropdown === 'type' && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2.5 w-60 z-30 max-h-60 overflow-y-auto flex flex-col gap-1.5 text-left">
                  <input
                    type="text"
                    value={plainFilterOptionSearch}
                    onChange={(e) => setPlainFilterOptionSearch(e.target.value)}
                    placeholder="Search garment types..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => { setPlainFilterTypeId('all'); setPlainActiveDropdown(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold shrink-0"
                  >
                    All Garments
                  </button>
                  {clothingTypes.filter(t => t.name.toLowerCase().includes(plainFilterOptionSearch.toLowerCase())).map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setPlainFilterTypeId(type.id); setPlainActiveDropdown(null); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold truncate shrink-0"
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colour Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPlainActiveDropdown(plainActiveDropdown === 'colour' ? null : 'colour')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  plainFilterColourId !== 'all'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Colour: {plainFilterColourId === 'all' ? 'All' : colours.find(c => c.id === plainFilterColourId)?.name}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {plainActiveDropdown === 'colour' && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2.5 w-60 z-30 max-h-60 overflow-y-auto flex flex-col gap-1.5 text-left">
                  <input
                    type="text"
                    value={plainFilterOptionSearch}
                    onChange={(e) => setPlainFilterOptionSearch(e.target.value)}
                    placeholder="Search colours..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => { setPlainFilterColourId('all'); setPlainActiveDropdown(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold shrink-0"
                  >
                    All Colours
                  </button>
                  {colours.filter(c => c.name.toLowerCase().includes(plainFilterOptionSearch.toLowerCase())).map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => { setPlainFilterColourId(col.id); setPlainActiveDropdown(null); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold truncate shrink-0"
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Size Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPlainActiveDropdown(plainActiveDropdown === 'size' ? null : 'size')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  plainFilterSizeId !== 'all'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Size: {plainFilterSizeId === 'all' ? 'All' : sizes.find(s => s.skuCode === plainFilterSizeId)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {plainActiveDropdown === 'size' && (
                <div className="absolute left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2.5 w-60 z-30 max-h-60 overflow-y-auto flex flex-col gap-1.5 text-left">
                  <input
                    type="text"
                    value={plainFilterOptionSearch}
                    onChange={(e) => setPlainFilterOptionSearch(e.target.value)}
                    placeholder="Search sizes..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => { setPlainFilterSizeId('all'); setPlainActiveDropdown(null); }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold shrink-0"
                  >
                    All Sizes
                  </button>
                  {sizes.filter(s => s.label.toLowerCase().includes(plainFilterOptionSearch.toLowerCase())).map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => { setPlainFilterSizeId(size.skuCode); setPlainActiveDropdown(null); }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 font-semibold truncate shrink-0"
                    >
                      Size {size.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Button */}
            {(plainSearchQuery || plainFilterTypeId !== 'all' || plainFilterColourId !== 'all' || plainFilterSizeId !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setPlainSearchQuery('');
                  setPlainFilterTypeId('all');
                  setPlainFilterColourId('all');
                  setPlainFilterSizeId('all');
                }}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                Clear Filters
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>

          {/* Plain Data Table */}
          <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                    <th className="py-4 px-5">VacPac Status</th>
                    <th className="py-4 px-5">Garment Type</th>
                    <th className="py-4 px-5">Colour</th>
                    <th className="py-4 px-5">Size</th>
                    <th className="py-4 px-5 text-center">Total VacPacs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPlainVacPacConsolidated.map((group) => {
                    return (
                      <React.Fragment key={group.key}>
                        <tr className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                              {group.percentFull}% Full
                            </span>
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            {group.typeName}
                          </td>
                          <td className="py-4 px-5 text-slate-600 font-medium">
                            {group.colourName}
                          </td>
                          <td className="py-4 px-5 font-bold text-orange-600">
                            Size {group.sizeLabel}
                          </td>
                          <td className="py-4 px-5 text-center font-mono font-extrabold text-slate-900 text-sm">
                            {group.totalCount}
                          </td>
                        </tr>
                        {/* Sub-row detailing physical packs inside this category */}
                        <tr>
                          <td colSpan={5} className="bg-slate-50/40 px-5 py-3">
                            <div className="space-y-2 text-left">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">Physical Container Registry</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {group.vacpacs.map((pack) => (
                                  <div key={pack.id} className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col justify-between gap-2 shadow-2xs">
                                    <div className="flex justify-between items-start gap-2">
                                      <div>
                                        <span className="font-bold text-slate-800 text-[11px]">Pack #{pack.packNumber}</span>
                                        <span className="text-[10px] text-slate-400 block font-medium">{pack.locationName}</span>
                                      </div>
                                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                                        {pack.quantity} units
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end pt-1 border-t border-slate-50">
                                      <button
                                        onClick={() => {
                                          setPoppingVacPac(pack.itemObj);
                                          setTargetShelf('E7');
                                        }}
                                        className="text-[10px] text-secondary hover:text-secondary-hover font-bold border border-secondary/20 hover:border-secondary px-2 py-0.5 rounded cursor-pointer animate-fade-in"
                                      >
                                        Pop
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingItem(pack.itemObj);
                                          setEditItemQty(pack.itemObj.quantity);
                                          setEditItemShelf('E7');
                                          setEditItemLocationId(pack.itemObj.locationId);
                                        }}
                                        className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteItem(pack.id, `Plain Pack #${pack.packNumber}`)}
                                        className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer font-medium"
                                      >
                                        Del
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {filteredPlainVacPacConsolidated.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400 text-xs font-medium">
                        No Plain VacPac units found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Clickaway overlay for active filter dropdowns */}
      {(logoActiveDropdown || plainActiveDropdown) && (
        <div className="fixed inset-0 z-10 cursor-default" onClick={() => { setLogoActiveDropdown(null); setPlainActiveDropdown(null); }} />
      )}

      {/* FLOATING ACTION ADD STOCK BUTTON WITH POP OUT ALERTS */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Floating Low Stock Alerts Trigger & Popout Card */}
        {lowStockWithMatches.length > 0 && (
          <div className="relative flex flex-col items-end">
            <AnimatePresence>
              {isAlertsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="mb-3 bg-white border border-slate-100 rounded-3xl p-5 shadow-2xl w-80 max-h-96 overflow-y-auto space-y-3 relative z-50 text-left"
                >
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-1.5 text-rose-600 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Low Stock Alerts</span>
                    </div>
                    <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      {lowStockWithMatches.length} items
                    </span>
                  </div>

                  <div className="space-y-3">
                    {lowStockWithMatches.map(cand => {
                      const isLogo = cand.category === 'Logo';
                      const schoolName = isLogo ? (schools.find(s => s.skuCode === cand.schoolSku)?.name || cand.schoolSku) : 'Plain Item';
                      const typeName = clothingTypes.find(t => t.skuCode === cand.typeSku)?.name || cand.typeSku;
                      const sizeLabel = sizes.find(s => s.skuCode === cand.sizeSku)?.label || cand.sizeSku;
                      const colourName = colours.find(c => c.skuCode === cand.colourSku)?.name || cand.colourSku;
                      const matches = cand.vacpacs;

                      return (
                        <div key={cand.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100/80 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-mono font-bold text-slate-500 bg-white border border-slate-100 px-1.5 py-0.5 rounded uppercase">
                              Shelf {cand.shelfCode}
                            </span>
                            <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              {cand.quantity} loose left
                            </span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 truncate">{schoolName}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-normal">
                              {typeName} &bull; {colourName} &bull; Size {sizeLabel}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Available VacPacs to unpack:</span>
                            {matches.map(pack => (
                              <button
                                key={pack.id}
                                type="button"
                                disabled={transactionLoading === pack.id}
                                onClick={() => handlePopPackToPickerShelf(cand.singleItemObj, pack)}
                                className="w-full text-left p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition flex justify-between items-center text-[11px] font-semibold text-slate-700 disabled:opacity-50 cursor-pointer animate-none"
                              >
                                <span className="truncate">Pack #{pack.packNumber} ({pack.quantity} units)</span>
                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 flex items-center gap-1">
                                  {transactionLoading === pack.id ? 'Unpacking...' : 'Pop Pack'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {lowStockWithMatches.length === 0 && (
                      <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                        <CheckCircle2 className="w-8 h-8 text-teal-500 mb-1" />
                        <span className="font-bold text-slate-700">All Stock Good!</span>
                        <span>No restockable low stock items.</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className={`flex items-center justify-center gap-2 px-4 h-12 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer relative ${
                lowStockWithMatches.length > 0 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
              title="Low Stock Alerts Popout"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Restock</span>
              {lowStockWithMatches.length > 0 && (
                <span className="bg-rose-600 text-white font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  {lowStockWithMatches.length}
                </span>
              )}
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setFormError(null);
            setFormSuccess(null);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all font-bold tracking-wide cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span className="text-xs sm:text-sm">Add Item</span>
        </button>
      </div>

      {/* MODAL 1: DYNAMIC FLOATING ADD STOCK MODAL */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schools={schools}
        clothingTypes={clothingTypes}
        sizes={sizes}
        colours={colours}
        locations={locations}
      />

      {/* MODAL 2: CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        schools={schools}
        clothingTypes={clothingTypes}
        sizes={sizes}
        colours={colours}
        locations={locations}
      />

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setEditingItem(null)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10"
            >
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Edit Inventory Item</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{editingItem.skuid}</p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveInventoryEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quantity ({editingItem.type === 'single' ? 'Loose Units' : 'Units per Pack'})
                  </label>
                  <input
                    type="number"
                    value={editItemQty}
                    onChange={(e) => setEditItemQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
                    min={0}
                    required
                  />
                </div>

                {editingItem.type === 'single' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Shelf Grid Code (e.g., E7, B2)
                    </label>
                    <input
                      type="text"
                      value={editItemShelf}
                      onChange={(e) => setEditItemShelf(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 font-mono"
                      placeholder="e.g. E7"
                      required
                    />
                  </div>
                ) : null}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {editingItem.type === 'single' ? 'Logical Location Area' : 'Storage Zone Location'}
                  </label>
                  <select
                    value={editItemLocationId}
                    onChange={(e) => setEditItemLocationId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.skuCode}) — {loc.ruleProfile}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-xs transition shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POP VACPAC MODAL */}
      <AnimatePresence>
        {poppingVacPac && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setPoppingVacPac(null)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10"
            >
              <div className="bg-primary p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Pop VacPac to Picker Shelf</h3>
                  <p className="text-[10px] text-orange-200 font-mono mt-0.5">{poppingVacPac.skuid}</p>
                </div>
                <button
                  onClick={() => setPoppingVacPac(null)}
                  className="p-1 rounded-lg text-orange-200 hover:text-white hover:bg-primary-hover transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExecuteVacPacPop} className="p-6 space-y-4">
                {popError && (
                  <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">
                    {popError}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Package Summary</div>
                  <div className="text-slate-800">
                    School: <b>{schools.find(s => s.skuCode === poppingVacPac.schoolSku)?.name || poppingVacPac.schoolSku}</b>
                  </div>
                  <div className="text-slate-800">
                    Type: <b>{clothingTypes.find(t => t.skuCode === poppingVacPac.typeSku)?.name || poppingVacPac.typeSku}</b>
                  </div>
                  <div className="text-slate-800">
                    Colour: <b>{colours.find(c => c.skuCode === poppingVacPac.colourSku)?.name || poppingVacPac.colourSku}</b>
                  </div>
                  <div className="text-slate-800">
                    Size: <b>{sizes.find(s => s.skuCode === poppingVacPac.sizeSku)?.label || poppingVacPac.sizeSku}</b>
                  </div>
                  <div className="text-primary font-bold pt-1">
                    Units Unpacked Inside: {poppingVacPac.quantity} units
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target Picker Shelf Code (A1 to Z10)
                  </label>
                  <input
                    type="text"
                    value={targetShelf}
                    onChange={(e) => setTargetShelf(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 font-mono uppercase"
                    placeholder="e.g. E7"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    The atomic transaction will delete this VacPac and automatically add +{poppingVacPac.quantity} units onto the target shelf.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPoppingVacPac(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={transactionLoading === poppingVacPac.id}
                    className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {transactionLoading === poppingVacPac.id ? 'Processing...' : 'Execute Atomic Pop'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM INVENTORY ITEM DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => !isDeleting && setItemToDelete(null)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10"
            >
              <div className="bg-red-600 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Confirm Deletion</h3>
                  <p className="text-[10px] text-red-100 mt-0.5">This action cannot be undone</p>
                </div>
                <button
                  onClick={() => !isDeleting && setItemToDelete(null)}
                  className="p-1 rounded-lg text-red-200 hover:text-white hover:bg-red-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {deleteError && (
                  <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">
                    {deleteError}
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you absolutely sure you want to delete and write-off:
                </p>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-800">
                  {itemToDelete.description}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setItemToDelete(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteItem}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Overlay Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-[100] max-w-sm"
          >
            <div className={`p-4 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-100/35' 
                : 'bg-rose-50 border-rose-100 text-rose-800 shadow-rose-100/35'
            }`}>
              <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
