import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Terminal, RefreshCw, HardDrive, FileText, Search, X, ShieldAlert, ShieldX, Zap, Sliders, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { runDatabaseSeeder } from '../seeder/seeder';

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

  // 🔴 DYNAMIC SEEDER ENGINE
  const handleRunLocalSeederEngine = async () => {
    if (userRole !== 'Master_Dev') { alert("Clearance Error: Master Dev credentials required."); return; }
    const secureKeyInput = prompt("SECURITY OVERWRITE CHECK: Enter Master Developer Password:");
    if (secureKeyInput !== 'J4sp3r#M1sty') { alert("Access Denied."); return; }

    try {
      setIsResyncing(true);
      const seederModule = await import('../seeder');
      await runDatabaseSeeder();
      alert("Database Seeded Successfully.");
    } catch (err) {
      console.error(err);
      alert("Execution Error: Could not execute your local seeder engine.");
    } finally { setIsResyncing(false); }
  };

  const handleWipeEntireDatabaseExceptStaff = async () => {
    if (userRole !== 'Master_Dev') { alert("Clearance Error: Master Dev credentials required."); return; }
    const secureKeyInput = prompt("SECURITY OVERWRITE CHECK: Enter Master Developer Password:");
    if (secureKeyInput !== 'J4sp3r#M1sty') { alert("Access Denied."); return; }

    if (!window.confirm("🔴 CRITICAL WARNING: Destroy everything?")) return;
    try {
      setIsMultiplying(true);
      const targetCollections = ['inventory', 'schools', 'categories', 'Clothing_Type', 'Size', 'Colour', 'Location', 'tasks', 'news_feed', 'user_requests'];
      for (const colName of targetCollections) {
        const snap = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(doc(db, colName, d.id)));
        await batch.commit();
      }
      alert("Database Wipe Complete.");
    } catch (err) { console.error(err); } finally { setIsMultiplying(false); }
  };

  const handleClearCollectionPool = async (collectionName: string, userLabel: string) => {
    if (!window.confirm(`Are you sure you want to wipe "${userLabel}"?`)) return;
    try {
      setIsClearingCollection(collectionName);
      const snapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => { batch.delete(doc(db, collectionName, d.id)); });
      await batch.commit();
      alert(`Erasure Complete: "${userLabel}" wiped.`);
    } catch (err) { console.error(err); } finally { setIsClearingCollection(null); }
  };

  const handleFlushCacheAndResync = () => { window.location.reload(); };

  return (
    <div className="space-y-6 text-left select-none animate-fadeIn w-full max-w-5xl relative">
      <div>
        <span className="text-[10px] font-mono font-black tracking-widest text-rose-600 uppercase">System Diagnostics</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Terminal className="w-5 h-5 text-rose-600" /> Core Developer Terminal</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start w-full">
        {/* Logic Overrides */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Sliders className="w-4 h-4 text-slate-700" /> Logic Overrides</h4>
          <button type="button" onClick={handleToggleDevBypass} disabled={isTogglingBypass} className={`w-full p-3 border border-dashed rounded-xl text-left flex items-center justify-between group transition cursor-pointer ${isBypassActive ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 hover:border-amber-400'}`}>
            <div>
              <p className={`text-xs font-black transition ${isBypassActive ? 'text-amber-600' : 'text-slate-800'}`}>{isBypassActive ? 'Disable Dev Bypass' : 'Enable Dev Bypass'}</p>
            </div>
            {isBypassActive ? <ToggleRight className="w-5 h-5 text-amber-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
          </button>
        </div>

        {/* Database Collection Clearers */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Trash2 className="w-4 h-4 text-rose-500" /> Collection Clearers</h4>
          <div className="space-y-2">
            <button type="button" onClick={() => handleClearCollectionPool('user_requests', 'Signup Requests')} className="w-full p-2 bg-slate-50 border hover:bg-rose-50 text-slate-700 hover:text-rose-600 transition font-black uppercase text-[10px] rounded-xl flex items-center justify-between cursor-pointer"><span>Wipe User Requests</span><X className="w-3.5 h-3.5" /></button>
          </div>
          <button type="button" onClick={() => setIsLogOpen(true)} className="w-full p-2 bg-slate-900 text-white font-black uppercase text-[9px] rounded-xl hover:bg-teal-600 transition cursor-pointer">Audit Logs</button>
        </div>

        {/* Infrastructure Status */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-slate-700" /> Infrastructure Status</h4>
          <div className="flex items-center justify-between border-b pb-1.5"><span>Rank:</span><span className="text-rose-600 font-black">{userRole}</span></div>
          {userRole === 'Master_Dev' && (
            <div className="space-y-2 pt-2 border-t flex flex-col">
              <button type="button" onClick={handleRunLocalSeederEngine} className="w-full p-2 bg-teal-600 text-white font-black uppercase rounded-xl hover:bg-teal-700 transition"><Zap className="w-3 h-3 inline" /> Populate 3,000+ Items</button>
              <button type="button" onClick={handleWipeEntireDatabaseExceptStaff} className="w-full p-2 bg-rose-600 text-white font-black uppercase rounded-xl hover:bg-rose-700 transition"><ShieldAlert className="w-3 h-3 inline" /> Wipe All Data</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}