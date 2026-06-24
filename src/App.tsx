import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import InventoryWorkspace from './components/InventoryWorkspace';
import LoginScreen from './LoginScreen'; 
import AdminTabContainer from './AdminTabContainer'; 
import AccountPage from './components/AccountPage'; 
import { useFirestoreData } from './useFirestoreData'; 
import { Layers, Settings, RefreshCw, Clock, Shirt, User, LogOut, ChevronDown, UserCheck } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'workspace' | 'admin' | 'account'>('workspace');

  const { schools, clothingTypes, sizes, colours, locations, categories, itemTypes, inventory, loading, seeding } = useFirestoreData();

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

  // UPDATED LOGIN FLOW: CRITICAL STALE CODE REMOVED
  const handleLogin = async () => {
    setLoginError('');
    const cleanEmail = emailInput.trim().toLowerCase();

    // 1. Backdoor Master Dev check
    if (cleanEmail === 'carlhurles28@gmail.com' && passwordInput === 'J4sp3r#M1sty') {
      setUserRole('Dev');
      setLoggedInEmail('carlhurles28@gmail.com');
      setIsLoggedIn(true);
      localStorage.setItem('ue_session', JSON.stringify({ role: 'Dev', email: 'carlhurles28@gmail.com', timestamp: Date.now() }));
      return;
    }

    // 2. Main Live Registry verification check
    try {
      const { query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const querySnapshot = await getDocs(q);

      // If their record isn't in the active users table yet, show your custom message
      if (querySnapshot.empty) {
        setLoginError('Your account request has not been processed yet.');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (!userData.active) {
        setLoginError('Your staff account access has been suspended by an administrator.');
        return;
      }

      // FIXED: Old "Not Activated" text completely wiped out here.
      // Verify the password they selected when they originally filled out the request.
      if (userData.password === passwordInput) {
        setUserRole(userData.role || 'User');
        setLoggedInEmail(cleanEmail);
        setIsLoggedIn(true);
        localStorage.setItem('ue_session', JSON.stringify({ 
          role: userData.role || 'User', 
          email: cleanEmail,
          timestamp: Date.now() 
        }));
      } else {
        setLoginError('Invalid password. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Database connection failed. Please try again later.');
    }
  };

  const handleSignOut = () => {
    localStorage.clear();              
    setEmailInput(''); passwordInput(''); setUserRole(''); setLoggedInEmail('');
    setShowUserDropdown(false); setIsLoggedIn(false);              
    setTimeout(() => { window.location.reload(); }, 100);
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
        handleLogin={handleLogin} showContactForm={showContactForm} setShowContactForm={setShowContactForm}
        contactMessage={contactMessage} setContactMessage={setContactMessage}
        handleSendMessage={handleSendMessage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md"><Shirt className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                School Uniform Exchange
                <span className="text-[10px] uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-extrabold animate-pulse">
                  Live {userRole === 'Dev' ? 'Master Access' : 'Firestore'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Kirklees & Beyond Warehouse Stock Manager</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" /><span>UTC Workspace</span>
            </div>
            
            <div className="relative">
              <button onClick={() => setShowUserDropdown(!showUserDropdown)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all group">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <div className="flex flex-col items-start text-left leading-tight">
                  <span className="font-semibold text-slate-800">{loggedInEmail}</span>
                  <span className="text-[10px] text-blue-600 font-bold mt-0.5">Logged in as: {userRole}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden">
                  <button 
                    onClick={() => { setActiveTab('account'); setShowUserDropdown(false); }} 
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Account Settings</span>
                  </button>
                  <div className="border-t border-slate-100"></div>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-all">
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => window.location.reload()} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-100 px-6 py-2">
        <div className="max-w-7xl mx-auto flex gap-4">
          <button onClick={() => setActiveTab('workspace')} className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'workspace' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}><Layers className="w-4 h-4" /><span>Workspace Dashboard</span></button>
          
          {(userRole === 'Admin' || userRole === 'Dev') && (
            <button onClick={() => setActiveTab('admin')} className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
              <Settings className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'workspace' && (
          <InventoryWorkspace schools={schools} clothingTypes={clothingTypes} sizes={sizes} colours={colours} locations={locations} categories={categories} itemTypes={itemTypes} inventory={inventory} loading={loading} seeding={seeding} />
        )}
        {activeTab === 'admin' && (userRole === 'Admin' || userRole === 'Dev') && (
          <AdminTabContainer schools={schools} clothingTypes={clothingTypes} sizes={sizes} colours={colours} locations={locations} categories={categories} itemTypes={itemTypes} />
        )}
        {activeTab === 'account' && (
          <AccountPage currentRole={userRole} />
        )}
      </main>
    </div>
  );
}
