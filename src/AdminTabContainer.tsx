import React, { useState } from 'react';
import AdminPanel from './components/AdminPanel';
import Management from './components/Management';
import UserManagement from './context/UserManagement'; 
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
  
  // State for Management tabs
  const [activeTab, setActiveTab] = useState(forcedSubTabOverride || 'categories');

  const mappedSchools = (schools || []).map((s: any) => ({
    id: s.id,
    name: s.name || 'Unnamed School Record',
    schoolType: s.schoolType || 'JIN',
    schoolIdCode: s.schoolIdCode || (s.skuCode ? s.skuCode.substring(3) : 'META'),
    skuCode: s.skuCode || 'SKU-0000',
    logoUrl: s.logoUrl || ''
  }));

  return (
    <div className="w-full">
      {activeView === 'staff' && (
        <div className="w-full">
          <UserManagement userRole={userRole} categories={categories.map(({ id, name }) => ({ id, name }))} />
        </div>
      )}

      {activeView === 'dev' ? (
        <div className="w-full">
          <DevToolsDashboard userRole={userRole} />
        </div>
      ) : null}

      {['categories', 'schoolTypes', 'schools', 'clothingTypes', 'sizes', 'colours', 'locations'].includes(activeView) && (
        <Management 
          schools={mappedSchools}
          clothingTypes={clothingTypes as any}
          sizes={sizes as any}
          colours={colours as any}
          locations={locations as any}
          categories={categories || []}
          schoolTypes={schoolTypes || []}
          userRole={userRole}
          forcedSubTabOverride={activeView as any}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}
    </div>
  );
}