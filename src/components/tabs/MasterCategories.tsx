import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Trash2, Edit2, Check, X, Package, ShieldAlert, Sparkles, LayoutGrid } from 'lucide-react';

interface MasterCategoriesProps {
  categories: any[];
  schoolTypes: any[];
  showNotification: (type: 'error' | 'success', message: string) => void;
  verifyAttributeIsSafeToDelete: (collectionName: string, id: string, label: string) => Promise<boolean>;
}

export default function MasterCategories({
  categories,
  schoolTypes,
  showNotification,
  verifyAttributeIsSafeToDelete
}: MasterCategoriesProps) {
  // 🗂️ MASTER WORKSPACE INNER NAVIGATION TABS
  const [innerTab, setInnerTab] = useState<'create' | 'registry'>('create');

  // 📝 FOOLPROOF FORM STATE CREATION FIELDS
  const [categoryName, setCategoryName] = useState('');
  const [hasSchool, setHasSchool] = useState(true);
  const [hasSingles, setHasSingles] = useState(true);
  const [hasBulk, setHasBulk] = useState(true);
  const [bulkType, setBulkType] = useState<'mixed' | 'single-garment'>('mixed');

  // 📝 INLINE EDITING STATE JIGS
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editHasSchool, setEditHasSchool] = useState(true);
  const [editHasSingles, setEditHasSingles] = useState(true);
  const [editHasBulk, setEditHasBulk] = useState(true);
  const [editBulkType, setEditBulkType] = useState<'mixed' | 'single-garment'>('mixed');

  // 🗑️ DELETION OVERLAY CONFIRMATION RIG
  const [metadataToDelete, setMetadataToDelete] = useState<{ id: string; label: string } | null>(null);

  const executeAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = categoryName.trim();
    
    if (!finalName) {
      return showNotification('error', 'Please enter a name for your category.');
    }

    // 🎯 AUTO-SKU COMPILER: Grabs the very first character and forces it UPPERCASE
    const finalSku = finalName.charAt(0).toUpperCase();

    if (categories.some(c => c.name?.toLowerCase() === finalName.toLowerCase() || c.skuCode === finalSku)) {
      return showNotification('error', `A category with this name or the automated code "${finalSku}" already exists.`);
    }

    try {
      await addDoc(collection(db, 'categories'), {
        name: finalName,
        skuCode: finalSku,
        hasSchool,
        hasSingles,
        hasBulk,
        bulkType: hasBulk ? bulkType : 'single-garment'
      });

      showNotification('success', `Category "${finalName}" saved successfully.`);
      setCategoryName('');
      setInnerTab('registry'); // Automatically switch to the list so they see it!
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleSaveEdit = async (id: string) => {
    const finalName = editNameValue.trim();
    if (!finalName) {
      return showNotification('error', 'Category name cannot be left blank.');
    }
    const finalSku = finalName.charAt(0).toUpperCase();

    try {
      await updateDoc(doc(db, 'categories', id), {
        name: finalName,
        skuCode: finalSku,
        hasSchool: editHasSchool,
        hasSingles: editHasSingles,
        hasBulk: editHasBulk,
        bulkType: editHasBulk ? editBulkType : 'single-garment'
      });
      showNotification('success', 'Changes synced to the cloud database successfully.');
      setEditingId(null);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  return (
    <div className="w-full font-sans text-left space-y-4">
      
      {/* 🎛️ TWO CLEAN COMPACT HORIZONTAL WORKSPACE TABS */}
      <div className="flex border-b border-slate-200 w-full gap-2 text-xs font-bold tracking-wide">
        <button 
          onClick={() => setInnerTab('create')}
          className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            innerTab === 'create' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Create Category Profile</span>
        </button>
        <button 
          onClick={() => setInnerTab('registry')}
          className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            innerTab === 'registry' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>View Active Settings ({categories.length})</span>
        </button>
      </div>

      {/* VIEW PANEL 1: PLAIN ENGLISH CREATION FORM AREA */}
      {innerTab === 'create' && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-xl mx-auto space-y-5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Package className="w-4 h-4 text-teal-600" />
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">New Category Rules Blueprint</h4>
          </div>
          
          <form onSubmit={executeAddCategory} className="space-y-5">
            <div>
              <label className="block mb-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wide">What do you want to call this category tab?</label>
              <input 
                type="text" 
                value={categoryName} 
                onChange={(e) => setCategoryName(e.target.value)} 
                placeholder="e.g. Logo, Plain, Pre-Loved, Donations" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-teal-600 font-medium transition" 
              />
              {categoryName.trim() && (
                <span className="block mt-1.5 text-[10px] text-slate-400 font-mono">
                  ✨ AUTOMATED SKU IDENTIFIER PIN: <strong className="text-teal-600 font-bold bg-teal-50 px-1 border rounded font-mono">{categoryName.trim().charAt(0).toUpperCase()}</strong>
                </span>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Warehouse Architecture Settings</span>
              
              <label className="flex items-start gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={hasSchool} onChange={(e) => setHasSchool(e.target.checked)} className="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300" />
                <div className="space-y-0.5">
                  <span className="block text-slate-900">Is this category linked to specific schools?</span>
                  <span className="block text-[10px] font-medium text-slate-400">Yes for Logo items (All Hallows, etc). No for general plain stock items.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={hasSingles} onChange={(e) => setHasSingles(e.target.checked)} className="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300" />
                <div className="space-y-0.5">
                  <span className="block text-slate-900">Does this category have a Pickers Shelf for loose singles?</span>
                  <span className="block text-[10px] font-medium text-slate-400">Turns on the - / + count keys on screens. Flags a Restock Alert radar if loose count drops below 3.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={hasBulk} onChange={(e) => setHasBulk(e.target.checked)} className="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300" />
                <div className="space-y-0.5">
                  <span className="block text-slate-900">Is overflow stock stored in VacPac back room bags?</span>
                  <span className="block text-[10px] font-medium text-slate-400">Enables bulk container allocation rows.</span>
                </div>
              </label>

              {hasBulk && (
                <div className="pl-6 pt-2 pb-1 space-y-2 bg-slate-50 border border-slate-200/60 rounded-xl max-w-md animate-fadeIn">
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wide">How are items sorted into those bags?</span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="radio" checked={bulkType === 'mixed'} onChange={() => setBulkType('mixed')} name="bulkType" className="text-teal-600 focus:ring-teal-500" />
                    <span>Mixed Bags (Holds multiple garment models for a school mixed together)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="radio" checked={bulkType === 'single-garment'} onChange={() => setBulkType('single-garment')} name="bulkType" className="text-teal-600 focus:ring-teal-500" />
                    <span>Single Item Bags (Tracks capacity layout percentages: 25%, 50%, 75%, 100% Full)</span>
                  </label>
                </div>
              )}
            </div>
            <button type="submit" className="w-full py-3 px-4 mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition uppercase tracking-wider">
              Save Category Profile
            </button>
          </form>
        </div>
      )}

      {/* VIEW PANEL 2: ALPHABETICALLY ORDERED INTERFACE REGISTRY LIST */}
      {innerTab === 'registry' && (
        <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-sm w-full animate-fadeIn">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Category Title</th>
                <th className="px-5 py-3.5">Active Operational Behaviors</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* 🎯 ALPHABETICAL AUTOMATIC SORT MATRIX */}
              {[...categories].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((cat) => {
                const isEditing = editingId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/40 transition">
                    <td className="px-5 py-4 font-medium text-slate-900 align-middle">
                      {isEditing ? (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">Edit Name</label>
                          <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="p-2 border rounded-xl text-xs bg-white w-full max-w-xs focus:border-teal-600 focus:outline-none" />
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="block font-black text-slate-900 text-sm">{cat.name}</span>
                          <span className="inline-block text-[9px] font-mono font-black tracking-wider text-teal-600 bg-teal-50 border border-teal-100 px-1 rounded">SKU CODE: {cat.skuCode || cat.name?.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 align-middle text-slate-500">
                      {isEditing ? (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border max-w-md text-xs text-slate-700">
                          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={editHasSchool} onChange={(e) => setEditHasSchool(e.target.checked)} /> Links to Specific Schools</label>
                          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={editHasSingles} onChange={(e) => setEditHasSingles(e.target.checked)} /> Loose Picker Shelf Counts</label>
                          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={editHasBulk} onChange={(e) => setEditHasBulk(e.target.checked)} /> Back Room Bulk VacPac Bags</label>
                          {editHasBulk && (
                            <select value={editBulkType} onChange={(e) => setEditBulkType(e.target.value as any)} className="p-2 border rounded-xl bg-white text-xs mt-1 block w-full focus:outline-none">
                              <option value="mixed">Mixed Bags (Whole school garments packed together)</option>
                              <option value="single-garment">Single Item Capacity Bags (Tracks 25% to 100% full)</option>
                            </select>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${cat.hasSchool !== false ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-400 border border-transparent'}`}>{cat.hasSchool !== false ? '🏫 School Linked' : '🚫 No Schools'}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${cat.hasSingles !== false ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-slate-100 text-slate-400 border border-transparent'}`}>{cat.hasSingles !== false ? '🧺 Picker Shelf Active' : '🚫 No Loose Counts'}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${cat.hasBulk !== false ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-slate-100 text-slate-400 border border-transparent'}`}>{cat.hasBulk !== false ? `📦 VacPacs (${cat.bulkType === 'mixed' ? 'Mixed' : 'Capacity'})` : '🚫 No Bulk bags'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right align-middle">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => handleSaveEdit(cat.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition"><Check className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl transition"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => {
                            setEditingId(cat.id);
                            setEditNameValue(cat.name || '');
                            setEditHasSchool(cat.hasSchool !== false);
                            setEditHasSingles(cat.hasSingles !== false);
                            setEditHasBulk(cat.hasBulk !== false);
                            setEditBulkType(cat.bulkType || 'mixed');
                          }} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={async () => {
                            const isSafe = await verifyAttributeIsSafeToDelete('categories', cat.id, cat.name);
                            if (isSafe) setMetadataToDelete({ id: cat.id, label: cat.name });
                          }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETACHED SAFETY CONFIRMATION OVERLAY MODAL */}
      {metadataToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setMetadataToDelete(null)} />
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden relative z-10 text-left">
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Permanent Removal Safeguard</h3>
              <button type="button" onClick={() => setMetadataToDelete(null)} className="p-1 rounded-lg hover:bg-white/10 text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">Are you sure you want to completely delete this configuration profile? This will immediately strip these tracking settings from your active workspace layouts dashboard.</p>
              <div className="p-4 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-800 font-mono">{metadataToDelete.label}</div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setMetadataToDelete(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 transition">Cancel</button>
                <button type="button" onClick={async () => {
                  await deleteDoc(doc(db, 'categories', metadataToDelete.id));
                  showNotification('success', 'Category profile cleared from settings entries registries.');
                  setMetadataToDelete(null);
                }} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-red-700 transition">Delete Layout Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
