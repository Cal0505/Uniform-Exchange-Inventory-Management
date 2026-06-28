import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Users, UserPlus, Search, Filter, Shield, ShieldAlert, Check, X, Loader2, ShieldCheck, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';

interface UserManagementProps {
  userRole: string; // 📡 PIPED DIRECTLY FROM THE CORE ROUTER SESSION
}

export default function UserManagement({ userRole }: UserManagementProps) {
  // Real-time Firestore streaming array tracking states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // SEARCH AND DECK MULTI-SELECT OPTION FILTERS VIEW STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // FORM CONTROLS FOR INSCRIBING NEW STAFF ACCOUNTS (The Manual Whitelist)
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Staff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronise your live database collections streams
  useEffect(() => {
    // Stream 1: Listen live to the master accounts directory pool
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Stream 2: Listen live ONLY to pending access requests from gate-crashers
    const qRequests = query(collection(db, 'user_requests'), where('status', '==', 'pending'));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      setPendingRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubUsers(); unsubRequests(); };
  }, []);
  // ➕ OPERATION A: INSCRIBE A MANUALLY WHITELISTED PENDING USER OVERRIDE ROW
  const handleRegisterStaffWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formEmail.trim().toLowerCase();
    const cleanName = formName.trim();

    if (!cleanEmail || !cleanName) {
      alert("Validation Error: Please populate both Name and Email parameters.");
      return;
    }

    try {
      setIsSubmitting(true);

      const qCheck = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snapCheck = await getDocs(qCheck);
      if (!snapCheck.empty) {
        alert("Operation Blocked: A credential layout card matching this email already exists inside your system registries.");
        setIsSubmitting(false);
        return;
      }

      // Manual whitelist inserts an account as 'Pending Setup' with NO password text string
      await addDoc(collection(db, 'users'), {
        name: cleanName,
        email: cleanEmail,
        password: '', 
        role: formRole,
        status: 'Pending Setup' 
      });

      setFormName(''); setFormEmail(''); setFormRole('Staff');
      alert("Success: Staff member has been whitelisted! Their card will display as 'Pending Setup' until they activate it.");
    } catch (err) { console.error("Whitelist inscription dropped:", err); }
    finally { setIsSubmitting(false); }
  };

  // Helper function to map roles to numeric hierarchy weights for rock-solid security evaluations
  const getRoleWeight = (roleStr: string): number => {
    const clean = (roleStr || '').toLowerCase();
    if (clean === 'master_dev') return 4;
    if (clean === 'dev') return 3;
    if (clean === 'admin') return 2;
    return 1; // Default 'Staff' tier weight
  };
  // 🔄 OPERATION B: MUTATE AND SWAP USER SUSPENSION VISUAL BADGES STATES
  const handleToggleUserSuspension = async (userId: string, currentStatus: string, targetRole: string) => {
    const actorWeight = getRoleWeight(userRole);
    const targetWeight = getRoleWeight(targetRole);

    // 🔒 BOUNDARY GUARD: Actor weight must be strictly higher than the target weight layer
    if (actorWeight <= targetWeight) {
      alert("Hierarchy Violation: Your clearance level does not permit modifying this account's operational state.");
      return;
    }

    try {
      const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
      await updateDoc(doc(db, 'users', userId), { status: nextStatus });
    } catch (err) { console.error("Privileges swap write blocked:", err); }
  };

  // 🛡️ SECURITY HIERARCHY ENGINE: Dynamic dropdown role mutation controller
  const handleUpdateUserRole = async (userId: string, targetRole: string, currentRole: string) => {
    const actorWeight = getRoleWeight(userRole);
    const currentTargetWeight = getRoleWeight(currentRole);
    const desiredTargetWeight = getRoleWeight(targetRole);

    // 🔒 GUARD 1: You cannot modify an account whose rank is ALREADY equal to or higher than yours
    if (actorWeight <= currentTargetWeight) {
      alert("Hierarchy Violation: Access denied. This profile belongs to an equal or superior privilege layer.");
      return;
    }

    // 🔒 GUARD 2: You can promote right up to your own rank level (actorWeight >= desiredTargetWeight), but NEVER strictly above it!
    if (actorWeight < desiredTargetWeight) {
      alert("Hierarchy Violation: Access denied. You cannot elevate a profile higher than your own rank tier.");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { role: targetRole });
    } catch (err) { console.error("Cloud hierarchy write failed:", err); }
  };

  // ✅ UNIQUE NON-DESTRUCTIVE APPROVAL: Flips status to Active without touching the password field
  const handleDirectApproveUserStatus = async (userId: string, userEmail: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'Active' // Strictly mutates the status string only!
      });
      alert(`Access Activated: ${userEmail} is now fully Active. Their custom password was not altered.`);
    } catch (err) { console.error("Direct account status approval blocked:", err); }
  };
  const handlePermanentDeleteUser = async (userId: string, userName: string, targetRole: string) => {
    const actorWeight = getRoleWeight(userRole);
    const targetWeight = getRoleWeight(targetRole);

    if (actorWeight <= targetWeight) {
      alert("Hierarchy Violation: Access denied. You do not possess structural clearance to erase this profile.");
      return;
    }

    if (!window.confirm(`Security Overwrite Check: Are you absolutely sure you want to permanently scrub "${userName}" from your database systems access registries?`)) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) { console.error("Account erasure drop blocked:", err); }
  };

  // ✅ OPERATION C: APPROVE OUTSIDER ACCESS APPLICATIONS AND PRESERVE ACCOUNT PASSWORD PERFECTLY
  const handleApproveAccessRequest = async (requestObj: any) => {
    try {
      const fallbackName = requestObj.email.split('@').toUpperCase();
      const userEnteredPassword = requestObj.password || '';

      if (!userEnteredPassword) {
        alert("Security Warning: No requested password was detected inside this document schema.");
      }

      await addDoc(collection(db, 'users'), {
        name: requestObj.name || fallbackName,
        email: requestObj.email.toLowerCase(),
        password: userEnteredPassword, 
        role: 'Staff', 
        status: 'Active' 
      });

      await deleteDoc(doc(db, 'user_requests', requestObj.id));
      alert(`Access Granted: ${requestObj.email} has been approved using their own private custom password credentials.`);
    } catch (err) { console.error("Approval state pipeline broken:", err); }
  };

  const handleRejectAccessRequest = async (requestId: string) => {
    if (!window.confirm("Action Confirm: Are you sure you want to dismiss and delete this system access application ticket?")) return;
    try {
      await deleteDoc(doc(db, 'user_requests', requestId));
    } catch (err) { console.error("Rejection document write failed:", err); }
  };

  // 📡 THE COMBINED MULTI-FILTER SCANNER CALCULATOR ENGINE ROW GRID DATA
  const filteredStaffCards = usersList.filter(user => {
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });
  return (
    <div className="space-y-6 text-left font-sans w-full max-w-5xl select-none">
      
      {/* 🚨 APPLICATION ACCESS REQUEST ALERTS NOTIFICATION TOP SHELF CARD */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2 animate-fadeIn">
          <span className="text-[10px] font-mono font-black tracking-widest text-amber-600 uppercase">Incoming Sign-Up Application Stream</span>
          {pendingRequests.map(req => (
            <div key={req.id} className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1 text-left">
                <p className="text-xs font-black text-slate-900 leading-tight flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" /><span>New Access Request Filed: <span className="underline text-brand-primary">{req.email}</span></span></p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic max-w-xl">"{req.message || 'No introduction text supplied.'}"</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => handleApproveAccessRequest(req)} className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1 text-[10px] font-black uppercase tracking-wider cursor-pointer"><Check className="w-3.5 h-3.5" /> Approve</button>
                <button type="button" onClick={() => handleRejectAccessRequest(req.id)} className="p-2 bg-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔍 SEARCH ENGINE AND MULTI-SELECT DROPDOWNS CONTROLS LAYOUT BAR CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 w-full items-stretch md:items-center">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search team directories, emails, or name strings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs focus:outline-none focus:border-brand-primary font-medium" /></div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="p-2 border rounded-xl text-xs bg-slate-50 text-slate-600 font-bold focus:outline-none focus:border-brand-primary">
            <option value="ALL">👔 Filter Clearance</option>
            <option value="Staff">Warehouse Staff</option>
            <option value="Admin">Administrators</option>
            <option value="Dev">Developers</option>
            <option value="Master_Dev">Master Devs</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border rounded-xl text-xs bg-slate-50 text-slate-600 font-bold focus:outline-none focus:border-brand-primary">
            <option value="ALL">🟢 Filter Statuses</option>
            <option value="Active">Active Users</option>
            <option value="Pending Setup">Pending Setup</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        
        {/* ==========================================================
            📍 LANDMARK: WHITELIST REGISTRATION ENTRY FORM SECTION 
           ========================================================== */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs border-t-4 border-brand-teal space-y-4">
          <div className="space-y-0.5"><span className="text-[9px] font-mono font-black text-brand-teal uppercase tracking-widest">Inbound Authorization</span><h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-brand-teal" /> Register Staff Account</h4></div>
          <form onSubmit={handleRegisterStaffWhitelist} className="space-y-4 text-xs font-bold">
            <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Full Worker Name</label><input type="text" placeholder="e.g. Sarah Jenkins" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium text-slate-800" disabled={isSubmitting} /></div>
            <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Email Address</label><input type="email" placeholder="staff@uniformexchange.org" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium text-slate-800" disabled={isSubmitting} /></div>
            <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Privilege Clearance Tier</label><select value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-slate-700 font-bold"><option value="Staff">Standard User (Stock Entry Only)</option><option value="Admin">Full System Manager Privileges</option></select></div>
            <button type="submit" disabled={isSubmitting} className="w-full py-2.5 px-4 bg-brand-primary text-white font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition hover:brightness-105 flex items-center justify-center gap-1">{isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}<span>Confirm Registry</span></button>
          </form>
        </div>
        {/* ==========================================================
            📍 LANDMARK: EMPLOYEE DIRECTORY CARD LOOP RENDERER 
           ========================================================== */}
        <div className="lg:col-span-2 space-y-4 w-full">
          <div className="flex items-center justify-between px-1 select-none"><h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Active Staff Members Directory</h4><span className="text-[10px] font-mono bg-slate-100 font-bold text-slate-500 px-2.5 py-0.5 rounded-full">{filteredStaffCards.length} Members Listed</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {filteredStaffCards.map(user => {
              const displayInitials = (user.name || 'U').substring(0, 2).toUpperCase();
              const actorWeight = getRoleWeight(userRole);
              const targetWeight = getRoleWeight(user.role);
              
              return (
                <div key={user.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 relative animate-fadeIn group hover:border-slate-300 transition duration-150">
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-10 h-10 bg-brand-primary/10 rounded-2xl flex items-center justify-center font-mono font-black text-sm text-brand-primary shrink-0 group-hover:scale-105 transition-transform">{displayInitials}</div>
                    <div className="space-y-0.5 truncate flex-1"><h5 className="font-black text-slate-900 text-sm truncate">{user.name || 'Anonymous User'}</h5><span className="block text-[10px] font-mono text-slate-400 font-medium truncate">{user.email}</span></div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 mt-1 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      
                      {/* 🛡️ SECURITY HIERARCHY SELECTOR DROPDOWN */}
                      {user.role === 'Master_Dev' ? (
                        <span className="bg-slate-900 border border-slate-950 text-amber-400 font-mono text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs animate-pulse">👑 Master Dev</span>
                      ) : actorWeight <= targetWeight ? (
                        <span className="bg-slate-100 border text-slate-500 font-mono text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md flex items-center gap-1">🔒 {user.role || 'Staff'}</span>
                      ) : (
                        <select value={user.role || 'Staff'} onChange={(e) => handleUpdateUserRole(user.id, e.target.value, user.role)} className="bg-white border border-slate-200 text-brand-primary font-mono text-[9px] font-black tracking-wider uppercase px-1 py-0.5 rounded-md focus:outline-none focus:border-brand-primary cursor-pointer font-bold">
                          <option value="Staff">Staff</option>
                          {/* Admin (Weight 2) and higher can assign Admin */}
                          {actorWeight >= 2 && <option value="Admin">Admin</option>}
                          {/* Dev (Weight 3) and higher can assign Dev */}
                          {actorWeight >= 3 && <option value="Dev">Dev</option>}
                          {/* Master_Dev (Weight 4) can assign Master Dev */}
                          {actorWeight === 4 && <option value="Master_Dev">Master Dev</option>}
                        </select>
                      )}

                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono tracking-wider font-extrabold uppercase ${user.status === 'Suspended' ? 'bg-rose-50 text-rose-600 border border-rose-100' : (user.status || '').toLowerCase().includes('pend') ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{user.status || 'Active'}</span>
                    </div>
                    {actorWeight > targetWeight && (
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                        {(user.status || '').toLowerCase().includes('pend') ? (
                          user.password ? (<button type="button" onClick={() => handleDirectApproveUserStatus(user.id, user.email)} className="text-emerald-600 font-black uppercase tracking-wider underline cursor-pointer transition">Approve Account</button>) : (<span className="text-amber-500 font-mono text-[8px] uppercase font-black tracking-wider animate-pulse">Awaiting Activation</span>)
                        ) : (
                          <button type="button" onClick={() => handleToggleUserSuspension(user.id, user.status, user.role)} className="hover:text-slate-900 underline cursor-pointer transition">{user.status === 'Suspended' ? 'Activate' : 'Suspend'}</button>
                        )}
                        <button type="button" onClick={() => handlePermanentDeleteUser(user.id, user.name, user.role)} className="text-slate-300 hover:text-rose-600 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredStaffCards.length === 0 && (
              <div className="col-span-full bg-white border border-dashed rounded-3xl py-12 text-center text-slate-400 select-none"><AlertTriangle className="w-6 h-6 mx-auto text-slate-300 mb-2" /><span className="block text-xs font-mono font-black uppercase tracking-wider">No matching profiles logged under this filter selection.</span></div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
