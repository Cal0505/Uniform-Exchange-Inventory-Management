import React, { useState } from 'react';
import AdminPanel from './components/AdminPanel';
import UserManagement from './UserManagement'; // Import our new user directory table
import { School, ClothingType, Size, Colour, Location, Category, ItemType } from './types';
import { Users, Sliders } from 'lucide-react';

interface AdminTabContainerProps {
  schools: School[];
  clothingTypes: ClothingType[];
  sizes: Size[];
  colours: Colour[];
  locations: Location[];
  categories: Category[];
  itemTypes: ItemType[];
  schoolClassifications: any[]; // 🧬 ADDED PROP SCHEMAS TRACKING PARAMETER
}

export default function AdminTabContainer({
  schools,
  clothingTypes,
  sizes,
  colours,
  locations,
  categories,
  itemTypes,
  schoolClassifications // 🧬 UNLOCKED DESTRUCTURING ARGUMENT VARIABLE LINK
}: AdminTabContainerProps) {
  // Toggle sub-tabs inside the Admin Panel workspace area
  const [subTab, setSubTab] = useState<'users' | 'metadata'>('users');

  return (
    <div className="space-y-6">
      {/* INTERNAL SUB-NAVIGATION BUTTONS */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setSubTab('users')}
          className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            subTab === 'users'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 font-semibold'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manage Staff Access</span>
        </button>

        <button
          onClick={() => setSubTab('metadata')}
          className={`pb-2 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            subTab === 'metadata'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 font-semibold'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Stock Configuration Attributes</span>
        </button>
      </div>

      {/* CONDITIONAL RENDER PANELS */}
      <div className="pt-2">
        {subTab === 'users' ? (
          <UserManagement />
        ) : (
          <AdminPanel 
            schools={(schools || []).map((s: any) => ({
              id: s.id,
              name: s.name || 'Unnamed School Record',
              schoolType: s.schoolType || 'JIN',
              schoolIdCode: s.schoolIdCode || (s.skuCode ? s.skuCode.substring(3) : 'META'),
              skuCode: s.skuCode || 'JINMETA',
              logoUrl: s.logoUrl || ''
            }))}
            clothingTypes={clothingTypes}
            sizes={sizes}
            colours={colours}
            locations={locations}
            categories={categories || []}
            schoolClassifications={schoolClassifications || []} // 🔒 PIPED DIRECTLY TO YOUR METADATA GRID MARGIN HOOKS
          />
        )}
      </div>
    </div>
  );
}
