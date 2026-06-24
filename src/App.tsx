import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { seedDatabaseIfEmpty } from './seeder';
import { School, ClothingType, Size, Colour, Location, InventoryItem, Category, ItemType } from './types';
import AdminPanel from './components/AdminPanel';
import InventoryWorkspace from './components/InventoryWorkspace';
import {
  Sparkles,
  Settings,
  Layers,
  Database,
  RefreshCw,
  Clock,
  Shirt,
  User,
  ExternalLink
} from 'lucide-react';

export default function App() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Contact form states
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  // UI Navigation tabs
  const [activeTab, setActiveTab] = useState<'workspace' | 'admin'>('workspace');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // States for live synchronized metadata
  const [schools, setSchools] = useState<School[]>([]);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Seed database if empty on component mount
  useEffect(() => {
    const runSeeder = async () => {
      setSeeding(true);
      try {
        await seedDatabaseIfEmpty();
      } catch (err) {
        console.error('Error running seeder:', err);
      } finally {
        setSeeding(false);
      }
    };
    runSeeder();
  }, []);

  // Listen for real-time changes in Firestore collections
  useEffect(() => {
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
      const items: School[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as School);
      });
      setSchools(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schools');
    });

    const unsubTypes = onSnapshot(collection(db, 'clothingTypes'), (snapshot) => {
      const items: ClothingType[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ClothingType);
      });
      setClothingTypes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clothingTypes');
    });

    const unsubSizes = onSnapshot(collection(db, 'sizes'), (snapshot) => {
      const items: Size[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Size);
      });
      setSizes(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sizes');
    });

    const unsubColours = onSnapshot(collection(db, 'colours'), (snapshot) => {
      const items: Colour[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Colour);
      });
      setColours(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'colours');
    });

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snapshot) => {
      const items: Location[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Location);
      });
      setLocations(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'locations');
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    const unsubItemTypes = onSnapshot(collection(db, 'itemTypes'), (snapshot) => {
      const items: ItemType[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ItemType);
      });
      setItemTypes(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'itemTypes');
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as InventoryItem);
      });
      setInventory(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inventory');
    });

    return () => {
      unsubSchools();
      unsubTypes();
      unsubSizes();
      unsubColours();
      unsubLocations();
      unsubCategories();
      unsubItemTypes();
      unsubInventory();
    };
  }, []);

  // MASTER ACTION: VALIDATE THE TYPED LOGINS
  const handleLogin = () => {
    setLoginError('');
    
    // Check against your bulletproof master credentials
    if (emailInput.trim() === 'carlhurles28@gmail.com' && passwordInput === 'J4sp3r#M1sty') {
      setUserRole('Dev');
      setIsLoggedIn(true);
    } else {
      setLoginError('Invalid email address or password. Access denied.');
    }
  };

  // MASTER ACTION: CONTACT DEV TEAM PLACEHOLDER (WE WILL LINK TO FIRESTORE NEXT)
  const handleSendMessage = () => {
    if (!contactMessage.trim()) return;
    alert(`Ticket logged for fallback tracking! Content: "${contactMessage}"`);
    setContactMessage('');
    setShowContactForm(false);
  };

  // IF USER IS NOT LOGGED IN, SHOW THE MUTATED LOGIN BLOCK INTERFACE
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
              <Shirt className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
              Uniform Exchange Sign In
            </h2>
            <p className="text-xs text-slate-500 text-center">
              Please enter your credentials to access the stock manager
            </p>
          </div>
          
          <div className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
                {loginError}
              </div>
            )}
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-700">Email Address</label>
              <input 
                type="email" 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="enter your email" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900" 
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-700">Password</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900" 
              />
            </div>
            <button 
              onClick={handleLogin} 
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
            >
              Sign In
            </button>
            <button onClick={() => setShowContactForm(!showContactForm)} className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 mt-2 block transition-all">
              Trouble logging in? Message the dev team
            </button>
            {showContactForm && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <textarea 
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Type your message to the admin team here..." 
                  className="w-full h-20 p-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-slate-50 text-slate-900" 
                />
                <button 
                  onClick={handleSendMessage} 
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-all"
                >
                  Send Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  // IF USER IS LOGGED IN, RENDER THE ACTUAL WORKSPACE DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">
      {/* GLOBAL UTILITY HEADER */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* BRAND NAME */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-white rounded-xl shadow-md shadow-primary/10">
              <Shirt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                School Uniform Exchange
                <span className="text-[10px] uppercase tracking-widest bg-secondary/10 text-secondary px-2 py-0.5 rounded font-extrabold animate-pulse">
                  Live {userRole === 'Dev' ? 'Master Access' : 'Firestore'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kirklees & Beyond Warehouse Stock Manager — Logged in as: <span className="font-semibold text-blue-600">{userRole}</span>
              </p>
            </div>
          </div>

          {/* APP STATUS BAR */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>UTC Workspace</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>carlhurles28@gmail.com</span>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              title="Force sync database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* PRIMARY NAVIGATION TABS */}
      <nav className="bg-white border-b border-slate-100 px-6 py-2">
        <div className="max-w-7xl mx-auto flex gap-4">
          <button
            id="nav-workspace-tab"
            onClick={() => setActiveTab('workspace')}
            className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'workspace'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Workspace Dashboard</span>
          </button>

          <button
            id="nav-admin-tab"
            onClick={() => setActiveTab('admin')}
            className={`pb-3 pt-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'admin'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Admin Panel</span>
          </button>
        </div>
      </nav>

      {/* RENDER ACTIVE TAB */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'workspace' ? (
          <InventoryWorkspace 
            schools={schools}
            clothingTypes={clothingTypes}
            sizes={sizes}
            colours={colours}
            locations={locations}
            categories={categories}
            itemTypes={itemTypes}
            inventory={inventory}
            loading={loading}
            seeding={seeding}
          />
        ) : (
          <AdminPanel 
            schools={schools}
            clothingTypes={clothingTypes}
            sizes={sizes}
            colours={colours}
            locations={locations}
            categories={categories}
            itemTypes={itemTypes}
          />
        )}
      </main>
    </div>
  );
}
