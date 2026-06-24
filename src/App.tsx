import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import InventoryWorkspace from './components/InventoryWorkspace';
import LoginScreen from './LoginScreen'; 
import AdminTabContainer from './AdminTabContainer'; 
import { useFirestoreData } from './useFirestoreData'; // Import our new background database hook
import { Layers, Settings, RefreshCw, Clock, Shirt, User, LogOut, ChevronDown } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'workspace' | 'admin'>('workspace');

  // Fetch all 8 database states instantly from our background file
  const { schools, clothingTypes, sizes, colours, locations, categories, itemTypes, inventory, loading, seeding } = useFirestoreData();

  useEffect(() => {
    const savedLoginStr = localStorage.getItem('ue_session');
    if (savedLoginStr) {
      try {
        const session = JSON.parse(savedLoginStr);
        if (Date.now() - session.timestamp < 15 * 60 * 1000) {
          setUserRole(session.role);
          setIsLoggedIn(true);
        } else { localStorage.removeItem('ue_session'); }
      } catch (e) { console.error('Session failed:', e); }
    }
  }, []);

  const handleLogin = () => {
    setLoginError('');
    if (emailInput.trim() === 'carlhurles28@gmail.com' && passwordInput === 'J4sp3r#M1sty') {
      setUserRole('Dev'); setIsLoggedIn(true);
      localStorage.setItem('ue_session', JSON.stringify({ role: 'Dev', timestamp: Date.now() }));
    } else { setLoginError('Invalid email address or password. Access denied.'); }
  };

    const handleSignOut = () => {
    localStorage.clear();              // Completely clear the browser's memory vault
    setEmailInput('');                 // Erase your typed email string
    setPasswordInput('');              // Erase your typed password string
    setUserRole('');                   // Erase your 'Dev' rank assignment
    setShowUserDropdown(false);        // Close the visual dropdown panel container
    setIsLoggedIn(false);              // Shut down the main warehouse dashboard view
    
    // Give React 100 milliseconds to close down smoothly BEFORE reloading
    setTimeout(() => {
      window.location.reload();
    }, 100);
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
                <span className="text-[10px] uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-extrabold animate-pulse">Live Master Access</span>
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
                  <span className="font-semibold text-slate-800">carlhurles28@gmail.com</span>
                  <span className="text-[10px] text-blue-600 font-bold mt-0.5">Logged in as: {userRole}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50">
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-all"><LogOut className="w-3.5 h-3.5" /><span>Sign Out</span></button>
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
          <button onClick={() => setActiveTab('admin')} className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}><Settings className="w-4 h-4" /><span>Admin Panel</span></button>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'workspace' ? (
          <InventoryWorkspace schools={schools} clothingTypes={clothingTypes} sizes={sizes} colours={colours} locations={locations} categories={categories} itemTypes={itemTypes} inventory={inventory} loading={loading} seeding={seeding} />
        ) : (
          <AdminTabContainer schools={schools} clothingTypes={clothingTypes} sizes={sizes} colours={colours} locations={locations} categories={categories} itemTypes={itemTypes} />
        )}
      </main>
    </div>
  );
}
