import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import Inventory from './components/Inventory';
import LoginScreen from './LoginScreen'; 
import AdminPanel from './components/AdminPanel';
import Management from './components/Management';
import AccountPage from './components/AccountPage'; 
import NavBar from './components/NavBar';
import HomeLanding from './components/HomeLanding';
import AdminTabContainer from './AdminTabContainer'; 
import StatsDashboard from './components/StatsDashboard';
import { useFirestoreData } from './useFirestoreData'; 
import { Layers, Settings, RefreshCw, Clock, Shirt, User, LogOut, ChevronDown, UserCheck, BarChart3, UserCircle } from 'lucide-react';

interface AdvancedSchool {
  id: string; name: string; schoolType: 'JIN' | 'IN' | 'M' | 'H'; schoolIdCode: string; skuCode: string;
}

interface AdvancedAttribute {
  id: string; name?: string; label?: string; skuCode: string; ruleProfile?: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  useEffect(() => {
    const handleFirebaseConnectionStatus = async () => {
      try {
        const { onSnapshot, doc } = await import('firebase/firestore');
        const syncRef = doc(db, '.info', 'connected');
        return onSnapshot(syncRef, (snapshot) => {
          const isServerAlive = snapshot.exists() ? !!snapshot.data() : true;
          setIsFirebaseConnected(navigator.onLine && isServerAlive);
        });
      } catch (err) { setIsFirebaseConnected(navigator.onLine); }
    };
    let unsubFn: any;
    handleFirebaseConnectionStatus().then(unsub => { unsubFn = unsub; });
    return () => { if (unsubFn) unsubFn(); };
  }, []);

