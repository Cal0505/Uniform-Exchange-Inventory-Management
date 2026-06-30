import React, { useState } from 'react';
import { 
  Menu, X, ChevronDown, ChevronRight, Package, Wrench, Users, 
  Terminal, BarChart3, User, Shirt, Maximize2, Layers, Clock, 
  School, Palette, MapPin, LogOut, Settings
} from 'lucide-react';

interface NavBarProps {
  Category: any[];
  activeMainTab: string | null;
  setActiveMainTab: (tab: any) => void;
  activeSubTab: string;
  setActiveSubTab: (tab: any) => void;
  currentViewedCategory: string | null;
  setCurrentViewedCategory: (catId: string | null) => void;
  userRole: string;
  loggedInEmail: string;
  handleSignOut: () => void;
  isFirebaseConnected: boolean;
  loading: boolean;
}

export default function NavBar({
  Category,
  activeMainTab,
  setActiveMainTab,
  activeSubTab,
  setActiveSubTab,
  currentViewedCategory,
  setCurrentViewedCategory,
  userRole,
  loggedInEmail,
  handleSignOut,
  isFirebaseConnected,
  loading
}: NavBarProps) {
  // 📱 Mobile drawer responsive layout toggle state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // 👤 Bottom profile menu expansion toggle state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  // 📂 ACCORDION MENUS: ALL SET TO FALSE BY DEFAULT FOR A CLEAN STARTUP
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [managementExpanded, setManagementExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);

  // Alphabetically sort your live database Category automatically
  const sortedCategories = [...Category].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  const handleSelectCategoryPage = (catId: string) => {
    setActiveMainTab('inventory_view');
    setCurrentViewedCategory(catId);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false); 
  };

  const handleSelectManagementPage = (subTabId: string) => {
    setActiveMainTab('management_view');
    setActiveSubTab(subTabId);
    setCurrentViewedCategory(null);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleSelectStaticPage = (mainTabId: string) => {
    setActiveMainTab(mainTabId);
    setCurrentViewedCategory(null);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  // 🧱 INNER COMPONENT: SCROLLABLE MENU TRACK WRAPPER WITH PILL FOLDERS
  const NavLinksMenuTree = () => (
    <div className="flex flex-col h-full justify-between select-none relative">
      
      {/* 📜 VERTICAL SCROLL ENGINE CONTAINER */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-none text-left" style={{ maxHeight: 'calc(100vh - 230px)' }}>
        
        {/* 🏠 GLOBAL HOMEPAGE LANDING DESK LINK BUTTON */}
        <div className="px-1">
          <button 
            type="button"
            onClick={() => handleSelectStaticPage(null as any)}
            className={`w-full py-2.5 px-4 flex items-center gap-2.5 rounded-full border transition cursor-pointer text-xs font-black uppercase tracking-wider duration-150 shadow-xs hover:scale-[1.01] active:scale-[0.99]
              ${activeMainTab === null 
                ? 'bg-amber-400 text-slate-900 border-transparent shadow-sm' 
                : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Layers className={`w-4 h-4 ${activeMainTab === null ? 'text-slate-900' : 'text-white/70'}`} />
            <span>Home Dashboard</span>
          </button>
        </div>

        {/* 📂 DRAWER 1: INVENTORY PILL HEADER */}
        <div className="space-y-1">
          <button 
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
            className={`w-full py-2.5 px-3 flex items-center justify-between rounded-full border transition cursor-pointer duration-200
              ${inventoryExpanded 
                ? 'bg-white/15 text-white border-white/10 shadow-xs font-black' 
                : 'bg-white/5 text-white/70 border-transparent hover:bg-white/10 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2">
              <Package className={`w-4 h-4 ${inventoryExpanded ? 'text-amber-400' : 'text-white/80'}`} />
              <span className="uppercase text-[10px] tracking-widest font-extrabold">Inventory</span>
            </div>
            {inventoryExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {inventoryExpanded && (
            <div className="pl-4 border-l border-white/10 ml-5 space-y-1 pt-1 animate-fadeIn">
              {sortedCategories.map((cat) => {
                const isCurrent = activeMainTab === 'inventory_view' && currentViewedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategoryPage(cat.id)}
                    className={`w-full py-2 px-3 flex items-center gap-2 rounded-xl text-left transition cursor-pointer font-bold ${
                      isCurrent ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <Shirt className={`w-3.5 h-3.5 ${isCurrent ? 'text-slate-900' : 'text-white/60'}`} />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
              {sortedCategories.length === 0 && <span className="block pl-3 py-1 text-[10px] text-white/40 italic">No Category live.</span>}
            </div>
          )}
        </div>

        {/* 📂 DRAWER 2: MANAGEMENT PILL HEADER */}
        <div className="space-y-1">
          <button 
            onClick={() => setManagementExpanded(!managementExpanded)}
            className={`w-full py-2.5 px-3 flex items-center justify-between rounded-full border transition cursor-pointer duration-200
              ${managementExpanded 
                ? 'bg-white/15 text-white border-white/10 shadow-xs font-black' 
                : 'bg-white/5 text-white/70 border-transparent hover:bg-white/10 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className={`w-4 h-4 ${managementExpanded ? 'text-amber-400' : 'text-white/80'}`} />
              <span className="uppercase text-[10px] tracking-widest font-extrabold">Management</span>
            </div>
            {managementExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {managementExpanded && (
            <div className="pl-4 border-l border-white/10 ml-5 space-y-1 pt-1 animate-fadeIn">
              {[
                { id: 'Category', label: 'Category', icon: Layers },
                { id: 'School Type', label: 'School Type', icon: Clock },
                { id: 'School', label: 'School', icon: School },
                { id: 'Clothing Type', label: 'Clothing Type', icon: Shirt },
                { id: 'Size', label: 'Size', icon: Maximize2 },
                { id: 'Colour', label: 'Colour', icon: Palette },
                { id: 'Location', label: 'Location', icon: MapPin },
              ].map((sub) => {
                const SubIcon = sub.icon;
                const isCurrent = activeMainTab === 'management_view' && activeSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectManagementPage(sub.id)}
                    className={`w-full py-2 px-3 flex items-center gap-2 rounded-xl text-left transition cursor-pointer font-bold ${
                      isCurrent ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <SubIcon className={`w-3.5 h-3.5 ${isCurrent ? 'text-slate-900' : 'text-white/60'}`} />
                    <span className="truncate">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 📂 DRAWER 3: ADMIN PILL HEADER */}
        <div className="space-y-1">
          <button 
            onClick={() => setAdminExpanded(!adminExpanded)}
            className={`w-full py-2.5 px-3 flex items-center justify-between rounded-full border transition cursor-pointer duration-200
              ${adminExpanded 
                ? 'bg-white/15 text-white border-white/10 shadow-xs font-black' 
                : 'bg-white/5 text-white/70 border-transparent hover:bg-white/10 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2">
              <Settings className={`w-4 h-4 ${adminExpanded ? 'text-amber-400' : 'text-white/80'}`} />
              <span className="uppercase text-[10px] tracking-widest font-extrabold">Admin</span>
            </div>
            {adminExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {adminExpanded && (
            <div className="pl-4 border-l border-white/10 ml-5 space-y-1 pt-1 animate-fadeIn">
              <button onClick={() => handleSelectStaticPage('staff')} className={`w-full py-2 px-3 flex items-center gap-2 rounded-xl text-left transition cursor-pointer font-bold ${activeMainTab === 'staff' ? 'bg-amber-400 text-slate-900' : 'text-white hover:bg-white/10'}`}>
                <Users className="w-3.5 h-3.5 text-white/60" /><span>Manage Staff</span>
              </button>
              
              {/* 🔒 DEVELOPER SECURITY GATEWAY MENU BUTTON CHECK */}
              {(userRole === 'Dev' || userRole === 'Master_Dev') && (
                <button onClick={() => handleSelectStaticPage('dev')} className={`w-full py-2 px-3 flex items-center gap-2 rounded-xl text-left transition cursor-pointer font-bold ${activeMainTab === 'dev' ? 'bg-amber-400 text-slate-900' : 'text-white hover:bg-white/10'}`}>
                  <Terminal className="w-3.5 h-3.5 text-white/60" /><span>Dev Tools</span>
                </button>
              )}

              <button onClick={() => handleSelectStaticPage('statistics')} className={`w-full py-2 px-3 flex items-center gap-2 rounded-xl text-left transition cursor-pointer font-bold ${activeMainTab === 'statistics' ? 'bg-amber-400 text-slate-900' : 'text-white hover:bg-white/10'}`}>
                <BarChart3 className="w-3.5 h-3.5 text-white/60" /><span>Statistics</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 👤 INTERACTIVE USER PROFILE CARD OVERLAY SYSTEM */}
      <div className="relative mt-4 flex-shrink-0 w-full">
        {profileDropdownOpen && (
          <div className="absolute bottom-[calc(100%+10px)] left-0 w-full bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50 animate-fadeIn text-left">
            <button 
              onClick={() => handleSelectStaticPage('account')}
              className={`w-full py-2.5 px-3 flex items-center gap-2 rounded-xl transition cursor-pointer text-xs font-bold ${
                activeMainTab === 'account' ? 'bg-amber-400 text-slate-900' : 'text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" /><span>Profile Settings</span>
            </button>
            <div className="h-[1px] bg-white/10 w-full my-0.5" />
            <button 
              type="button" 
              onClick={handleSignOut} 
              className="w-full flex items-center gap-2 py-2.5 px-3 bg-brand-orange text-white rounded-xl text-xs font-bold transition-all hover:bg-orange-600 cursor-pointer shadow-md"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Sign Out Session</span>
            </button>
          </div>
        )}

        <button 
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          className="w-full bg-brand-teal p-3 rounded-2xl flex items-center justify-between border border-white/10 shadow-inner transition hover:brightness-105 active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-xs font-black text-white bg-white/10 shrink-0 font-mono">
              {loggedInEmail ? loggedInEmail.substring(0, 2).toUpperCase() : 'CH'}
            </div>
            <div className="flex flex-col text-left leading-tight overflow-hidden">
              <span className="text-xs font-black text-white uppercase tracking-wide truncate">
                {loggedInEmail ? loggedInEmail.split('@')[0] : 'User'}
              </span>
              <span className="text-[9px] text-slate-900 font-black uppercase tracking-wider opacity-85 truncate">
                {userRole || 'ACCESS'}
              </span>
            </div>
          </div>

          <div className="flex items-center shrink-0 pl-1">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFirebaseConnected && !loading ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isFirebaseConnected && !loading ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
            </span>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="font-sans">
      {/* 🍔 PHONE HEADERS BAR */}
      <div className="xl:hidden bg-brand-primary text-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 w-full shadow-md border-b-2 border-amber-400">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-0.5 bg-brand-teal rounded-lg shadow-sm flex items-center justify-center w-8 h-8 shrink-0">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="font-serif font-black text-xs uppercase tracking-wide text-white">UNIFORM EX</span>
              <span className="text-[8px] font-sans text-amber-300 uppercase tracking-widest font-black mt-0.5">Realtime Inventory</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={handleSignOut} className="text-white hover:text-orange-400 cursor-pointer"><LogOut className="w-4 h-4" /></button>
      </div>

      {/* 💻 PC LEFT COLUMN HUB SIDEBAR */}
      <div className="hidden xl:flex flex-col w-64 bg-brand-primary text-white h-screen fixed top-0 left-0 p-5 overflow-hidden z-30 shadow-xl justify-between">
        <div className="flex flex-col bg-brand-teal border border-white/10 rounded-3xl p-4 shadow-inner mb-4 text-left flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white rounded-2xl shadow-md shrink-0 flex items-center justify-center w-11 h-11">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="leading-none text-left">
              <h1 className="text-sm font-serif font-black text-white tracking-wide uppercase">UNIFORM EX</h1>
              <p className="text-[9px] font-sans text-amber-300 uppercase tracking-widest font-black mt-1">Realtime Inventory</p>
            </div>
          </div>
        </div>
        <NavLinksMenuTree />
      </div>

      {/* 📱 DRAWER SYSTEM OVERLAY DRAWER PANEL */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex xl:hidden animate-fadeIn">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-brand-primary text-white h-full p-5 shadow-2xl animate-slideInLeft justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-0.5 bg-brand-teal rounded-lg shadow-sm flex items-center justify-center w-8 h-8 shrink-0">
                  <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="font-serif font-black text-xs uppercase tracking-wide text-white">UNIFORM EX</span>
                  <span className="text-[8px] font-sans text-amber-300 uppercase tracking-widest font-black mt-0.5">Realtime Inventory</span>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-white/60 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <NavLinksMenuTree />
          </div>
        </div>
      )}
    </div>
  );
}