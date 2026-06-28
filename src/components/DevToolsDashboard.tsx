import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Terminal, RefreshCw, Radio, HardDrive, AlertTriangle, FileText, Search, X, ShieldAlert, Activity, ShieldX, Zap, Sliders } from 'lucide-react';

interface DevToolsDashboardProps {
  userRole: string;
}

export default function DevToolsDashboard({ userRole }: DevToolsDashboardProps) {
  const [logsList, setLogsList] = useState<any[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isLockedDown, setIsLockedDown] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [multiplyFactor, setMultiplyFactor] = useState('2');
  const [isMultiplying, setIsMultiplying] = useState(false);
  const [latencyPing, setLatencyPing] = useState<number | null>(null);

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
        setIsLockedDown(snapshot.data().portal_lockdown_active === true);
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
      const configRef = doc(db, 'system_config', 'settings');
      await updateDoc(configRef, { portal_lockdown_active: !isLockedDown });
      alert(`System Parameter Altered: Lockdown Mode is now ${!isLockedDown ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err) { console.error("Lockdown toggle dropped:", err); }
    finally { setIsTogglingLock(false); }
  };

  const handleMassMultiplyInventory = async () => {
    const scaleFactor = Number(multiplyFactor);
    if (isNaN(scaleFactor) || scaleFactor <= 0) { alert("Validation Error: Declared scale factor is invalid."); return; }
    if (!window.confirm(`CRITICAL OVERRIDE: Multiply all inventory quantites by ${scaleFactor}x?`)) return;
    
    try {
      setIsMultiplying(true);
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const batch = writeBatch(db);

      inventorySnapshot.docs.forEach((itemDoc) => {
        const currentQty = Number(itemDoc.data().quantity) || 0;
        batch.update(doc(db, 'inventory', itemDoc.id), {
          quantity: currentQty * scaleFactor
        });
      });

      await batch.commit();
      alert(`Mass Scale Vector Settled: Inventory multiplied by ${scaleFactor}x successfully.`);
    } catch (err) { console.error("Mass modification script crashed:", err); }
    finally { setIsMultiplying(false); }
  };

  const handleFlushCacheAndResync = () => {
    setIsResyncing(false);
    window.location.reload();
  };

  const filteredLogs = logsList.filter(log => {
    const term = logSearchQuery.toLowerCase();
    return (
      (log.formattedTime || '').toLowerCase().includes(term) ||
      (log.user || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.details || '').toLowerCase().includes(term)
    );
  });
  return (
    <div className="space-y-6 text-left select-none animate-fadeIn w-full max-w-5xl relative">
      <div>
        <span className="text-[10px] font-mono font-black tracking-widest text-rose-600 uppercase">System Diagnostics</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Terminal className="w-5 h-5 text-rose-600" /> Core Developer Terminal</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Sliders className="w-4 h-4 text-slate-700" /> Hardware Overrides</h4>
          <div className="space-y-3">
            
            <button type="button" onClick={handleToggleSystemLockdown} disabled={isTogglingLock} className={`w-full p-3 border border-dashed rounded-xl text-left flex items-center justify-between group transition cursor-pointer ${isLockedDown ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 hover:border-rose-400'}`}>
              <div>
                <p className={`text-xs font-black transition ${isLockedDown ? 'text-rose-600' : 'text-slate-800 group-hover:text-rose-600'}`}>{isLockedDown ? 'Release System Lockdown Mode' : 'Activate Portal wide Lockdown'}</p>
                <p className="text-[10px] text-slate-400 font-medium">Throws the complete web workspace environment into an absolute read-only shell layout.</p>
              </div>
              <ShieldX className={`w-4 h-4 transition ${isLockedDown ? 'text-rose-500 animate-pulse' : 'text-slate-400 group-hover:text-rose-500'}`} />
            </button>

            <div className="p-3 border border-dashed border-slate-200 rounded-xl flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-800">Mass Stock Scaling Multiplier</p>
                <p className="text-[10px] text-slate-400 font-medium">Multiplies the active stock totals across all inventory cards simultaneously.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input type="number" min="1" max="10" value={multiplyFactor} onChange={(e) => setMultiplyFactor(e.target.value)} className="w-10 p-1 border rounded-lg text-center font-mono text-xs font-black bg-slate-50 focus:outline-none" disabled={isMultiplying} />
                <button type="button" onClick={handleMassMultiplyInventory} disabled={isMultiplying} className="p-1.5 bg-slate-900 text-white font-black rounded-lg text-[10px] uppercase hover:bg-brand-primary transition cursor-pointer flex items-center gap-1"><Zap className="w-3 h-3" /> Scale</button>
              </div>
            </div>

            <button type="button" onClick={() => setIsLogOpen(true)} className="w-full p-3 border border-dashed border-slate-200 hover:border-teal-600 rounded-xl text-left flex items-center justify-between group transition cursor-pointer">
              <div><p className="text-xs font-black text-slate-800 transition group-hover:text-teal-600">Open Searchable System Audit Logs</p><p className="text-[10px] text-slate-400 font-medium">Launches a searchable overlay window modal mapping data modifications.</p></div>
              <FileText className="w-4 h-4 text-slate-400 group-hover:text-teal-500" />
            </button>

            <button type="button" onClick={handleFlushCacheAndResync} className="w-full p-3 border border-dashed border-slate-200 hover:border-brand-primary rounded-xl text-left flex items-center justify-between group transition cursor-pointer">
              <div><p className="text-xs font-black text-slate-800 transition group-hover:text-brand-primary">Flush Cache & Re-Sync Listener</p><p className="text-[10px] text-slate-400 font-medium">Wipes react local state caches and forces fresh explicit database connections.</p></div>
              <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-brand-primary" />
            </button>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-slate-700" /> Infrastructure Telemetry</h4>
          <div className="space-y-3 font-mono text-[11px] font-bold text-slate-500">
            <div className="flex items-center justify-between border-b pb-2"><span>Current Connected Session Rank:</span><span className="text-rose-600 font-black uppercase tracking-wider">{userRole} Slot</span></div>
            <div className="flex items-center justify-between border-b pb-2"><span>Database Read/Write Protocols:</span><span className="text-emerald-600 font-black">ONLINE (SSL SECURE)</span></div>
            <div className="flex items-center justify-between border-b pb-2"><span>Google Firebase Ping Latency:</span><span className={`font-black tracking-wider ${!latencyPing ? 'text-slate-400' : latencyPing > 250 ? 'text-amber-500' : 'text-emerald-600'}`}>{latencyPing ? `${latencyPing} MS` : 'MEASURING...'}</span></div>
            <div className="flex items-center justify-between pt-1"><span>System Status Threat Profile:</span><span className={`font-black flex items-center gap-1 ${isLockedDown ? 'text-rose-600' : 'text-slate-900'}`}><AlertTriangle className={`w-3.5 h-3.5 ${isLockedDown ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} /> {isLockedDown ? 'LOCKDOWN ACTIVE' : 'CLEAR'}</span></div>
          </div>
        </div>
      </div>

      {isLogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn text-xs">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col p-6 shadow-xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-4 mb-4 select-none shrink-0">
              <div className="text-left">
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal-600" /> System Action Audit Logs</h3>
                <p className="text-[10px] text-slate-400 font-medium">Real-time surveillance monitoring operations ledger.</p>
              </div>
              <button type="button" onClick={() => setIsLogOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Narrow down log history..." value={logSearchQuery} onChange={(e) => setLogSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-teal-600 font-medium text-slate-800" />
            </div>
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 font-black text-slate-500 select-none uppercase tracking-wider text-[9px] border-b sticky top-0 z-10">
                  <tr><th className="py-3 px-4 w-40">Timestamp</th><th className="py-3 px-4 w-56">User</th><th className="py-3 px-4">Action Operational Details</th></tr>
                </thead>
                <tbody className="divide-y text-slate-700 font-medium font-mono text-[11px]">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 text-slate-400 shrink-0 font-bold">{log.formattedTime}</td>
                      <td className="py-3 px-4 text-brand-primary font-bold break-all underline select-text">{log.user || 'SYSTEM'}</td>
                      <td className="py-3 px-4 text-slate-800 leading-normal select-text"><span className="bg-slate-100 text-slate-900 text-[10px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded-md border mr-2">{log.action}</span><span>{log.details || 'No extended string recorded.'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-sans font-bold uppercase tracking-wider"><AlertTriangle className="w-5 h-5 mx-auto text-slate-300 mb-2" /> No audit records found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