  const [userRole, setUserRole] = useState<string>('');
  const [loggedInEmail, setLoggedInEmail] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bypassEnabled, setBypassEnabled] = useState(false);
  // 🧭 THE NESTED CENTRAL NAVBAR ROUTER HOOKS
  const [activeMainTab, setActiveMainTab] = useState<'inventory_view' | 'management_view' | 'staff' | 'dev' | 'statistics' | 'account' | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('categories');
  const [currentViewedCategory, setCurrentViewedCategory] = useState<string | null>(null);

  // 📡 HOOK STREAMS: Real-time collections data arrays for your new command center
  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);

  const dataPool = useFirestoreData();

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubNews = onSnapshot(collection(db, 'news_feed'), (snapshot) => {
      setNewsFeed(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasksList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubNews(); unsubTasks(); };
  }, [isLoggedIn]);

  useEffect(() => {
    const savedLoginStr = localStorage.getItem('ue_session');
    if (savedLoginStr) {
      try {
        const session = JSON.parse(savedLoginStr);
        if (Date.now() - session.timestamp < 15 * 60 * 1000) {
          setUserRole(session.role); setLoggedInEmail(session.email || 'staff@uniformexchange.org'); setIsLoggedIn(true);
        }
      } catch (e) {}
    }
    const configRef = doc(db, 'system_config', 'settings');
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      setBypassEnabled(snapshot.exists() ? snapshot.data().dev_bypass_active === true : false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    const cleanEmail = emailInput.trim().toLowerCase();
    if (cleanEmail === 'carlhurles28@gmail.com' && passwordInput === 'J4sp3r#M1sty') {
      setUserRole('Master_Dev'); setLoggedInEmail('carlhurles28@gmail.com'); setIsLoggedIn(true); return;
    }
    try {
      const { query, where, getDocs } = await import('firebase/firestore');
      const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        if (userData.password === passwordInput) {
          setUserRole(userData.role || 'User'); setLoggedInEmail(cleanEmail); setIsLoggedIn(true);
        } else { setLoginError('Invalid password.'); }
      }
    } catch (err) {}
  };
  const handleSignOut = () => { setIsLoggedIn(false); };
  if (!isLoggedIn) {
    return (
      <LoginScreen 
        emailInput={emailInput} 
        setEmailInput={setEmailInput} 
        passwordInput={passwordInput} 
        setPasswordInput={setPasswordInput} 
        loginError={loginError} 
        showPassword={showPassword} 
        setShowPassword={setShowPassword} 
        handleLogin={handleLogin} 
        bypassEnabled={bypassEnabled} 
        refreshBypassState={async () => true} 
      />
    );
  }

  const mappedSchools: AdvancedSchool[] = (dataPool.schools || []).map((s: any) => {
    const rawSku = s.skuCode || 'META';
    return {
      id: s.id, name: s.name || 'Unnamed School Record',
      schoolType: ['JIN', 'IN', 'M', 'H'].includes(s.schoolType) ? s.schoolType as any : 'JIN',
      schoolIdCode: (s.schoolIdCode || rawSku).toUpperCase(),
      skuCode: rawSku.toUpperCase()
    };
  });

  const mapAttribute = (arr: any[]): AdvancedAttribute[] => (arr || []).map((a: any) => ({
    id: a.id, name: a.name, label: a.label, skuCode: a.skuCode || '', ruleProfile: a.ruleProfile
  }));

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col xl:flex-row font-sans antialiased text-[#54595F] w-full">
      
      {/* 🧭 NAVIGATION SIDEBAR DRAWER CONTROLLER */}
      <NavBar 
        categories={dataPool.categories || []}
        activeMainTab={activeMainTab}
        setActiveMainTab={setActiveMainTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        currentViewedCategory={currentViewedCategory}
        setCurrentViewedCategory={setCurrentViewedCategory}
        userRole={userRole}
        loggedInEmail={loggedInEmail}
        handleSignOut={handleSignOut}
        isFirebaseConnected={isFirebaseConnected}
        loading={!!dataPool.loading}
      />

      {/* 💻 MAIN OPERATIONS CANVAS REGISTRY GRID */}
      <main className="flex-1 p-4 md:p-8 xl:pl-72 overflow-x-hidden w-full">
        
        {/* 👋 WELCOME DASHBOARD COMMAND CENTER LANDING VIEW */}
        {activeMainTab === null && (
          <HomeLanding 
            categories={dataPool.categories || []}
            schools={mappedSchools}
            inventory={dataPool.inventory || []}
            userRole={userRole}
            loggedInEmail={loggedInEmail}
            newsFeed={newsFeed}
            tasksList={tasksList}
          />
        )}
        {/* INVENTORY VIEWS ROUTER */}
        {activeMainTab === 'inventory_view' && (
          <Inventory 
            currentViewedCategory={currentViewedCategory}
            categories={dataPool.categories || []}
            schools={mappedSchools}
            clothingTypes={mapAttribute(dataPool.clothingTypes)}
            sizes={mapAttribute(dataPool.sizes)}
            colours={mapAttribute(dataPool.colours)}
            locations={mapAttribute(dataPool.locations)}
            inventory={dataPool.inventory || []}
          />
        )}

        {/* ⚙️ DYNAMIC DATA SHEETS ROUTER FOR THE MANAGEMENT DRILLDOWN */}
        {activeMainTab === 'management_view' && (
          <Management 
            schools={mappedSchools} 
            clothingTypes={mapAttribute(dataPool.clothingTypes)} 
            sizes={mapAttribute(dataPool.sizes)} 
            colours={mapAttribute(dataPool.colours)} 
            locations={mapAttribute(dataPool.locations)} 
            categories={dataPool.categories || []} 
            schoolTypes={dataPool.schoolTypes || []} 
            userRole={userRole}
            forcedSubTabOverride={activeSubTab as any}
          />
        )}

        {/* 👥 REAL-TIME CLOUD ACCESS CONTROL ROUTER HOOK */}
        {activeMainTab === 'staff' && (
          <AdminTabContainer 
            schools={mappedSchools as any} 
            clothingTypes={mapAttribute(dataPool.clothingTypes) as any} 
            sizes={mapAttribute(dataPool.sizes) as any} 
            colours={mapAttribute(dataPool.colours) as any} 
            locations={mapAttribute(dataPool.locations) as any} 
            categories={dataPool.categories || []} 
            itemTypes={[]} 
            schoolTypes={dataPool.schoolTypes || []} 
            userRole={userRole}
            forcedSubTabOverride="staff"
          />
        )}

        {/* ADMIN TASKS TELEMETRY RENDER CELLS */}
        {activeMainTab === 'dev' && (
          <AdminTabContainer 
            schools={[]} 
            clothingTypes={[]} 
            sizes={[]} 
            colours={[]} 
            locations={[]} 
            categories={[]} 
            itemTypes={[]} 
            schoolTypes={[]} 
            userRole={userRole}
            forcedSubTabOverride="dev"
          />
        )}

        
        {/* 📊 REAL-TIME LIVE INVENTORY ANALYTICS HUB LOG STATISTICS */}
        {activeMainTab === 'statistics' && (
          <StatsDashboard 
            inventory={dataPool.inventory || []} 
            schools={mappedSchools || []} 
            locations={dataPool.locations || []} 
          />
        )}

        {/* INDIVIDUAL ACCOUNT DASHBOARD VIEW */}
        {activeMainTab === 'account' && (<AccountPage userEmail={loggedInEmail} userRole={userRole} />)}

      </main>
    </div>
  );
}
