import React from 'react';
import UserManagement from './UserManagement'; 
import DevToolsDashboard from './components/DevToolsDashboard';
import Management from './components/ManagementDashboard';

// 📡 THE UPDATED MASTER PROTOCOL INTERFACE
export interface AdminTabContainerProps {
  Category: any[];
  School_Type: any[];
  School: any[];
  Clothing_Type: any[];
  Size: any[];
  Colour: any[];
  Location: any[];
  userRole: string;
  forcedSubTabOverride?: string;
}

export default function AdminDashboard({
  Category,
  School_Type,
  School,
  Clothing_Type,
  Size,
  Colour,
  Location,
  userRole,
  forcedSubTabOverride
}: AdminTabContainerProps) {

  const activeView = forcedSubTabOverride || 'staff';

  // Mapping logic
  const mappedSchools = (School || []).map((s: any) => ({
    id: s.id,
    name: s.name || 'Unnamed School Record',
    School_Type: s.School_Type || 'JIN',
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
        </div>
      ) : null}

      {/* Passing the standardized underscore props */}
      {['Category', 'School_Type', 'School', 'Clothing_Type', 'Size', 'Colour', 'Location'].includes(activeView) && (
        <Management 
          Category={Category}
          School_Type={School_Type}
          School={mappedSchools}
          Clothing_Type={Clothing_Type}
          Size={Size}
          Colour={Colour}
          Location={Location}
          userRole={userRole}
          forcedSubTabOverride={activeView}
        />
      )}
    </div>
  );
}