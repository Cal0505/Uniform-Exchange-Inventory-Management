import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { filterNavTreeByPermissions, type NavigationItem } from '../navigation';

interface NavBarProps {
  navigationTree: NavigationItem[];
  activeMainTab: string | null;
  setActiveMainTab: (tab: any) => void;
  activeSubTab: string;
  setActiveSubTab: (tab: any) => void;
  currentViewedCategory: string | null;
  setCurrentViewedCategory: (catId: string | null) => void;
  userRole: string;
  userName: string;
  rolePermissions: string[];
  handleSignOut: () => void;
  isFirebaseConnected: boolean;
  loading: boolean;
}

export default function NavBar({
  activeMainTab,
  setActiveMainTab,
  activeSubTab,
  setActiveSubTab,
  currentViewedCategory,
  setCurrentViewedCategory,
  userRole,
  userName,
  navigationTree,
  rolePermissions,
  handleSignOut,
  isFirebaseConnected,
  loading
}: NavBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const filteredNavigationTree = useMemo(
    () => filterNavTreeByPermissions(navigationTree, rolePermissions),
    [navigationTree, rolePermissions],
  );
  
  const handleSelectStaticPage = (mainTabId: string | null) => {
    setActiveMainTab(mainTabId);
    setCurrentViewedCategory(null);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const isNavigationItemActive = (item: NavigationItem): boolean => {
    if (item.target
      && item.target.mainTab === activeMainTab
      && (item.target.subTab === undefined || item.target.subTab === activeSubTab)
      && (item.target.categoryId === undefined || item.target.categoryId === currentViewedCategory)) return true;
    return (item.children || []).some(isNavigationItemActive);
  };

  const renderNavigationItems = (items: NavigationItem[], depth = 0): React.ReactNode => (
    <div className={depth === 0 ? 'space-y-2' : 'ml-5 space-y-1 border-l border-white/10 pl-4 pt-1'}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isNavigationItemActive(item);
        const isExpanded = !!expandedItems[item.id];
        if (item.children) {
          return (
            <div key={item.id} className="space-y-1">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setExpandedItems((current) => ({ ...current, [item.id]: !current[item.id] }))}
                className={`w-full rounded-full border px-3 py-2.5 flex items-center justify-between transition cursor-pointer duration-200 ${isActive || isExpanded ? 'bg-white/15 text-white border-white/10 shadow-xs font-black' : 'bg-white/5 text-white/70 border-transparent hover:bg-white/10 hover:text-white'}`}
              >
                <span className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive || isExpanded ? 'text-amber-400' : 'text-white/80'}`} />
                  <span className="uppercase text-[10px] tracking-widest font-extrabold">{item.label}</span>
                </span>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {isExpanded && renderNavigationItems(item.children, depth + 1)}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (!item.target) return;
              setActiveMainTab(item.target.mainTab);
              if (item.target.subTab) setActiveSubTab(item.target.subTab);
              setCurrentViewedCategory(item.target.categoryId ?? null);
              setProfileDropdownOpen(false);
              setMobileMenuOpen(false);
            }}
            className={`w-full rounded-xl px-3 py-2 flex items-center gap-2 text-left transition cursor-pointer font-bold ${isActive ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-white hover:bg-white/10'}`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-slate-900' : 'text-white/60'}`} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const NavLinksMenuTree = () => (
    <div className="flex flex-col h-full justify-between select-none relative">
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-none text-left" style={{ maxHeight: 'calc(100vh - 230px)' }}>
        {renderNavigationItems(filteredNavigationTree)}
      </div>

      <div className="relative mt-4 flex-shrink-0 w-full">
        {profileDropdownOpen && (
          <div className="absolute bottom-[calc(100%+10px)] left-0 w-full bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50 animate-fadeIn text-left">
            <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-2 py-2.5 px-3 bg-brand-orange text-white rounded-xl text-xs font-bold transition-all hover:bg-orange-600 cursor-pointer shadow-md">
              <LogOut className="w-3.5 h-3.5 shrink-0" /><span>Sign Out Session</span>
            </button>
          </div>
        )}

        <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="w-full bg-brand-teal p-3 rounded-2xl flex items-center justify-between border border-white/10 shadow-inner transition hover:brightness-105 active:scale-[0.99] cursor-pointer">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-xs font-black text-white bg-white/10 shrink-0 font-mono">
              {userName ? userName.substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col text-left leading-tight overflow-hidden">
              <span className="text-xs font-black text-white uppercase tracking-wide truncate">
                {userName || 'User'}
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
      <div className="xl:hidden fixed top-0 left-0 right-0 z-40 bg-brand-primary text-white px-4 py-2.5 flex items-center justify-between w-full shadow-md border-b-2 border-amber-400">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2">
            <div className="p-0.5 bg-brand-teal rounded-lg shadow-sm flex items-center justify-center w-8 h-8 shrink-0"><img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></div>
            <div className="flex flex-col text-left leading-none"><span className="font-serif font-black text-xs uppercase tracking-wide text-white">UNIFORM EX</span><span className="text-[8px] font-sans text-amber-300 uppercase tracking-widest font-black mt-0.5">Realtime Inventory</span></div>
          </div>
        </div>
        <button type="button" onClick={handleSignOut} className="text-white hover:text-orange-400 cursor-pointer"><LogOut className="w-4 h-4" /></button>
      </div>

      <div className="hidden xl:flex flex-col w-64 bg-brand-primary text-white h-screen fixed top-0 left-0 p-5 overflow-hidden z-30 shadow-xl justify-between">
        <div className="flex flex-col bg-brand-teal border border-white/10 rounded-3xl p-4 shadow-inner mb-4 text-left flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white rounded-2xl shadow-md shrink-0 flex items-center justify-center w-11 h-11"><img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></div>
            <div className="leading-none text-left"><h1 className="text-sm font-serif font-black text-white tracking-wide uppercase">UNIFORM EX</h1><p className="text-[9px] font-sans text-amber-300 uppercase tracking-widest font-black mt-1">Realtime Inventory</p></div>
          </div>
        </div>
        <NavLinksMenuTree />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex xl:hidden animate-fadeIn">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-brand-primary text-white h-full p-5 shadow-2xl animate-slideInLeft justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-0.5 bg-brand-teal rounded-lg shadow-sm flex items-center justify-center w-8 h-8 shrink-0"><img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain rounded-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} /></div>
                <div className="flex flex-col text-left leading-none"><span className="font-serif font-black text-xs uppercase tracking-wide text-white">UNIFORM EX</span><span className="text-[8px] font-sans text-amber-300 uppercase tracking-widest font-black mt-0.5">Realtime Inventory</span></div>
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