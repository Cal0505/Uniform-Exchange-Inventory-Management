import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { Terminal, RefreshCw, Radio, HardDrive, AlertTriangle, FileText, Search, X, ShieldAlert, Activity, ShieldX, Zap, Sliders, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface DevToolsDashboardProps {
  userRole: string;
}

export default function DevToolsDashboard({ userRole }: DevToolsDashboardProps) {
  const [logsList, setLogsList] = useState<any[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [isResyncing, setIsResyncing] = useState(false);
  const [isLockedDown, setIsLockedDown] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [multiplyFactor, setMultiplyFactor] = useState('2');
  const [isMultiplying, setIsMultiplying] = useState(false);
  const [latencyPing, setLatencyPing] = useState<number | null>(null);

  // 📡 DYNAMIC SYSTEM CONTROL STATES
  const [isBypassActive, setIsBypassActive] = useState(false);
  const [isTogglingBypass, setIsTogglingBypass] = useState(false);
  const [isClearingCollection, setIsClearingCollection] = useState<string | null>(null);

  useEffect(() => {
    const qLogs = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogsList(snapshot.docs.map(d => {
        const data = d.data();
        let formattedTime = 'JUST NOW';
        if (data.timestamp) {
          const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          formattedTime = dateObj.toLocaleDateString('en-GB') + ' ' + dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        return { id: d.id, formattedTime, ...data };
      }));
    });

    const unsubConfig = onSnapshot(doc(db, 'system_config', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsLockedDown(data.portal_lockdown_active === true);
        setIsBypassActive(data.dev_bypass_active === true);
      }
    });

    const pingInterval = setInterval(async () => {
      const startTime = Date.now();
      try {
        await getDocs(query(collection(db, 'system_config')));
        setLatencyPing(Date.now() - startTime);
      } catch (err) { setLatencyPing(null); }
    }, 4000);

    return () => { unsubLogs(); unsubConfig(); clearInterval(pingInterval); };
  }, []);
  const handleToggleSystemLockdown = async () => {
    try {
      setIsTogglingLock(true);
      await updateDoc(doc(db, 'system_config', 'settings'), { portal_lockdown_active: !isLockedDown });
    } catch (err) { console.error(err); } finally { setIsTogglingLock(false); }
  };

  const handleToggleDevBypass = async () => {
    try {
      setIsTogglingBypass(true);
      await updateDoc(doc(db, 'system_config', 'settings'), { dev_bypass_active: !isBypassActive });
      alert(`System Parameter Synchronized: Dev Login Bypass is now ${!isBypassActive ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err) { console.error(err); } finally { setIsTogglingBypass(false); }
  };

  // 🔴 DESTRUCTIVE ACTIONS: EXCLUSIVE MASTER DEV COMBINATORICS MASS SEEDER
  const handleRunLocalSeederEngine = async () => {
    if (userRole !== 'Master_Dev') { alert("Clearance Error: Master Dev credentials required."); return; }
    const secureKeyInput = prompt("SECURITY OVERWRITE CHECK: Enter Master Developer Password to execute 3,000+ items matrix seeder:");
    if (secureKeyInput !== 'J4sp3r#M1sty') { alert("Access Denied: Invalid Security Passkey."); return; }

    try {
      setIsResyncing(true);
      const { runDatabaseSeeder } = await import('../seeder');
      await runDatabaseSeeder();
      alert("Database Seeded Successfully: 3,000+ mock garments have been compiled and pushed to Firestore.");
    } catch (err) {
      console.error(err);
      alert("Execution Error: Could not execute your local seeder engine code layout layers.");
    } finally { setIsResyncing(false); }
  };

  // 🔴 DESTRUCTIVE ACTIONS: EXCLUSIVE MASTER DEV ALL REPOSITORIES WIPER
  const handleWipeEntireDatabaseExceptStaff = async () => {
    if (userRole !== 'Master_Dev') { alert("Clearance Error: Master Dev credentials required."); return; }
    const secureKeyInput = prompt("SECURITY OVERWRITE CHECK: Enter Master Developer Password to proceed with absolute wipe:");
    if (secureKeyInput !== 'J4sp3r#M1sty') { alert("Access Denied: Invalid Security Passkey."); return; }

    if (!window.confirm("🔴 CRITICAL WARNING: You are about to completely destroy your entire warehouse database. Proceed?")) return;
    try {
      setIsMultiplying(true);
      const targetCollections = ['inventory', 'schools', 'categories', 'clothingTypes', 'sizes', 'colours', 'locations', 'tasks', 'news_feed', 'user_requests'];
      for (const colName of targetCollections) {
        const snap = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(doc(db, colName, d.id)));
        await batch.commit();
      }
      alert("Database Wipe Complete: All categories, schools, layouts, and items cleaned. Staff list skipped.");
    } catch (err) { console.error(err); } finally { setIsMultiplying(false); }
  };
  const handleClearCollectionPool = async (collectionName: string, userLabel: string) => {
    if (!window.confirm(`CRITICAL OVERRIDE: Are you completely certain you want to permanently delete all cloud records inside the "${userLabel}" database table?`)) return;
    try {
      setIsClearingCollection(collectionName);
      const snapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => { batch.delete(doc(db, collectionName, d.id)); });
      await batch.commit();
      alert(`Cloud Erasure Complete: The "${userLabel}" database profile array has been wiped clean.`);
    } catch (err) { console.error(err); } finally { setIsClearingCollection(null); }
  };

  const handleMassMultiplyInventory = async () => {
    const scaleFactor = Number(multiplyFactor);
    if (isNaN(scaleFactor) || scaleFactor <= 0) return;
    try {
      setIsMultiplying(true);
      const snapshot = await getDocs(collection(db, 'inventory'));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => { batch.update(doc(db, 'inventory', d.id), { quantity: (Number(d.data().quantity) || 0) * scaleFactor }); });
      await batch.commit();
    } catch (err) { console.error(err); } finally { setIsMultiplying(false); }
  };

  const handleFlushCacheAndResync = () => { window.location.reload(); };

  const filteredLogs = logsList.filter(log => {
    const term = logSearchQuery.toLowerCase();
    return (log.formattedTime || '').toLowerCase().includes(term) || (log.user || '').toLowerCase().includes(term) || (log.action || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 text-left select-none animate-fadeIn w-full max-w-5xl relative">
      <div>
        <span className="text-[10px] font-mono font-black tracking-widest text-rose-600 uppercase">System Diagnostics</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Terminal className="w-5 h-5 text-rose-600" /> Core Developer Terminal</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start w-full">
        {/* COLUMN 1: DIRECT GLOBAL TOGGLE OVERRIDES */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Sliders className="w-4 h-4 text-slate-700" /> Logic Overrides</h4>
          <div className="space-y-3">
            
            <button type="button" onClick={handleToggleDevBypass} disabled={isTogglingBypass} className={`w-full p-3 border border-dashed rounded-xl text-left flex items-center justify-between group transition cursor-pointer ${isBypassActive ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 hover:border-amber-400'}`}>
              <div>
                <p className={`text-xs font-black transition ${isBypassActive ? 'text-amber-600' : 'text-slate-800 group-hover:text-amber-600'}`}>{isBypassActive ? 'Disable Dev Login Bypass' : 'Enable Dev Login Bypass'}</p>
                <p className="text-[10px] text-slate-400 font-medium">Bypasses strict database identity barriers for swift system inspection.</p>
              </div>
              {isBypassActive ? <ToggleRight className="w-5 h-5 text-amber-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />}
            </button>

            <button type="button" onClick={handleToggleSystemLockdown} disabled={isTogglingLock} className={`w-full p-3 border border-dashed rounded-xl text-left flex items-center justify-between group transition cursor-pointer ${isLockedDown ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 hover:border-rose-400'}`}>
              <div><p className={`text-xs font-black transition ${isLockedDown ? 'text-rose-600' : 'text-slate-800 group-hover:text-rose-600'}`}>{isLockedDown ? 'Release System Lockdown' : 'Activate System Lockdown'}</p><p className="text-[10px] text-slate-400 font-medium">Throws the website environment into an absolute read-only view.</p></div>
              <ShieldX className={`w-4 h-4 ${isLockedDown ? 'text-rose-500 animate-pulse' : 'text-slate-400 group-hover:text-rose-500'}`} />
            </button>
          </div>
        </div>
        {/* COLUMN 2: SELECTIVE COLLECTIONS CELL PURGER SCHEMAS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Trash2 className="w-4 h-4 text-rose-500" /> Database Collection Clearers</h4>
          <div className="space-y-2">
            <button type="button" onClick={() => handleClearCollectionPool('user_requests', 'User Signup Requests Queue')} disabled={!!isClearingCollection} className="w-full p-2 bg-slate-50 border hover:bg-rose-50 border-transparent hover:border-rose-200 text-slate-700 hover:text-rose-600 transition font-black uppercase text-[10px] tracking-wider rounded-xl flex items-center justify-between cursor-pointer"><span>Wipe User Requests Queue</span>{isClearingCollection === 'user_requests' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}</button>
            <button type="button" onClick={() => handleClearCollectionPool('tasks', 'Warehouse Tasks Database')} disabled={!!isClearingCollection} className="w-full p-2 bg-slate-50 border hover:bg-rose-50 border-transparent hover:border-rose-200 text-slate-700 hover:text-rose-600 transition font-black uppercase text-[10px] tracking-wider rounded-xl flex items-center justify-between cursor-pointer"><span>Wipe Active Tasks List</span>{isClearingCollection === 'tasks' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}</button>
            <button type="button" onClick={() => handleClearCollectionPool('news_feed', 'Announcements News Feed')} disabled={!!isClearingCollection} className="w-full p-2 bg-slate-50 border hover:bg-rose-50 border-transparent hover:border-rose-200 text-slate-700 hover:text-rose-600 transition font-black uppercase text-[10px] tracking-wider rounded-xl flex items-center justify-between cursor-pointer"><span>Wipe Broadcast News Feed</span>{isClearingCollection === 'news_feed' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}</button>
          </div>
          <div className="pt-2 border-t flex gap-2">
            <button type="button" onClick={() => setIsLogOpen(true)} className="flex-1 p-2 bg-slate-900 text-white font-black uppercase text-[9px] tracking-widest rounded-xl text-center hover:bg-teal-600 transition cursor-pointer">Audit Logs</button>
            <button type="button" onClick={handleFlushCacheAndResync} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* COLUMN 3: RUNTIME PLATFORM TELEMETRY INFORMATION MONITOR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-slate-700" /> Infrastructure Status</h4>
          <div className="space-y-2.5 font-mono text-[10px] font-bold text-slate-500">
            <div className="flex items-center justify-between border-b pb-1.5"><span>Connected Rank:</span><span className="text-rose-600 font-black">{userRole}</span></div>
            <div className="flex items-center justify-between border-b pb-1.5"><span>Firebase Latency:</span><span className={`font-black ${!latencyPing ? 'text-slate-400' : latencyPing > 250 ? 'text-amber-500' : 'text-emerald-600'}`}>{latencyPing ? `${latencyPing} MS` : 'PING...'}</span></div>
            <div className="flex items-center justify-between pt-0.5"><span>Threat Profile:</span><span className={`font-black ${isLockedDown ? 'text-rose-600' : 'text-slate-900'}`}>{isLockedDown ? 'LOCKDOWN ACTIVE' : 'CLEAR'}</span></div>
          </div>

          {/* 👑 EXCLUSIVE ROOT OVERRIDES FOR MASTER DEV */}
          {userRole === 'Master_Dev' && (
            <div className="space-y-2 pt-2 border-t text-[9px] uppercase tracking-wider font-extrabold flex flex-col">
              <button type="button" onClick={handleRunLocalSeederEngine} className="w-full p-2 bg-teal-600 text-white font-black uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer hover:bg-teal-700 transition"><Zap className="w-3 h-3" /> Populate 3,000+ Items</button>
              <button type="button" onClick={handleWipeEntireDatabaseExceptStaff} className="w-full p-2 bg-rose-600 text-white font-black uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer hover:bg-rose-700 transition"><ShieldAlert className="w-3 h-3" /> Wipe All Data</button>
            </div>
          )}
        </div>
      </div>
      {isLogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn text-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col p-6 shadow-xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-4 mb-4 shrink-0">
              <div className="text-left"><h3 className="font-black text-slate-900 text-sm uppercase tracking-wide flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal-600" /> System Action Audit Logs</h3></div>
              <button type="button" onClick={() => setIsLogOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-4 shrink-0"><Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" /><input type="text" placeholder="Narrow down log history..." value={logSearchQuery} onChange={(e) => setLogSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-teal-600 font-medium text-slate-800" /></div>
            <div className="flex-1 overflow-y-auto border rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 font-black text-slate-500 text-[9px] border-b sticky top-0 z-10">
                  <tr><th className="py-2.5 px-4 w-40">Timestamp</th><th className="py-2.5 px-4 w-56">User</th><th className="py-2.5 px-4">Action Details</th></tr>
                </thead>
                <tbody className="divide-y text-slate-700 font-medium font-mono text-[11px]">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-4 text-slate-400 font-bold">{log.formattedTime}</td>
                      <td className="py-2.5 px-4 text-brand-primary font-bold break-all underline select-text">{log.user || 'SYSTEM'}</td>
                      <td className="py-2.5 px-4 text-slate-800 normal-case select-text"><span className="bg-slate-100 text-slate-900 text-[10px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded-md border mr-2">{log.action}</span><span>{log.details || 'No data string.'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && <div className="py-12 text-center text-slate-400 font-sans font-bold uppercase tracking-wider">No audit records found.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
