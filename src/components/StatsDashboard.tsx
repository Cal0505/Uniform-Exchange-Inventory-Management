import React from 'react';
import { Shirt, Layers, Warehouse, School, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

interface StatsDashboardProps {
  inventory: any[];
  schools: any[];
  locations: any[];
}

export default function StatsDashboard({ inventory, schools, locations }: StatsDashboardProps) {
  // 🧮 LIVE INVENTORY QUANTITY MATH CALCULATIONS
  const totalItemsCount = (inventory || []).reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const totalUniqueLines = (inventory || []).length;
  const totalSchoolsRegistered = (schools || []).length;
  const totalWarehouseLocations = (locations || []).length;

  // 👔 STATUS PROFILE COUNTS
  const standardGarmentsCount = (inventory || []).filter(item => !item.schoolId || item.schoolId === 'PLAIN').reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const schoolBrandedCount = totalItemsCount - standardGarmentsCount;

  return (
    <div className="space-y-6 text-left select-none animate-fadeIn w-full max-w-5xl">
      <div>
        <span className="text-[10px] font-mono font-black tracking-widest text-brand-primary uppercase">Warehouse Telemetry</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><BarChart3 className="w-5 h-5 text-brand-primary" /> Inventory Statistics</h2>
      </div>

      {/* 📊 TOP SHELF: STOCK METRIC TELEM CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center"><Shirt className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-mono font-black text-slate-400 uppercase">Total Stock Vol</p><p className="text-xl font-black text-slate-900">{totalItemsCount}</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center"><Layers className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-mono font-black text-slate-400 uppercase">Unique SKUs</p><p className="text-xl font-black text-slate-900">{totalUniqueLines}</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><School className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-mono font-black text-slate-400 uppercase">Active Schools</p><p className="text-xl font-black text-slate-900">{totalSchoolsRegistered}</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Warehouse className="w-5 h-5" /></div>
          <div><p className="text-[10px] font-mono font-black text-slate-400 uppercase">Storage Hubs</p><p className="text-xl font-black text-slate-900">{totalWarehouseLocations}</p></div>
        </div>
      </div>

      {/* 📋 BOTTOM SHELF: INVENTORY CHARACTER BREAKDOWN PANEL */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs max-w-xl">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-slate-700" /> Stock Profile Mix</h4>
        <div className="space-y-3 font-mono text-[11px] font-bold text-slate-500">
          <div className="flex items-center justify-between border-b pb-2"><span>School-Specific Branded Attire:</span><span className="text-slate-900 font-black">{schoolBrandedCount} Items</span></div>
          <div className="flex items-center justify-between border-b pb-2"><span>Plain / Non-Branded Stock Items:</span><span className="text-brand-primary font-black">{standardGarmentsCount} Items</span></div>
          <div className="flex items-center justify-between pt-1"><span>Database Entry Catalog Items:</span><span className="text-slate-900 font-black">{totalUniqueLines} Active Rows</span></div>
        </div>
      </div>
    </div>
  );
}
