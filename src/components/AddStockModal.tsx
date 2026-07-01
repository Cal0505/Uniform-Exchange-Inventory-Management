import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, ClothingType, Size, Colour, Location } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateSkuid, validateShelfCode, getSizeCategoryForGarment } from '../skuUtils';
import { X, Sparkles, AlertTriangle, Info, Plus } from 'lucide-react';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  clothingTypes: ClothingType[];
  sizes: Size[];
  colours: Colour[];
  locations: Location[];
}

export default function AddStockModal({
  isOpen,
  onClose,
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
}: AddStockModalProps) {
  // Form Categories & Types
  const [formCategory, setFormCategory] = useState<'Plain' | 'Logo'>('Plain');
  const [formType, setFormType] = useState<'single' | 'vacpac'>('single');

  // Form selections
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

  // Initialize selections on load or form type toggle
  useEffect(() => {
    const targetProfile = formType === 'single' ? 'Pickers Shelf' : 'VacPac Storage Area';
    const matchingLocs = locations.filter(l => l.ruleProfile === targetProfile);
    if (matchingLocs.length > 0) {
      setSelectedLocationId(matchingLocs[0].id);
    }
  }, [formType, locations]);

  const selectedType = useMemo(() => {
    return clothingTypes.find(t => t.id === selectedTypeId);
  }, [clothingTypes, selectedTypeId]);

  const filteredSizes = useMemo(() => {
    if (!selectedType) return sizes;
    const targetCategory = getSizeCategoryForGarment(selectedType.name);
    return sizes.filter(s => (s.category || 'Clothes').toLowerCase() === targetCategory.toLowerCase());
  }, [sizes, selectedType]);

  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) setSelectedSchoolId(schools[0].id);
    if (colours.length > 0 && !selectedColourId) setSelectedColourId(colours[0].id);
    if (clothingTypes.length > 0 && !selectedTypeId) setSelectedTypeId(clothingTypes[0].id);
  }, [schools, colours, clothingTypes]);

  // Synchronize size selection with the selected type's size category
  useEffect(() => {
    if (filteredSizes.length > 0) {
      const isCurrentSizeValid = filteredSizes.some(s => s.id === selectedSizeId);
      if (!isCurrentSizeValid) {
        setSelectedSizeId(filteredSizes[0].id);
      }
    } else if (sizes.length > 0 && !selectedSizeId) {
      setSelectedSizeId(sizes[0].id);
    }
  }, [filteredSizes, selectedSizeId, sizes]);

  // Automatically adjust Plain vs Logo category based on supported flags
  useEffect(() => {
    if (selectedType) {
      const supportsLogo = selectedType.logo !== false;
      const supportsPlain = selectedType.plain !== false;
      if (!supportsLogo && formCategory === 'Logo') {
        setFormCategory('Plain');
      } else if (!supportsPlain && formCategory === 'Plain') {
        setFormCategory('Logo');
      }
    }
  }, [selectedType, formCategory]);

  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const selectedColour = colours.find(c => c.id === selectedColourId);
  const selectedSize = sizes.find(s => s.id === selectedSizeId);

  // SKU ID dynamic compiler
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
        shelfCode: shelfCode.toUpperCase().trim(),
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
    setLoading(true);

    if (!selectedLocation || !selectedSchool || !selectedColour || !selectedType || !selectedSize) {
      setFormError('Please complete all selection dropdowns.');
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
        schoolSku: selectedSchool.skuCode,
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

        setFormSuccess(`Stored ${singlesQuantity} Singles onto shelf ${cleanShelf} successfully.`);
      } else {
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

        setFormSuccess(`Stored VacPac #${packNumber} with ${unitsPerPack} items successfully.`);
        setPackNumber(prev => prev + 1);
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
          {/* Backdrop clickaway */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="bg-primary text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-lg">Add New Stock Unit</h3>
                <p className="text-xs opacity-90">Kirklees School Uniform Exchange</p>
              </div>
              <button
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

              {/* Dynamic Step 1: Category */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  1. Uniform Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as 'Plain' | 'Logo')}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                >
                  {(!selectedType || selectedType.plain !== false) && (
                    <option value="Plain">Plain (No custom school logo)</option>
                  )}
                  {(!selectedType || selectedType.logo !== false) && (
                    <option value="Logo">Logo (Custom embroidered school logo)</option>
                  )}
                </select>
              </div>

              {/* Dynamic Step 2: Storage Format */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  2. Packaging Format
                </label>
                <div className="grid grid-cols-2 gap-3 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormType('single')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      formType === 'single'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Single (Loose Items)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('vacpac')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      formType === 'vacpac'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    VacPac (Bulk Bundle)
                  </button>
                </div>
              </div>

              {/* Step 3: Specifics depending on Single vs VacPac */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                <span className="block text-xs font-extrabold text-secondary tracking-wider uppercase">
                  3. Location & Stock Value
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
                      .filter(l => l.ruleProfile === (formType === 'single' ? 'Pickers Shelf' : 'VacPac Storage Area'))
                      .map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}
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

              {/* Step 4: Common traits */}
              <div className="space-y-3.5 pt-1">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  4. Clothing Item Traits
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
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
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
                      {clothingTypes.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
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
                      {colours.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
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
                      {filteredSizes.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.label} {(s.category && s.category !== 'Clothes') ? `(${s.category})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                {loading ? 'Registering...' : 'Save and Register Stock Unit'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
