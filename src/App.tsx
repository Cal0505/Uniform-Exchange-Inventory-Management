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
import Training from './components/Training'; // <-- New Import!
import { useFirestoreData } from './useFirestoreData'; 

interface AdvancedSchool {
  id: string; name: string; schoolType: 'JIN' | 'IN' | 'M' | 'H'; schoolIdCode: string; skuCode: string;
}

interface AdvancedAttribute {
  id: string; name?: string; label?: string; skuCode: string; ruleProfile?: string;
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
    id: a.id, name: a.name, label: a.label, skuCode: a.skuCode || '', ruleProfile: a.ruleProfile
  }));

  const currentUserRoleObj = (dataPool.roles || []).find((r: any) => (r.name || '').toLowerCase() === userRole?.toLowerCase());
  const currentUserWeight = currentUserRoleObj ? Number(currentUserRoleObj.weight || 0) : 0;
  const isHeadDev = userRole === 'Head_Dev';
  const canSeeManagement = isHeadDev || currentUserWeight >= 5;
  const canSeeAdmin = isHeadDev || currentUserWeight >= 5;
  const canSeeFullAccess = isHeadDev || currentUserWeight >= 10;

  const effectiveMainTab = activeMainTab === 'management_view' && !canSeeManagement ? null
    : activeMainTab === 'staff' && !canSeeAdmin ? null
    : activeMainTab === 'statistics' && !canSeeAdmin ? null
    : activeMainTab === 'dev' && !canSeeFullAccess ? null
    : activeMainTab;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col xl:flex-row font-sans antialiased text-[#54595F] w-full">
      <NavBar 
        categories={dataPool.categories || []} activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab}
        activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} currentViewedCategory={currentViewedCategory}
        setCurrentViewedCategory={setCurrentViewedCategory} userRole={userRole} userName={userName} loggedInEmail={user.email || ''}
        currentUserWeight={currentUserWeight}
        handleSignOut={handleSignOut} isFirebaseConnected={isFirebaseConnected} loading={!!dataPool.loading}
      />
      <main className="flex-1 p-4 md:p-8 xl:pl-72 overflow-x-hidden w-full">
        {effectiveMainTab === null && <HomeLanding categories={dataPool.categories || []} schools={mappedSchools} inventory={dataPool.inventory || []} userRole={userRole} loggedInEmail={user.email || ''} newsFeed={newsFeed} tasksList={tasksList} users={dataPool.users || []} />}
        {/* Render the new Training component here! */}
        {effectiveMainTab === 'training' && <Training userRole={userRole} loggedInEmail={user.email || ''} users={dataPool.users || []} />}
        {effectiveMainTab === 'inventory_view' && <Inventory currentViewedCategory={currentViewedCategory} categories={dataPool.categories || []} schools={mappedSchools} clothingTypes={mapAttribute(dataPool.clothingTypes)} sizes={mapAttribute(dataPool.sizes)} colours={mapAttribute(dataPool.colours)} locations={mapAttribute(dataPool.locations)} inventory={dataPool.inventory || []} />}
        {effectiveMainTab === 'management_view' && <Management schools={mappedSchools} clothingTypes={mapAttribute(dataPool.clothingTypes)} sizes={mapAttribute(dataPool.sizes)} colours={mapAttribute(dataPool.colours)} locations={mapAttribute(dataPool.locations)} categories={dataPool.categories || []} schoolTypes={dataPool.schoolTypes || []} userRole={userRole} activeTab={activeSubTab} setActiveTab={setActiveSubTab} />}
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