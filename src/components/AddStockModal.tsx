import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, Clothing_Type as ClothingTypeModel, Size, Colour, Location } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, runTransaction, increment } from 'firebase/firestore';
import { X, Sparkles, AlertTriangle, Plus } from 'lucide-react';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  Clothing_Type: ClothingTypeModel[];
  Size: Size[];
  Colour: Colour[];
  Location: Location[];
}

export default function AddStockModal({
  isOpen,
  onClose,
  schools,
  Clothing_Type,
  Size,
  Colour,
  Location,
}: AddStockModalProps) {
  const [formCategory, setFormCategory] = useState<'Plain' | 'Logo'>('Plain');
  const [formType, setFormType] = useState<'single' | 'vacpac'>('single');

  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedClothingTypeId, setSelectedClothingTypeId] = useState('');
  const [selectedColourId, setSelectedColourId] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  
  const [shelfCode, setShelfCode] = useState('');
  const [packNumber, setPackNumber] = useState<number>(1);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (schools.length > 0 && !selectedSchoolId) setSelectedSchoolId(schools[0].id);
    if (Clothing_Type.length > 0 && !selectedClothingTypeId) setSelectedClothingTypeId(Clothing_Type[0].id);
    if (Colour.length > 0 && !selectedColourId) setSelectedColourId(Colour[0].id);
    if (Size.length > 0 && !selectedSizeId) setSelectedSizeId(Size[0].id);
    if (Location.length > 0 && !selectedLocationId) setSelectedLocationId(Location[0].id);
  }, [schools, Clothing_Type, Colour, Size, Location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentSchool = schools.find(s => s.id === selectedSchoolId);
    const currentType = Clothing_Type.find(t => t.id === selectedClothingTypeId);
    const currentColour = Colour.find(c => c.id === selectedColourId);
    const currentSize = Size.find(s => s.id === selectedSizeId);
    const currentLocation = Location.find(l => l.id === selectedLocationId);

    if (!currentType || !currentColour || !currentSize || !currentLocation) {
      alert("Please select all core garment configurations.");
      return;
    }

    setLoading(true);

    try {
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
          transaction.update(querySnapshot.docs[0].ref, {
            quantity: increment(Number(quantityToAdd))
          });
        } else {
          const newDocRef = doc(collection(db, 'inventory'));
          transaction.set(newDocRef, {
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
          });
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 text-sm">Register Incoming Stock</h2>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Add your form inputs here (same as before) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs sm:text-sm tracking-wide transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Registering...' : 'Save and Register Stock Unit'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}