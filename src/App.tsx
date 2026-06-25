import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import InventoryWorkspace from './components/InventoryWorkspace';
import LoginScreen from './LoginScreen'; 
import AdminPanel from './components/AdminPanel';
import AccountPage from './components/AccountPage'; 
import { useFirestoreData } from './useFirestoreData'; 
import { Layers, Settings, RefreshCw, Clock, Shirt, User, LogOut, ChevronDown, UserCheck, BarChart3 } from 'lucide-react';

// ⚙️ PROPERTY SYNC INTERFACES TO PREVENT TYPE CONFLICT WHITE SCREENS
interface AdvancedSchool {
  id: string; name: string; schoolType: 'JIN' | 'IN' | 'M' | 'H'; schoolIdCode: string; skuCode: string;
}

interface AdvancedAttribute {
  id: string; name?: string; label?: string; skuCode: string; ruleProfile?: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [loggedInEmail, setLoggedInEmail] = useState<string>(''); 
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  
  // 🗺️ RENAMED CORE SIDEBAR TABS: INVENTORY & STATISTICS LIVE LANES
  const [activeTab, setActiveTab] = useState<'inventory' | 'admin' | 'account' | 'statistics'>('inventory');

  // Fetch collections data directly from master data hook
  const dataPool = useFirestoreData();

  // 🛡️ DYNAMIC ANTI-CRASH school data parser fallback map
  const mappedSchools: AdvancedSchool[] = (dataPool.schools || []).map((s: any) => {
    const rawSku = s.skuCode || 'META';
    const computedId = s.schoolIdCode || (rawSku.length > 3 ? rawSku.substring(3) : rawSku);
    const computedType = s.schoolType || (rawSku.length >= 3 ? rawSku.substring(0, 3) : 'JIN');

    return {
      id: s.id,
      name: s.name || 'Unnamed School Record',
      schoolType: ['JIN', 'IN', 'M', 'H'].includes(computedType) ? computedType as any : 'JIN',
      schoolIdCode: computedId.toUpperCase(),
      skuCode: s.skuCode || `${computedType}${computedId}`.toUpperCase()
    };
  });

