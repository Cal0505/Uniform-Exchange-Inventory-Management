import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useAuth } from './context/AuthContext';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Pages and Components
import Register from './context/Register';
import Inventory from './components/Inventory';
import LoginScreen from './LoginScreen'; 
import AdminPanel from './components/AdminPanel';
import Management from './components/Management';
import AccountPage from './components/AccountPage'; 
import NavBar from './components/NavBar';
import HomeLanding from './components/HomeLanding';
import AdminTabContainer from './AdminTabContainer'; 
import StatsDashboard from './components/StatsDashboard';
import Training from './components/Training';
import Pickers from './components/Pickers';
import { useFirestoreData } from './useFirestoreData'; 
import { getEffectivePermissions } from './rbac';
import { canAccessNavigationTarget, filterNavTreeByPermissions, getNavigationTree } from './navigation';

interface AdvancedSchool {
  id: string; name: string; schoolType: 'JIN' | 'IN' | 'M' | 'H'; schoolIdCode: string; skuCode: string;
}

interface AdvancedAttribute {
  id: string;
  name?: string;
  label?: string;
  skuCode: string;
  ruleProfile?: string;
  logo?: boolean;
  plain?: boolean;
  new?: boolean;
}

function MainApp() {
  const { user, loading } = useAuth();
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>(''); 
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.email) {
        try {
          const userQuery = query(collection(db, 'users'), where('email', '==', user.email.toLowerCase()));
          const querySnapshot = await getDocs(userQuery);
          
          if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            
            if (data.status?.toLowerCase() === 'active') {
              setUserRole(data.role || 'User');
              setUserName(data.displayName || 'User');
            } else {
              console.warn("Account pending or inactive. Signing out.");
              handleSignOut();
            }
          }
        } catch (err) { console.error("Error fetching user data:", err); }
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const syncRef = doc(db, '.info', 'connected');
    return onSnapshot(syncRef, (snapshot) => {
      setIsFirebaseConnected(navigator.onLine && (snapshot.exists() ? !!snapshot.data() : true));
    });
  }, []);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('categories');
  const [currentViewedCategory, setCurrentViewedCategory] = useState<string | null>(null);

  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);

  const dataPool = useFirestoreData();

  useEffect(() => {
    if (!user) return;
    const unsubNews = onSnapshot(collection(db, 'news_feed'), (snapshot) => {
      setNewsFeed(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasksList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubNews(); unsubTasks(); };
  }, [user]);

  const handleLogin = async () => {
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
    } catch (err) { setLoginError('Invalid email or password.'); }
  };

  const handleSignOut = () => { signOut(auth); setUserRole(''); setUserName(''); };

  if (loading) return <div className="flex h-screen items-center justify-center">Authenticating...</div>;

  if (!user) {
    return (
      <LoginScreen 
        emailInput={emailInput} setEmailInput={setEmailInput} 
        passwordInput={passwordInput} setPasswordInput={setPasswordInput} 
        loginError={loginError} showPassword={showPassword} 
        setShowPassword={setShowPassword} handleLogin={handleLogin} 
        bypassEnabled={bypassEnabled} refreshBypassState={async () => true} 
      />
    );
  }

  const mappedSchools: AdvancedSchool[] = (dataPool.schools || []).map((s: any) => ({
    id: s.id, name: s.name || 'Unnamed',
    schoolType: ['JIN', 'IN', 'M', 'H'].includes(s.schoolType) ? s.schoolType : 'JIN',
    schoolIdCode: (s.schoolIdCode || s.skuCode || 'META').toUpperCase(),
    skuCode: (s.skuCode || 'META').toUpperCase()
  }));

  const mapAttribute = (arr: any[]): AdvancedAttribute[] => (arr || []).map((a: any) => ({
    ...a,
    id: a.id,
    name: a.name,
    label: a.label,
    skuCode: a.skuCode || '',
    ruleProfile: a.ruleProfile,
    logo: typeof a.logo === 'boolean' ? a.logo : undefined,
    plain: typeof a.plain === 'boolean' ? a.plain : undefined,
    new: typeof a.new === 'boolean' ? a.new : undefined,
  }));

  const navigationTree = getNavigationTree(dataPool.categories || []);
  const rolePermissions = getEffectivePermissions(dataPool.roles || [], userRole);
  const visibleNavigationTree = filterNavTreeByPermissions(navigationTree, rolePermissions);
  const visibleManagementItems = visibleNavigationTree.find((item) => item.id === 'management')?.children || [];
  const activeNavigationTarget = {
    mainTab: activeMainTab,
    ...(activeMainTab === 'pickers' || activeMainTab === 'management_view' ? { subTab: activeSubTab } : {}),
    ...(activeMainTab === 'inventory_view' && currentViewedCategory ? { categoryId: currentViewedCategory } : {}),
  };
  const canAccessActiveTarget = canAccessNavigationTarget(navigationTree, rolePermissions, activeNavigationTarget);
  const canAccessDashboard = canAccessNavigationTarget(navigationTree, rolePermissions, { mainTab: null });
  const effectiveMainTab = canAccessActiveTarget ? activeMainTab : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col xl:flex-row font-sans antialiased text-[#54595F] w-full">
      <NavBar 
        navigationTree={navigationTree} activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab}
        activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} currentViewedCategory={currentViewedCategory}
        setCurrentViewedCategory={setCurrentViewedCategory} userRole={userRole} userName={userName}
        rolePermissions={rolePermissions}
        handleSignOut={handleSignOut} isFirebaseConnected={isFirebaseConnected} loading={!!dataPool.loading}
      />
      <main className="flex-1 p-4 md:p-8 xl:pl-72 pt-16 md:pt-20 xl:pt-4 overflow-x-hidden w-full">
        {effectiveMainTab === null && canAccessDashboard && <HomeLanding categories={dataPool.categories || []} schools={mappedSchools} inventory={dataPool.inventory || []} userRole={userRole} loggedInEmail={user.email || ''} newsFeed={newsFeed} tasksList={tasksList} users={dataPool.users || []} />}
        {!canAccessActiveTarget && <div className="rounded-xl border border-rose-200 bg-white p-6 text-sm font-bold text-rose-700">You do not have permission to view this area.</div>}
        {/* Render the new Training component here! */}
        {effectiveMainTab === 'training' && <Training userRole={userRole} loggedInEmail={user.email || ''} users={dataPool.users || []} />}
        {effectiveMainTab === 'pickers' && <Pickers activePickerTab={activeSubTab === 'pickers_waiting' ? 'waiting' : activeSubTab === 'pickers_picked' ? 'picked' : 'ready'} currentUserName={userName || 'Current Picker'} />}
        {effectiveMainTab === 'inventory_view' && <Inventory currentViewedCategory={currentViewedCategory} categories={dataPool.categories || []} schools={mappedSchools} clothingTypes={mapAttribute(dataPool.clothingTypes)} sizes={mapAttribute(dataPool.sizes)} colours={mapAttribute(dataPool.colours)} locations={mapAttribute(dataPool.locations)} inventory={dataPool.inventory || []} />}
        {effectiveMainTab === 'management_view' && <Management schools={mappedSchools} clothingTypes={mapAttribute(dataPool.clothingTypes)} sizes={mapAttribute(dataPool.sizes)} colours={mapAttribute(dataPool.colours)} locations={mapAttribute(dataPool.locations)} categories={dataPool.categories || []} schoolTypes={dataPool.schoolTypes || []} userRole={userRole} activeTab={activeSubTab} setActiveTab={setActiveSubTab} navigationItems={visibleManagementItems} />}
        {effectiveMainTab === 'staff' && <AdminTabContainer schools={mappedSchools as any} clothingTypes={mapAttribute(dataPool.clothingTypes) as any} sizes={mapAttribute(dataPool.sizes) as any} colours={mapAttribute(dataPool.colours) as any} locations={mapAttribute(dataPool.locations) as any} categories={dataPool.categories || []} itemTypes={[]} schoolTypes={dataPool.schoolTypes || []} userRole={userRole} forcedSubTabOverride="staff" />}
        
        {effectiveMainTab === 'dev' && <AdminTabContainer schools={[]} clothingTypes={[]} sizes={[]} colours={[]} locations={[]} categories={[]} itemTypes={[]} schoolTypes={[]} userRole={userRole} forcedSubTabOverride="dev" />}
        {effectiveMainTab === 'statistics' && <StatsDashboard inventory={dataPool.inventory || []} schools={mappedSchools || []} locations={dataPool.locations || []} />}
        
        {effectiveMainTab === 'account' && <AccountPage userEmail={user.email || ''} userRole={userRole} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}