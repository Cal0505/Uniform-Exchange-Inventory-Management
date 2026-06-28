import React from 'react';
import AdminPanel from './components/AdminPanel';
import Management from './components/Management';
import UserManagement from './UserManagement'; 
import DevToolsDashboard from './components/DevToolsDashboard';
import { School, ClothingType, Size, Colour, Location as WarehouseLocation, Category, ItemType } from './types';

// 📡 THE ABSOLUTE TRUTH MASTER PROTOCOL INTERFACE DEFINITION
export interface AdminTabContainerProps {
  schools: School[];
  clothingTypes: ClothingType[];
  sizes: Size[];
  colours: Colour[];
  locations: WarehouseLocation[]; 
  categories: Category[];
  itemTypes: ItemType[];
  schoolTypes: any[]; 
  userRole: string;
  forcedSubTabOverride?: string;
}

export default function AdminTabContainer({
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  categories,
  schoolTypes,
  userRole,
  forcedSubTabOverride
}: AdminTabContainerProps) {

  const activeView = forcedSubTabOverride || 'staff';

  const mappedSchools = (schools || []).map((s: any) => ({
    id: s.id,
    name: s.name || 'Unnamed School Record',
    schoolType: s.schoolType || 'JIN',
    schoolIdCode: s.schoolIdCode || (s.skuCode ? s.skuCode.substring(3) : 'META'),
    skuCode: s.skuCode || 'JINMETA',
    logoUrl: s.logoUrl || ''
  }));
  return (
    <div className="w-full animate-fadeIn">
      {/* 🧭 ROUTER ENGINE BLOCK */}
      {activeView === 'staff' && (
        <div className="w-full">
          <UserManagement userRole={userRole} />
        </div>
      )}

      {activeView === 'dev' && (userRole === 'Dev' || userRole === 'Master_Dev') ? (
        <div className="w-full">
          <DevToolsDashboard userRole={userRole} />
        </div>
      ) : activeView === 'dev' ? (
        <div className="w-full bg-white border border-rose-100 p-8 rounded-3xl text-center text-slate-400 select-none max-w-xl animate-fadeIn">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3">⚠️</div>
          <span className="block text-xs font-mono font-black uppercase tracking-wider text-slate-800">Clearance Access Denied</span>
          <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed">This terminal is restricted. You do not possess structural credentials to view root developer assets.</p>
        </div>
      ) : null}


      {['categories', 'schoolTypes', 'schools', 'types', 'sizes', 'colours', 'locations'].includes(activeView) && (
        <Management 
          schools={mappedSchools}
          clothingTypes={clothingTypes as any}
          sizes={sizes as any}
          colours={colours as any}
          locations={locations as any}
          categories={categories || []}
          schoolTypes={schoolTypes || []}
          userRole={userRole}
          forcedSubTabOverride={activeView}
        />
      )}
    </div>
  );
}
