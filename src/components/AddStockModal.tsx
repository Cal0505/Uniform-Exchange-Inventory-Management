import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, ClothingType, Size, Colour, Location } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, runTransaction, increment } from 'firebase/firestore';
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
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedClothingTypeId, setSelectedClothingTypeId] = useState('');
  const [selectedColourId, setSelectedColourId] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  
  const [shelfCode, setShelfCode] = useState('');
  const [packNumber, setPackNumber] = useState<number>(1);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Automatically adjust defaults when selections change
  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) setSelectedSchoolId(schools[0].id);
    if (clothingTypes.length > 0 && !selectedClothingTypeId) setSelectedClothingTypeId(clothingTypes[0].id);
    if (colours.length > 0 && !selectedColourId) setSelectedColourId(colours[0].id);
    if (sizes.length > 0 && !selectedSizeId) setSelectedSizeId(sizes[0].id);
    if (locations.length > 0 && !selectedLocationId) setSelectedLocationId(locations[0].id);
  }, [schools, clothingTypes, colours, sizes, locations]);

  // Submit Handler executing an atomic transaction matching the schema blueprint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentSchool = schools.find(s => s.id === selectedSchoolId);
    const currentType = clothingTypes.find(t => t.id === selectedClothingTypeId);
    const currentColour = colours.find(c => c.id === selectedColourId);
    const currentSize = sizes.find(s => s.id === selectedSizeId);
    const currentLocation = locations.find(l => l.id === selectedLocationId);

    if (!currentType || !currentColour || !currentSize || !currentLocation) {
      alert("Please select all core garment configurations.");
      return;
    }

    setLoading(true);

    try {
      // Formulate the Composite SKUID
      const categoryPrefix = formCategory === 'Logo' ? 'L' : 'P';
      const segments = [
        categoryPrefix,
        formCategory === 'Logo' ? currentSchool?.skuCode : null,
        currentType.skuCode,
        currentColour.skuCode,
        currentSize.skuCode
      ].filter(Boolean);

      const synthesizedSkuid = segments.join('-').toUpperCase();

      await runTransaction(db, async (transaction) => {
        const inventoryCollectionRef = collection(db, 'inventory');
        
        const q = query(
          inventoryCollectionRef, 
          where('skuid', '==', synthesizedSkuid),
          where('locationId', '==', selectedLocationId)
        );
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // If match exists at this location, increment quantity counter
          const existingDocRef = querySnapshot.docs[0].ref;
          transaction.update(existingDocRef, {
            quantity: increment(Number(quantityToAdd))
          });
        } else {
          // Create brand new matching inventory row row entry
          const newDocRef = doc(collection(db, 'inventory'));
          const newInventoryPayload = {
            id: newDocRef.id,
            skuid: synthesizedSkuid,
            type: formType, 
            locationId: selectedLocationId,
            locationSku: currentLocation.skuCode,
            shelfCode: shelfCode.trim().toUpperCase() || "UNASSIGNED",
            packNumber: formType === 'vacpac' ? Number(packNumber) : 0,
            schoolId: formCategory === 'Logo' ? selectedSchoolId : "PLAIN_STOCK",
            schoolSku: formCategory === 'Logo' ? (currentSchool?.skuCode || "") : "",
            colourId: selectedColourId,
            colourSku: currentColour.skuCode,
            typeId: selectedClothingTypeId,
            typeSku: currentType.skuCode,
            sizeId: selectedSizeId,
            sizeSku: currentSize.skuCode,
            quantity: Number(quantityToAdd)
          };

          transaction.set(newDocRef, newInventoryPayload);
        }
      });

      onClose(); 
    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Failed to register stock unit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs select-none">
          <div className="absolute inset-0" onClick={onClose} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">Register Incoming Stock</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Add units straight to warehouse ledger</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Category Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormCategory('Plain')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${formCategory === 'Plain' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Plain Stock
                </button>
                <button
                  type="button"
                  onClick={() => setFormCategory('Logo')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${formCategory === 'Logo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  School Logoed Stock
                </button>
              </div>

              {/* Storage Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormType('single')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${formType === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Single Unit Loose
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('vacpac')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${formType === 'vacpac' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  VacPac Sealed Bundle
                </button>
              </div>

              {/* Dynamic Storage Form Options Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Zone</label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                    required
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.skuCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Shelf / Bin Code</label>
                  <input
                    type="text"
                    value={shelfCode}
                    onChange={(e) => setShelfCode(e.target.value)}
                    placeholder="e.g. A12"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantityToAdd}
                    onChange={(e) => setQuantityToAdd(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              {formType === 'vacpac' && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 w-full">
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      Sealing into a VacPac requires assigning a unique identifying bag tracking tag integer.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">Pack Number Tag</label>
                      <input
                        type="number"
                        min="1"
                        value={packNumber}
                        onChange={(e) => setPackNumber(Number(e.target.value))}
                        className="w-32 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-slate-900"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Core Attributes Selection Block */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Garment Profile Attributes</h4>
                
                {formCategory === 'Logo' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target School Affiliate</label>
                    <select
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                      required
                    >
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.skuCode})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Garment Type</label>
                    <select
                      value={selectedClothingTypeId}
                      onChange={(e) => setSelectedClothingTypeId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                      required
                    >
                      {clothingTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.skuCode})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Colour Specification</label>
                    <select
                      value={selectedColourId}
                      onChange={(e) => setSelectedColourId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                      required
                    >
                      {colours.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.skuCode})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Size Selection</label>
                    <select
                      value={selectedSizeId}
                      onChange={(e) => setSelectedSizeId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:bg-white transition"
                      required
                    >
                      {sizes.map(s => (
                        <option key={s.id} value={s.id}>{s.label} ({s.skuCode})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs sm:text-sm tracking-wide transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
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