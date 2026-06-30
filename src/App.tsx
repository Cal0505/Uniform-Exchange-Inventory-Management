import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from './firebase';
import Inventory from './components/Inventory';
import LoginScreen from './LoginScreen'; 
import AdminDashboard from './AdminDashboard';
import Management from './components/ManagementDashboard';
import AccountPage from './components/AccountPage'; 
import NavBar from './components/NavBar';
import HomeLanding from './components/HomeLanding';
import StatsDashboard from './components/StatsDashboard';
import { useFirestoreData } from './useFirestoreData'; 

interface AdvancedSchool {
  id: string; name: string; schoolType: 'JIN' | 'IN' | 'M' | 'H'; schoolIdCode: string; skuCode: string;
}

interface AdvancedAttribute {
  id: string; name?: string; label?: string; skuCode: string; ruleProfile?: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'inventory_view' | 'management_view' | 'staff' | 'dev' | 'statistics' | 'account' | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('Category');
  const [currentViewedCategory, setCurrentViewedCategory] = useState<string | null>(null);
  
  const dataPool = useFirestoreData();

  // Mapping logic for Schools
  const mappedSchools: AdvancedSchool[] = (dataPool.School || []).map((s: any) => {
    const rawSku = s.skuCode || 'META';
    return {
      id: s.id, 
      name: s.name || 'Unnamed School Record',
      // FIX: Mapping the database 'School_Type' to the interface 'schoolType'
      schoolType: ['JIN', 'IN', 'M', 'H'].includes(s.School_Type) ? s.School_Type : 'JIN',
      schoolIdCode: (s.schoolIdCode || rawSku).toUpperCase(),
      skuCode: rawSku.toUpperCase()
    };
  });

  const mapAttribute = (arr: any[]): AdvancedAttribute[] => (arr || []).map((a: any) => ({
    id: a.id, name: a.name, label: a.label, skuCode: a.skuCode || '', ruleProfile: a.ruleProfile
  }));

  // ... (Keep existing useEffect hooks for login/Firebase)

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col xl:flex-row font-sans antialiased text-[#54595F] w-full">
      <NavBar 
        Category={dataPool.Category || []}
        activeMainTab={activeMainTab}
        setActiveMainTab={setActiveMainTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        currentViewedCategory={currentViewedCategory}
        setCurrentViewedCategory={setCurrentViewedCategory}
        userRole={'User'} // Replace with actual state
        loggedInEmail={'user@example.com'} // Replace with actual state
        handleSignOut={() => setIsLoggedIn(false)}
        isFirebaseConnected={isFirebaseConnected}
        loading={!!dataPool.loading}
      />

      <main className="flex-1 w-full min-h-screen pt-4 pb-8 md:p-8 xl:pl-80 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
          {/* Main Routing logic using the standardized prop names */}
          {activeMainTab === 'management_view' && (
            <Management 
              Category={dataPool.Category || []}
              School_Type={dataPool.School_Type || []}
              School={mappedSchools}
              Clothing_Type={mapAttribute(dataPool.Clothing_Type)}
              Size={mapAttribute(dataPool.Size)}
              Colour={mapAttribute(dataPool.Colour)}
              Location={mapAttribute(dataPool.Location)}
              userRole={'User'}
              forcedSubTabOverride={activeSubTab}
              setActiveSubTab={setActiveSubTab}
            />
          )}

          {activeMainTab === 'staff' && (
            <AdminDashboard
              School={mappedSchools}
              Clothing_Type={mapAttribute(dataPool.Clothing_Type)}
              Size={mapAttribute(dataPool.Size)}
              Colour={mapAttribute(dataPool.Colour)}
              Location={mapAttribute(dataPool.Location)}
              Category={dataPool.Category}
              School_Type={dataPool.School_Type}
              userRole={'User'}
              forcedSubTabOverride="staff"
            />
          )}
          {/* ... Add other tabs similarly */}
        </div>
      </main>
    </div>
  );
}