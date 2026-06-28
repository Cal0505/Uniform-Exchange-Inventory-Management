import React from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface SchoolTypesTabProps {
  schoolTypes: any[];
  schoolTypeNameInput: string;
  setSchoolTypeNameInput: (val: string) => void;
  schoolTypeSkuInput: string;
  setSchoolTypeSkuInput: (val: string) => void;
  schoolTypeSortWeight: number;
  setSchoolTypeSortWeight: (val: number) => void;
  executeAddMetadata: (e: React.FormEvent) => void;
  handleShiftClassificationOrder: (index: number, direction: 'up' | 'down', currentList: any[]) => void;
  handleDeleteMetadata: (collectionName: string, id: string, label: string) => void;
}

export default function SchoolTypesTab({
  schoolTypes,
  schoolTypeNameInput,
  setSchoolTypeNameInput,
  schoolTypeSkuInput,
  setSchoolTypeSkuInput,
  schoolTypeSortWeight,
  setSchoolTypeSortWeight,
  executeAddMetadata,
  handleShiftClassificationOrder,
  handleDeleteMetadata
}: SchoolTypesTabProps) {
  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full font-sans text-left">
      {/* LEFT COLUMN: SETUP FORM */}
      <div className="bg-slate-50/60 border border-slate-200/60 p-5 rounded-2xl h-fit space-y-4">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Configure Parameters</h4>
        <form onSubmit={executeAddMetadata} className="space-y-3">
          <div>
            <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">School Type Title</label>
            <input type="text" value={schoolTypeNameInput} onChange={(e) => setSchoolTypeNameInput(e.target.value)} placeholder="e.g. Junior, Senior, Primary" className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-brand-primary" />
          </div>
          <div>
            <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">1-Letter SKU Code</label>
            <input type="text" maxLength={1} value={schoolTypeSkuInput} onChange={(e) => setSchoolTypeSkuInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="e.g. J" className="w-full p-2.5 border rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-brand-primary" />
          </div>
          <div>
            <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Display Sort Weight</label>
            <input type="number" value={schoolTypeSortWeight} onChange={(e) => setSchoolTypeSortWeight(Number(e.target.value))} className="w-full p-2.5 border rounded-xl text-xs focus:outline-none focus:border-brand-primary" />
          </div>
          <button type="submit" className="w-full py-2.5 px-4 bg-brand-primary text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer">Register Component Code</button>
        </form>
      </div>

      {/* RIGHT COLUMN: ACTIVE REGISTRY LIST */}
      <div className="lg:col-span-2 space-y-4">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Active Configuration Parameters</h4>
        <div className="overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b">
              <tr>
                <th className="px-4 py-3">Order Shift</th>
                <th className="px-4 py-3">School Type Profile</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...schoolTypes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/40 transition">
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleShiftClassificationOrder(idx, 'up', schoolTypes)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleShiftClassificationOrder(idx, 'down', schoolTypes)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 align-middle">
                    <div className="space-y-0.5">
                      <span className="block font-semibold text-slate-900">{item.name}</span>
                      <span className="inline-block text-[9px] font-mono tracking-wider text-slate-400 bg-slate-50 border px-1 rounded">SKU CODE: {item.skuCode}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <button type="button" onClick={() => handleDeleteMetadata('schoolTypes', item.id, item.name)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {schoolTypes.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">No school types configured yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
