import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash2, Plus, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface AdvancedSchool {
  id: string; name: string; schoolType: string; schoolIdCode: string; skuCode: string;
}

interface AdvancedAttribute {
  id: string; name?: string; label?: string; skuCode: string; ruleProfile?: string; sizeGroupTag?: string; sortOrder?: number;
}

interface ManagementProps {
  schools: AdvancedSchool[];
  clothingTypes: AdvancedAttribute[];
  sizes: AdvancedAttribute[];
  colours: AdvancedAttribute[];
  locations: AdvancedAttribute[];
  categories: any[];
  schoolTypes: any[];
  userRole: string;
  forcedSubTabOverride?: string;
}

export default function Management({
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  categories,
  schoolTypes,
  userRole,
  forcedSubTabOverride
}: ManagementProps) {
  // Local input tracking states for the configuration forms
  const [formNameInput, setFormNameInput] = useState('');
  const [formSkuInput, setFormSkuInput] = useState('');
  const [formSizeGroupChoice, setFormSizeGroupChoice] = useState('YOUTH_AGE');
  const [formSchoolTypeChoice, setFormSchoolTypeChoice] = useState('JIN');
  const [formSchoolIdInput, setFormSchoolIdInput] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ table: string; id: string; name: string } | null>(null);

  // 📡 DYNAMIC MANAGEMENT TAB ROUTER TETHERED TO NAVBAR CLICKS
  const currentManagementView = forcedSubTabOverride || 'categories';

  // 📡 DATA SHEET COMPILER INDEX: Maps out rows live based on active sidebar parameters selections
  const getActiveViewItemsAndLabels = () => {
    switch (currentManagementView) {
      case 'categories': 
        return { items: categories.map(c => ({ id: c.id, name: c.name || '', code: c.skuCode || '', meta: '' })), title: 'Master Categories', label: 'Category Name', codeLabel: 'SKU Prefix (e.g. L, P, N)' };
      case 'schoolTypes': 
        return { items: schoolTypes.map(st => ({ id: st.id, name: st.name || '', code: st.skuCode || '', meta: '' })), title: 'School Classification Types', label: 'Classification Tier (e.g. Junior, Senior)', codeLabel: 'Type Code (e.g. JIN, SEN)' };
      case 'schools': 
        return { items: schools.map(s => ({ id: s.id, name: s.name, code: `${s.schoolType}-${s.schoolIdCode}`, meta: '' })), title: 'School Registry Profiles', label: 'School Full Name', codeLabel: 'Abbreviation Code (e.g. AHW, BKW)' };
      case 'types': 
        return { items: clothingTypes.map(t => ({ id: t.id, name: t.name || '', code: t.skuCode || '', meta: t.sizeGroupTag || '' })), title: 'Garment Types Blueprint Matrix', label: 'Garment Description Name (e.g. Jumper)', codeLabel: 'SKU Center Fragment (e.g. JUMP)' };
      case 'sizes': 
        return { items: sizes.map(s => ({ id: s.id, name: s.label || s.name || '', code: s.skuCode || '', meta: s.sizeGroupTag || '' })), title: 'Sizes Options Matrix', label: 'Display Size Suffix (e.g. 3-4yrs, Medium)', codeLabel: 'Database Code (e.g. 0304, MEDI)' };
      case 'colours': 
        return { items: colours.map(c => ({ id: c.id, name: c.name || '', code: c.skuCode || '', meta: '' })), title: 'Fabric Colours Profiles', label: 'Colour Shade Name (e.g. Burgundy)', codeLabel: 'Colour Code (e.g. BUR, RED)' };
      case 'locations': 
        return { items: locations.map(l => ({ id: l.id, name: l.name || '', code: l.skuCode || '', meta: '' })), title: 'Warehouse Storage Locations', label: 'Physical Zone Name (e.g. Pickers Shelf)', codeLabel: 'Zone Prefix (e.g. PS, UO)' };
      default: 
        return { items: [], title: 'Registry', label: 'Name', codeLabel: 'Code' };
    }
  };


  const activeView = getActiveViewItemsAndLabels();

  // Clear input fields when swapping configuration parameters sheets
  useEffect(() => {
    setFormNameInput(''); setFormSkuInput(''); setFormSizeGroupChoice('YOUTH_AGE'); setFormSchoolTypeChoice('JIN'); setFormSchoolIdInput('');
  }, [currentManagementView]);
  const handleRegisterNewParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameInput.trim()) {
      alert("Validation Error: Configuration parameter label name cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanName = formNameInput.trim();
      const cleanSku = formSkuInput.trim().toUpperCase();

      // 🛰️ DYNAMIC DATABASE COLLECTION router target selector
      if (currentManagementView === 'schools') {
        if (!formSchoolIdInput.trim()) return alert("Validation Error: School abbreviation code required.");
        await addDoc(collection(db, 'schools'), {
          name: cleanName,
          schoolType: formSchoolTypeChoice,
          schoolIdCode: formSchoolIdInput.trim().toUpperCase(),
          skuCode: `${formSchoolTypeChoice}-${formSchoolIdInput.trim().toUpperCase()}`.toUpperCase()
        });
      } else {
        const targetedTable = currentManagementView === 'types' ? 'clothingTypes' : currentManagementView;
        const payloadData: any = { skuCode: cleanSku };
        
        if (currentManagementView === 'sizes') payloadData.label = cleanName; else payloadData.name = cleanName;
        
        // 📏 MATRIX RULE ASSIGNMENTS: Binds jumpers and shoes to their exact size groupings on setup save
        if (currentManagementView === 'types' || currentManagementView === 'sizes') {
          payloadData.sizeGroupTag = formSizeGroupChoice;
        }

        await addDoc(collection(db, targetedTable), payloadData);
      }

      setFormNameInput(''); setFormSkuInput(''); setFormSchoolIdInput('');
    } catch (err) { console.error("Management registry write failure:", err); } 
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDeletion = async () => {
    if (!itemToDelete) return;
    try {
      const targetedTable = itemToDelete.table === 'types' ? 'clothingTypes' : itemToDelete.table;
      await deleteDoc(doc(db, targetedTable, itemToDelete.id));
      setItemToDelete(null);
    } catch (err) { console.error("Registry document deletion blocked:", err); }
  };
  return (
    <div className="p-1 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full text-left animate-fadeIn font-sans max-w-5xl relative">
      
      {/* COLUMN 1: CONFIGURE INPUT REGISTRATION PARAMETERS CONSOLE SCREEN CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 h-fit space-y-4 shadow-xs border-t-4 border-brand-teal">
        <div className="space-y-0.5">
          <span className="text-[9px] font-mono font-black text-brand-teal uppercase tracking-widest">Setup Console</span>
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Configure {activeView.title}</h4>
        </div>

        <form onSubmit={handleRegisterNewParameter} className="space-y-4 text-xs font-bold">
          
          {/* Main textual field name parameter configuration tag input */}
          <div>
            <label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">{activeView.label}</label>
            <input type="text" placeholder={`Enter unique profile label...`} value={formNameInput} onChange={(e) => setFormNameInput(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium text-slate-800" />
          </div>

          {/* DYNAMIC FORMS MATRIX ADAPTER: Switches options custom based on management view layer */}
          {currentManagementView === 'schools' ? (
            <div className="space-y-4 animate-fadeIn">
              <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Campus Classification Tier</label><select value={formSchoolTypeChoice} onChange={(e) => setFormSchoolTypeChoice(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-700">{schoolTypes.map(st => <option key={st.id} value={st.skuCode}>{st.name} ({st.skuCode})</option>)}</select></div>
              <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">{activeView.codeLabel}</label><input type="text" maxLength={4} placeholder="e.g. AHW, BKW, DD" value={formSchoolIdInput} onChange={(e) => setFormSchoolIdInput(e.target.value)} className="w-full p-2.5 border rounded-xl font-mono uppercase font-black text-brand-primary" /></div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">{activeView.codeLabel}</label>
              <input type="text" placeholder="e.g. JUMP, OUT, RED" value={formSkuInput} onChange={(e) => setFormSkuInput(e.target.value)} className="w-full p-2.5 border rounded-xl font-mono uppercase font-black text-brand-primary" />
            </div>
          )}

          {/* 📏 SIZING GROUP MATRIX BINDER DROPDOWN: Shows up ONLY when setting up Garment Types or Sizes */}
          {(currentManagementView === 'types' || currentManagementView === 'sizes') && (
            <div className="p-3 bg-slate-50 border rounded-xl space-y-1.5 animate-fadeIn">
              <label className="block text-[10px] font-black text-brand-teal uppercase tracking-wider">📏 Bind Sizing Category Profile Matrix</label>
              <select value={formSizeGroupChoice} onChange={(e) => setFormSizeGroupChoice(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-slate-800 font-bold">
                <option value="YOUTH_AGE">👕 Youth Clothing Sizing (Age Tracks: 3-4, 5-6)</option>
                <option value="ADULT_LETTER">👕 Adult Clothing Letter Sizing (S, M, L, XL)</option>
                <option value="WAIST_INCHES">🩳 Trousers & Skirts Waist Sizing (Inches)</option>
                <option value="FOOTWEAR">👟 Footwear & Shoe Sizing (Numerical Sizes)</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full py-2.5 px-4 bg-brand-primary text-white font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition hover:brightness-105 flex items-center justify-center gap-1.5">{isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}<span>Register Component Code</span></button>
        </form>
      </div>
      {/* COLUMN 2 & 3: THE FLAT WORKBOOK ARCHITECTURE METADATA REGISTRY LIST OVERVIEW SPREADSHEET */}
      <div className="lg:col-span-2 space-y-4">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider select-none">Active Registered Parameters Log</h4>
        
        <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b select-none">
              <tr>
                <th className="px-4 py-3.5">Parameter Label Name</th>
                <th className="px-4 py-3.5">SKU Key Component</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {activeView.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/40 transition">
                  <td className="px-4 py-3.5 align-middle text-left font-black text-slate-900 text-xs">
                    <div className="space-y-0.5">
                      <span>{item.name}</span>
                      {item.meta && (
                        <span className="block text-[9px] font-mono font-black text-brand-teal uppercase tracking-wider">Bound Size Tier: {item.meta}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle text-left">
                    <span className="inline-block text-[10px] font-mono font-black tracking-wider text-brand-primary bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                      {item.code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle">
                    <button type="button" onClick={() => setItemToDelete({ table: currentManagementView, id: item.id, name: item.name })} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {activeView.items.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400 italic select-none">No active profiles registered inside this parameter sub-tab database table node.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTION DIALOG CONFIRMATION DELETION LIGHTBOX PANEL MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs select-none">
          <div className="absolute inset-0" onClick={() => setItemToDelete(null)} />
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border overflow-hidden relative z-10 p-5 space-y-4 text-left animate-fadeIn">
            <div className="flex items-center gap-2 text-red-600 font-black text-sm uppercase tracking-wide"><AlertTriangle className="w-5 h-5 shrink-0" /><span>Confirm Database Removal</span></div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Are you absolutely sure you want to permanently delete this option? Stock records relying on this code prefix segment may become unlinked.</p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs font-bold text-slate-700 truncate">{itemToDelete.name}</div>
            <div className="flex justify-end gap-2 pt-2 border-t text-xs font-bold">
              <button type="button" onClick={() => setItemToDelete(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl cursor-pointer">Cancel</button>
              <button type="button" onClick={handleConfirmDeletion} className="px-4 py-2 bg-red-600 text-white rounded-xl shadow-md cursor-pointer">Delete Option</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