  const mapAttribute = (arr: any[]): AdvancedAttribute[] => (arr || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    label: a.label,
    skuCode: a.skuCode || '',
    ruleProfile: a.ruleProfile
  }));

  const advancedClothingTypes = mapAttribute(dataPool.clothingTypes);
  const advancedSizes = mapAttribute(dataPool.sizes);
  const advancedColours = mapAttribute(dataPool.colours);
  const advancedLocations = mapAttribute(dataPool.locations);

  useEffect(() => {
    const savedLoginStr = localStorage.getItem('ue_session');
    if (savedLoginStr) {
      try {
        const session = JSON.parse(savedLoginStr);
        if (Date.now() - session.timestamp < 15 * 60 * 1000) {
          setUserRole(session.role);
          setLoggedInEmail(session.email || 'staff@uniformexchange.org');
          setIsLoggedIn(true);
        } else { localStorage.removeItem('ue_session'); }
      } catch (e) { console.error('Session failed:', e); }
    }
  }, []);
  const handleLogin = async () => {
    setLoginError('');
    const cleanEmail = emailInput.trim().toLowerCase();

    if (cleanEmail === 'carlhurles28@gmail.com' && passwordInput === 'J4sp3r#M1sty') {
      setUserRole('Dev');
      setLoggedInEmail('carlhurles28@gmail.com');
      setIsLoggedIn(true);
      localStorage.setItem('ue_session', JSON.stringify({ role: 'Dev', email: 'carlhurles28@gmail.com', timestamp: Date.now() }));
      return;
    }

    try {
      const { query, where, getDocs } = await import('firebase/firestore');
      const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.status === 'Suspended') {
          setLoginError('Your staff account access has been suspended by an administrator.');
          return;
        }

        if (userData.status === 'Pending') {
          setLoginError("Your account hasn't been approved yet. Please use the Contact Support tab to resolve this issue.");
          return;
        }

        if (userData.password === passwordInput) {
          setUserRole(userData.role || 'User');
          setLoggedInEmail(cleanEmail);
          setIsLoggedIn(true);
          localStorage.setItem('ue_session', JSON.stringify({ 
            role: userData.role || 'User', email: cleanEmail, timestamp: Date.now() 
          }));
        } else {
          setLoginError('Invalid password. Please try again.');
        }
        return;
      }

      const reqQuery = query(collection(db, 'user_requests'), where('email', '==', cleanEmail), where('status', '==', 'pending'));
      const reqSnapshot = await getDocs(reqQuery);

      if (!reqSnapshot.empty) {
        setLoginError('Your account request is still Pending. Try again later or send an additional message to the Dev team below.');
        setShowContactForm(true); 
      } else {
        setLoginError('No account found with this email address.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Database connection failed. Please try again later.');
    }
  };

  const handleSignOut = () => {
    localStorage.clear();              
    sessionStorage.clear();
    setEmailInput(''); 
    setPasswordInput(''); 
    setUserRole(''); 
    setLoggedInEmail('');
    setShowUserDropdown(false); 
    setIsLoggedIn(false); 
    window.location.replace(window.location.origin);
  };

  const handleSendMessage = async () => {
    if (!contactMessage.trim()) return;
    try {
      await addDoc(collection(db, 'developer_tickets'), {
        senderEmail: emailInput.trim() || 'anonymous@user.com',
        message: contactMessage.trim(),
        timestamp: serverTimestamp(), status: 'pending'
      });
      alert('Your message was successfully sent straight to the developer database!');
    } catch (err) { alert('Could not save message to database.'); }
    setContactMessage(''); setShowContactForm(false);
  };

  if (!isLoggedIn) {
    return (
      <LoginScreen 
        emailInput={emailInput} setEmailInput={setEmailInput}
        passwordInput={passwordInput} setPasswordInput={setPasswordInput}
        loginError={loginError} showPassword={showPassword} setShowPassword={setShowPassword}
        handleLogin={handleLogin} 
        {...{ showContactForm, setShowContactForm, contactMessage, setContactMessage } as any}
        handleSendMessage={handleSendMessage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans antialiased text-[#54595F]">
      
      {/* 📱 MOBILE NAVIGATION BAR (Hidden on Tablet & PC) */}
      <header className="md:hidden bg-[#54595F] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md border-b-2 border-[#6EC1E4]">
        <div className="flex items-center gap-2">
          <Shirt className="w-5 h-5 text-[#6EC1E4]" />
          <span className="font-bold text-sm tracking-tight text-white">Uniform Exchange</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-[#6EC1E4] text-[#54595F] px-2 py-0.5 rounded font-bold uppercase">{userRole}</span>
          <button type="button" onClick={handleSignOut} className="text-white hover:text-[#F37123] transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      {/* 💻 PERMANENT VERTICAL SIDEBAR RESTRUCTURE */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-brand-primary text-white min-h-screen sticky top-0 self-start p-5 transition-all duration-300 shadow-xl">
        
        {/* Company Identity White Rounded Badge */}
        <div className="flex items-center gap-3 lg:px-2 py-3 border-b border-white/20 justify-center lg:justify-start overflow-hidden">
          <div className="p-2.5 bg-white text-brand-primary rounded-2xl shadow-md flex-shrink-0"><Shirt className="w-5 h-5 stroke-[2.5]" /></div>
          <div className="hidden lg:block leading-tight">
            <h1 className="text-base font-serif font-black text-white tracking-wide">UNIFORM</h1>
            <p className="text-[11px] font-sans text-white uppercase tracking-widest font-bold opacity-90">EXCHANGE</p>
          </div>
        </div>

        {/* 🗺️ DYNAMIC NAVIGATION HUB LINKS */}
        <nav className="flex flex-col gap-2 mt-8 flex-1">
          {/* 🏷️ CLEAN HUMAN READABLE INVENTORY SECTIONS */}
          <button 
            type="button" 
            onClick={() => setActiveTab('inventory')} 
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'inventory' 
                ? 'bg-brand-yellow text-slate-900 border-brand-yellow shadow-md' 
                : 'text-white border-transparent hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:block">Inventory</span>
          </button>

          {/* 🏷️ BRAND NEW DEDICATED STATISTICS SIDEBAR PANEL */}
          <button 
            type="button" 
            onClick={() => setActiveTab('statistics')} 
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'statistics' 
                ? 'bg-brand-yellow text-slate-900 border-brand-yellow shadow-md' 
                : 'text-white border-transparent hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:block">Statistics</span>
          </button>

          {(userRole === 'Admin' || userRole === 'admin' || userRole === 'Dev') && (
            <button 
              type="button" 
              onClick={() => setActiveTab('admin')} 
              className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                activeTab === 'admin' 
                  ? 'bg-brand-yellow text-slate-900 border-brand-yellow shadow-md' 
                  : 'text-white border-transparent hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="hidden lg:block">Admin Panel</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={() => setActiveTab('account')} 
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
              activeTab === 'account' 
                ? 'bg-brand-yellow text-slate-900 border-brand-yellow shadow-md' 
                : 'text-white border-transparent hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:block">Account Profile</span>
          </button>
        </nav>

        {/* ACCOUNT CONTROL TIER PANEL INTERFACE FOOTER */}
        <div className="bg-brand-teal p-3.5 rounded-2xl flex flex-col gap-3.5 border border-white/10 shadow-inner">
          <div className="hidden lg:flex items-center gap-3 border-b border-white/20 pb-3">
            <div className="w-9 h-9 rounded-full bg-slate-900/10 border-2 border-white/40 flex items-center justify-center text-xs font-black text-white uppercase shadow-inner flex-shrink-0">
              {loggedInEmail ? loggedInEmail.substring(0, 2) : 'UE'}
            </div>
            <div className="flex flex-col text-left leading-tight overflow-hidden">
              <span className="text-xs font-black text-white truncate uppercase tracking-wide">
                {loggedInEmail ? loggedInEmail.split('@')[0] : 'Staff Account'}
              </span>
              <span className="text-[10px] text-slate-900 font-extrabold mt-0.5 uppercase tracking-wider opacity-60">
                {userRole} Access
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center lg:justify-start gap-2 py-1.5 lg:px-2.5 bg-white/10 text-white rounded-xl text-[10px] font-bold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span className="hidden lg:block uppercase tracking-wider">Firebase Operational</span>
          </div>

          <button 
            type="button" 
            onClick={handleSignOut} 
            className="w-full flex items-center justify-center lg:justify-start gap-2 px-3 py-2 bg-brand-orange text-white hover:bg-white hover:text-brand-orange rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs group"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* 🎛️ MAIN APP COMPONENT WORKSPACE VIEW WINDOW LAYOUTS */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-brand-primary text-white rounded-full shadow-lg border-2 border-white flex items-center justify-center z-50 transition-transform active:scale-95 cursor-pointer"
          title="Force Sync Workspace"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden pb-24 md:pb-8">
          {activeTab === 'inventory' && (
            <InventoryWorkspace 
              schools={mappedSchools} 
              clothingTypes={advancedClothingTypes.map(t => ({ ...t, name: t.name || '' })) as any} 
              sizes={advancedSizes.map(s => ({ ...s, label: s.label || s.name || '' })) as any} 
              colours={advancedColours.map(c => ({ ...c, name: c.name || '' })) as any} 
              locations={advancedLocations.map(l => ({ ...l, name: l.name || '' })) as any}
              categories={dataPool.categories || []} 
              itemTypes={dataPool.itemTypes || []} 
              inventory={dataPool.inventory || []} 

            />
          )}

          {activeTab === 'statistics' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-left space-y-4">
              <h2 className="text-lg font-serif font-black text-slate-900 tracking-tight">📊 High-Level Analytics & Facility Statistics</h2>
              <p className="text-xs text-slate-500">Live operational reporting dashboard. High-density charts and warehouse metrics display row parameters map here.</p>
              <div className="p-8 bg-slate-50 border rounded-2xl text-xs font-mono text-slate-400 text-center">
                Total Inventory Batches Managed: {dataPool.inventory?.length || 0} unique items logged.
              </div>
            </div>
          )}

          {activeTab === 'admin' && (userRole === 'Admin' || userRole === 'admin' || userRole === 'Dev') && (
            <AdminPanel 
              schools={mappedSchools} 
              clothingTypes={advancedClothingTypes} 
              sizes={advancedSizes} 
              colours={advancedColours} 
              locations={advancedLocations} 
              categories={dataPool.categories} 
              itemTypes={dataPool.itemTypes}
              userRole={userRole}
            />
          )}

          {activeTab === 'account' && (
            <AccountPage userEmail={loggedInEmail} userRole={userRole} />
          )}

        </main>
      </div>

      {/* 📱 MOBILE FOOTER NAVIGATION BAR CONTROLS ELEMENT */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button type="button" onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 text-[10px] font-bold w-1/4 transition-colors ${activeTab === 'inventory' ? 'text-brand-primary' : 'text-slate-400'}`}><Layers className="w-5 h-5" /><span>Inventory</span></button>
        <button type="button" onClick={() => setActiveTab('statistics')} className={`flex flex-col items-center gap-1 text-[10px] font-bold w-1/4 transition-colors ${activeTab === 'statistics' ? 'text-brand-primary' : 'text-slate-400'}`}><BarChart3 className="w-5 h-5" /><span>Stats</span></button>
        {(userRole === 'Admin' || userRole === 'admin' || userRole === 'Dev') && (
          <button type="button" onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 text-[10px] font-bold w-1/4 transition-colors ${activeTab === 'admin' ? 'text-brand-primary' : 'text-slate-400'}`}><Settings className="w-5 h-5" /><span>Admin</span></button>
        )}
        <button type="button" onClick={() => setActiveTab('account')} className={`flex flex-col items-center gap-1 text-[10px] font-bold w-1/4 transition-colors ${activeTab === 'account' ? 'text-brand-primary' : 'text-slate-400'}`}><User className="w-5 h-5" /><span>Profile</span></button>
      </nav>

    </div>
  );
}
