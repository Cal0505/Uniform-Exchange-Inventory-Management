import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, ClothingType, Size, Colour, Location, Category } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateSkuid, validateShelfCode, getSizeCategoryForGarment } from '../skuUtils';
import { X, Sparkles, AlertTriangle, Plus } from 'lucide-react';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  schools: School[];
  clothingTypes: ClothingType[];
  sizes: Size[];
  colours: Colour[];
  locations: Location[];
  defaultCategory?: string | null;
}

function normalizeKey(value: string) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function AddStockModal({
  isOpen,
  onClose,
  categories,
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  defaultCategory,
}: AddStockModalProps) {
  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((category) => category.name || 'Unnamed Category');
    }
    return ['Plain', 'Logo'];
  }, [categories]);

  const [formCategory, setFormCategory] = useState<string>('');
  const [formType, setFormType] = useState<'single' | 'vacpac'>('single');
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
  const [loading, setLoading] = useState(false);

  const effectiveCategoryName = useMemo(() => {
    const explicit = (defaultCategory || formCategory || '').trim();
    if (explicit) return explicit;
    return categoryOptions[0] || 'Plain';
  }, [defaultCategory, formCategory, categoryOptions]);

  const selectedCategoryMeta = useMemo(() => {
    const lookup = effectiveCategoryName.trim();
    if (!lookup) return undefined;
    return (
      categories.find((category) => {
        const name = (category.name || '').trim().toLowerCase();
        return name === lookup.toLowerCase() || category.id === lookup;
      }) ||
      categories.find((category) => normalizeKey(category.name || '') === normalizeKey(lookup))
    );
  }, [categories, effectiveCategoryName]);

  const categoryPackagingType = String((selectedCategoryMeta as any)?.packagingType || '').trim().toLowerCase();
  const legacySingleFlag = selectedCategoryMeta ? (selectedCategoryMeta as any).hasSingles !== false : true;
  const legacyBulkFlag = selectedCategoryMeta ? (selectedCategoryMeta as any).hasBulk !== false : true;

  const categorySupportsSingle = (() => {
    if (categoryPackagingType === 'single') return true;
    if (categoryPackagingType === 'vacpac') return false;
    if (categoryPackagingType === 'both') return true;
    if ((selectedCategoryMeta as any)?.hasSingles === false) return false;
    if ((selectedCategoryMeta as any)?.hasBulk === false) return true;
    return legacySingleFlag;
  })();

  const categorySupportsVacPac = (() => {
    if (categoryPackagingType === 'vacpac') return true;
    if (categoryPackagingType === 'single') return false;
    if (categoryPackagingType === 'both') return true;
    if ((selectedCategoryMeta as any)?.hasBulk === false) return false;
    if ((selectedCategoryMeta as any)?.hasSingles === false) return true;
    return legacyBulkFlag;
  })();

  const availableModes = useMemo(() => {
    const modes: Array<'single' | 'vacpac'> = [];
    if (categorySupportsSingle) modes.push('single');
    if (categorySupportsVacPac) modes.push('vacpac');
    return modes.length ? modes : ['single'];
  }, [categorySupportsSingle, categorySupportsVacPac]);

  const showPackagingQuestion = availableModes.length > 1;
  const categoryRequiresSchool = useMemo(() => {
    if (selectedCategoryMeta) {
      return (selectedCategoryMeta as any).hasSchool !== false && (selectedCategoryMeta as any).hasSchools !== false;
    }

    const normalized = normalizeKey(effectiveCategoryName);
    return normalized !== 'plain' && normalized !== 'logo' && normalized !== 'new';
  }, [effectiveCategoryName, selectedCategoryMeta]);

  useEffect(() => {
    if (!isOpen) return;

    const preferredCategory = defaultCategory && defaultCategory.trim()
      ? defaultCategory.trim()
      : categoryOptions[0] || 'Plain';

    const match = categories.find((category) => {
      const name = (category.name || '').trim();
      return name.toLowerCase() === preferredCategory.toLowerCase() || category.id === preferredCategory;
    });

    const nextCategory = match ? (match.name || match.id) : preferredCategory;
    setFormCategory(nextCategory);
  }, [defaultCategory, categories, categoryOptions, isOpen]);

  useEffect(() => {
    if (!availableModes.includes(formType)) {
      setFormType(availableModes[0] as 'single' | 'vacpac');
    }
  }, [availableModes, formType]);

  useEffect(() => {
    if (!locations.length) {
      setSelectedLocationId('');
      return;
    }

    const targetProfile = formType === 'single' ? 'Pickers Shelf' : 'VacPac Storage Area';
    const visibleLocations = locations.filter(
      (location) => !location.ruleProfile || location.ruleProfile === targetProfile,
    );
    const nextChoices = visibleLocations.length ? visibleLocations : locations;
    const stillValid = nextChoices.some((location) => location.id === selectedLocationId);

    if (!selectedLocationId || !stillValid) {
      setSelectedLocationId(nextChoices[0].id);
    }
  }, [formType, locations, selectedLocationId]);

  const selectedType = useMemo(
    () => clothingTypes.find((type) => type.id === selectedTypeId),
    [clothingTypes, selectedTypeId],
  );

  const filteredSizes = useMemo(() => {
    if (!selectedType) return sizes;
    const targetKey = normalizeKey(getSizeCategoryForGarment(selectedType.name));
    return sizes.filter((size) => normalizeKey(size.category || 'Clothes') === targetKey);
  }, [sizes, selectedType]);

  useEffect(() => {
    if (!clothingTypes.length) {
      setSelectedTypeId('');
      return;
    }

    if (!selectedTypeId || !clothingTypes.some((type) => type.id === selectedTypeId)) {
      setSelectedTypeId(clothingTypes[0].id);
    }
  }, [clothingTypes, selectedTypeId]);

  useEffect(() => {
    if (!colours.length) {
      setSelectedColourId('');
      return;
    }

    if (!selectedColourId || !colours.some((colour) => colour.id === selectedColourId)) {
      setSelectedColourId(colours[0].id);
    }
  }, [colours, selectedColourId]);

  useEffect(() => {
    if (!schools.length) {
      setSelectedSchoolId('');
      return;
    }

    if (!categoryRequiresSchool) {
      setSelectedSchoolId('');
      return;
    }

    if (!selectedSchoolId || !schools.some((school) => school.id === selectedSchoolId)) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [categoryRequiresSchool, schools, selectedSchoolId]);

  useEffect(() => {
    if (!selectedType) return;

    if (filteredSizes.length === 0) {
      setSelectedSizeId('');
      return;
    }

    if (!selectedSizeId || !filteredSizes.some((size) => size.id === selectedSizeId)) {
      setSelectedSizeId(filteredSizes[0].id);
    }
  }, [selectedType, filteredSizes, selectedSizeId]);

  useEffect(() => {
    if (!selectedType || !formCategory) return;

    const currentCategory = formCategory.trim();
    if (!['Logo', 'Plain'].includes(currentCategory)) {
      return;
    }

    const supportsLogo = selectedType.logo !== false;
    const supportsPlain = selectedType.plain !== false;

    if (!supportsLogo && currentCategory !== 'Plain') {
      setFormCategory('Plain');
      return;
    }

    if (!supportsPlain && currentCategory !== 'Logo') {
      setFormCategory('Logo');
    }
  }, [selectedType, formCategory]);

  const selectedLocation = locations.find((location) => location.id === selectedLocationId);
  const selectedSchool = schools.find((school) => school.id === selectedSchoolId);
  const selectedColour = colours.find((colour) => colour.id === selectedColourId);
  const selectedSize = sizes.find((size) => size.id === selectedSizeId);
  const selectedCategory = categories.find(
    (category) => normalizeKey(category.name || '') === normalizeKey(effectiveCategoryName || ''),
  );

  const getCompiledSkuPreview = () => {
    if (!selectedColour || !selectedType || !selectedSize || !selectedLocation) {
      return 'Awaiting selections...';
    }

    if (categoryRequiresSchool && !selectedSchool) {
      return 'Awaiting school selection...';
    }

    if (formType === 'single') {
      if (!shelfCode.trim() || !validateShelfCode(shelfCode)) {
        return 'Enter valid shelf grid (A1-Z10)';
      }
      return generateSkuid({
        ruleProfile: 'Pickers Shelf',
        locationSku: selectedLocation.skuCode,
        shelfCode: shelfCode.toUpperCase().trim(),
        schoolSku: selectedSchool?.skuCode || 'N/A',
        colourSku: selectedColour.skuCode,
        typeSku: selectedType.skuCode,
        sizeSku: selectedSize.skuCode,
      });
    }

    if (packNumber <= 0) {
      return 'Enter valid pack number';
    }

    return generateSkuid({
      ruleProfile: 'VacPac Storage Area',
      locationSku: selectedLocation.skuCode,
      packNumber,
      schoolSku: selectedSchool?.skuCode || 'N/A',
      colourSku: selectedColour.skuCode,
      typeSku: selectedType.skuCode,
      sizeSku: selectedSize.skuCode,
    });
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setLoading(true);

    if (!selectedLocation || !selectedColour || !selectedType || !selectedSize) {
      setFormError('Please complete all selection dropdowns.');
      setLoading(false);
      return;
    }

    if (categoryRequiresSchool && !selectedSchool) {
      setFormError('This category requires a school selection.');
      setLoading(false);
      return;
    }

    const isPickers = formType === 'single';

    if (isPickers) {
      if (!shelfCode.trim()) {
        setFormError('Please enter a shelf grid code.');
        setLoading(false);
        return;
      }
      if (!validateShelfCode(shelfCode)) {
        setFormError('Shelf grid code must be in the format A1 to Z10 (e.g. E7, B3, Z10).');
        setLoading(false);
        return;
      }
      if (singlesQuantity <= 0) {
        setFormError('Quantity must be greater than zero.');
        setLoading(false);
        return;
      }
    } else {
      if (packNumber <= 0) {
        setFormError('Pack ID Number must be a positive number.');
        setLoading(false);
        return;
      }
      if (formCategory === 'Logo' && packNumber > 99) {
        setFormError('Logo VacPacs must have a Pack ID Number between 1 and 99.');
        setLoading(false);
        return;
      }
      if (unitsPerPack <= 0) {
        setFormError('Units per pack must be greater than zero.');
        setLoading(false);
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
        schoolSku: selectedSchool?.skuCode || 'N/A',
        colourSku: selectedColour.skuCode,
        typeSku: selectedType.skuCode,
        sizeSku: selectedSize.skuCode,
      });

      if (isPickers) {
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
              categoryId: selectedCategory?.id || formCategory,
              locationId: selectedLocation.id,
              locationSku: selectedLocation.skuCode,
              shelfCode: cleanShelf,
              schoolId: selectedSchool?.id || 'N/A',
              schoolSku: selectedSchool?.skuCode || 'N/A',
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

        setFormSuccess(`Stored ${singlesQuantity} singles onto shelf ${cleanShelf} successfully.`);
      } else {
        const docId = skuid;
        const docRef = doc(db, 'inventory', docId);

        await setDoc(docRef, {
          id: docId,
          skuid,
          type: 'vacpac',
          category: formCategory,
          categoryId: selectedCategory?.id || formCategory,
          locationId: selectedLocation.id,
          locationSku: selectedLocation.skuCode,
          packNumber,
          schoolId: selectedSchool?.id || 'N/A',
          schoolSku: selectedSchool?.skuCode || 'N/A',
          colourId: selectedColour.id,
          colourSku: selectedColour.skuCode,
          typeId: selectedType.id,
          typeSku: selectedType.skuCode,
          sizeId: selectedSize.id,
          sizeSku: selectedSize.skuCode,
          quantity: unitsPerPack,
          updatedAt: serverTimestamp(),
        });

        setFormSuccess(`Stored VacPac #${packNumber} with ${unitsPerPack} items successfully.`);
        setPackNumber((current) => current + 1);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'inventory');
      setFormError('Failed to save to database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden relative z-10"
          >
            <div className="bg-primary text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-lg">Add New Stock Unit</h3>
                <p className="text-xs opacity-90">Kirklees School Uniform Exchange</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 transition-all text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInventory} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 bg-teal-50 border border-teal-100 text-teal-800 text-xs rounded-2xl flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-teal-600 animate-bounce" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {!defaultCategory && categoryOptions.length > 1 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Uniform Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 flex items-center justify-between">
                    <span>{effectiveCategoryName}</span>
                  </div>
                </div>
              )}

              {showPackagingQuestion && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Packaging Format
                  </label>
                  <div className="grid grid-cols-2 gap-3 bg-slate-100 p-1.5 rounded-2xl">
                    {availableModes.includes('single') && (
                      <button
                        type="button"
                        onClick={() => setFormType('single')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                          formType === 'single' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Single (Loose Items)
                      </button>
                    )}
                    {availableModes.includes('vacpac') && (
                      <button
                        type="button"
                        onClick={() => setFormType('vacpac')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                          formType === 'vacpac' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        VacPac (Bulk Bundle)
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                <span className="block text-xs font-extrabold text-secondary tracking-wider uppercase">
                  Location & Stock Value
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Warehouse Zone / Area
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                    required
                  >
                    {locations
                      .filter(
                        (location) =>
                          !location.ruleProfile ||
                          location.ruleProfile === (formType === 'single' ? 'Pickers Shelf' : 'VacPac Storage Area'),
                      )
                      .map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                  </select>
                </div>

                {formType === 'single' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Shelf Grid Code
                      </label>
                      <input
                        type="text"
                        value={shelfCode}
                        onChange={(e) => setShelfCode(e.target.value.toUpperCase())}
                        placeholder="e.g. E7"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-primary focus:bg-white transition"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Loose Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={singlesQuantity}
                        onChange={(e) => setSinglesQuantity(parseInt(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pack ID Number
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={formCategory === 'Logo' ? 99 : undefined}
                        value={packNumber}
                        onChange={(e) => setPackNumber(parseInt(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:bg-white transition"
                      />
                      {formCategory === 'Logo' && (
                        <p className="text-[10px] text-orange-600 mt-1 font-medium leading-tight">
                          Limit 1–99 for school packs
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Units Per Pack
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={unitsPerPack}
                        onChange={(e) => setUnitsPerPack(parseInt(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary focus:bg-white transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {categoryRequiresSchool && (
                <div className="space-y-3.5 pt-1">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Clothing Item Traits
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        School Translation
                      </label>
                      <select
                        value={selectedSchoolId}
                        onChange={(e) => setSelectedSchoolId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                        required
                      >
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Garment Type
                      </label>
                      <select
                        value={selectedTypeId}
                        onChange={(e) => setSelectedTypeId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                        required
                      >
                        {clothingTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Colour
                      </label>
                      <select
                        value={selectedColourId}
                        onChange={(e) => setSelectedColourId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                        required
                      >
                        {colours.map((colour) => (
                          <option key={colour.id} value={colour.id}>
                            {colour.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Size Option
                      </label>
                      <select
                        value={selectedSizeId}
                        onChange={(e) => setSelectedSizeId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                        required
                      >
                        {filteredSizes.length > 0 ? (
                          filteredSizes.map((size) => (
                            <option key={size.id} value={size.id}>
                              {size.label} {size.category && size.category !== 'Clothes' ? `(${size.category})` : ''}
                            </option>
                          ))
                        ) : (
                          <option value="">No sizes available</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {!categoryRequiresSchool && (
                <div className="space-y-3.5 pt-1">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Clothing Item Traits
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Garment Type
                      </label>
                      <select
                        value={selectedTypeId}
                        onChange={(e) => setSelectedTypeId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                        required
                      >
                        {clothingTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Colour
                      </label>
                      <select
                        value={selectedColourId}
                        onChange={(e) => setSelectedColourId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                        required
                      >
                        {colours.map((colour) => (
                          <option key={colour.id} value={colour.id}>
                            {colour.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Size Option
                      </label>
                      <select
                        value={selectedSizeId}
                        onChange={(e) => setSelectedSizeId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                        required
                      >
                        {filteredSizes.length > 0 ? (
                          filteredSizes.map((size) => (
                            <option key={size.id} value={size.id}>
                              {size.label} {size.category && size.category !== 'Clothes' ? `(${size.category})` : ''}
                            </option>
                          ))
                        ) : (
                          <option value="">No sizes available</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
                  SKU Preview
                </div>
                <div className="font-mono text-[11px] text-slate-700 break-all">{getCompiledSkuPreview()}</div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm tracking-wide transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-[#00A896] hover:bg-[#008f80] disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  {loading ? 'Registering...' : 'Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
