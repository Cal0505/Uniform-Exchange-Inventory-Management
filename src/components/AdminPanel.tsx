import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { Users, Terminal, Shield, Trash2, Check, X, ShieldAlert, AlertCircle } from 'lucide-react';

interface AdminPanelProps {
  userRole: string;
  forcedSubTabOverride?: string;
}

export default function AdminPanel({
  userRole,
  forcedSubTabOverride
}: AdminPanelProps) {
  // 🧭 Local states for high-level facility staff administration panels
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form inputs for issuing manual user invitations
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Staff' | 'Admin'>('Staff');

  // Modal safety latch hooks for destructive admin actions
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

  // 📡 ROUTING FIX: Maps both 'staff' and 'manage_view' variants straight onto your user panel
  const currentAdminView = forcedSubTabOverride === 'dev' ? 'dev' : 'staff';
  const isDevUser = userRole === 'Dev' || userRole === 'dev';

  const showNotification = (type: 'error' | 'success', message: string) => {
    if (type === 'error') { setError(message); setTimeout(() => setError(null), 5000); }
    else { setSuccess(message); setTimeout(() => setSuccess(null), 3000); }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoadingStaff(true);
      const snap = await getDocs(collection(db, 'users'));
      setStaffUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) { showNotification('error', e.message); } 
    finally { setLoadingStaff(false); }
  };

  useEffect(() => {
    if (currentAdminView === 'staff') {
      fetchStaffUsers();
    }
  }, [currentAdminView, forcedSubTabOverride]);
  const handleAddStaffManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail.trim() || !newStaffName.trim()) {
      return showNotification('error', 'All validation fields are required to invite staff.');
    }
    try {
      await addDoc(collection(db, 'users'), {
        name: newStaffName.trim(),
        email: newStaffEmail.trim().toLowerCase(),
        role: newStaffRole,
        status: 'Active'
      });
      setNewStaffEmail(''); setNewStaffName('');
      showNotification('success', 'Staff credential profile issued successfully.');
      fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
      await updateDoc(doc(db, 'users', userId), { status: nextStatus });
      fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    try {
      const nextRole = currentRole === 'Admin' ? 'Staff' : 'Admin';
      await updateDoc(doc(db, 'users', userId), { role: nextRole });
      fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handlePermanentDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setUserToDelete(null);
      showNotification('success', 'User completely scrubbed from registry tables.');
      fetchStaffUsers();
    } catch (e: any) { showNotification('error', e.message); }
  };
  return (
    <div className="w-full text-left animate-fadeIn font-sans max-w-5xl space-y-6 relative">
      
      {/* 🔔 LIVE ACTION GLOBAL ALERT NOTIFICATION STRIPS */}
      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn"><AlertCircle className="w-4 h-4" /><span>{error}</span></div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn"><Check className="w-4 h-4" /><span>{success}</span></div>}

      {/* 👥 CANVAS AREA 1: HIGH-LEVEL FACILITY STAFF MANAGEMENT SHEET */}
      {currentAdminView === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs border-t-4 border-brand-teal">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4 text-brand-teal" /> Issue Staff Invite</h4>
            <form onSubmit={handleAddStaffManually} className="space-y-4 text-xs font-bold">
              <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Full User Name</label><input type="text" placeholder="e.g. Sarah Jenkins" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium text-slate-800" /></div>
              <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Email Address</label><input type="email" placeholder="sarah@uniformexchange.org" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} className="w-full p-2.5 border rounded-xl font-medium text-slate-800" /></div>
              <div><label className="block mb-1 text-[10px] font-black text-slate-500 uppercase tracking-wider">Clearance Privilege Level</label><select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as any)} className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-700"><option value="Staff">Warehouse Staff Picking Access</option><option value="Admin">Full System Manager Privileges</option></select></div>
              <button type="submit" className="w-full py-2.5 px-4 bg-brand-primary text-white font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition hover:brightness-105">Issue Credentials</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Active Staff Credentials Logs</h4>
            <div className="overflow-hidden border border-slate-100 bg-white rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 font-bold border-b text-slate-700 select-none"><tr><th className="px-4 py-3.5">User Identity Details</th><th className="px-4 py-3.5">System Role</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {staffUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/40 transition">
                      <td className="px-4 py-3.5 align-middle text-left font-black text-slate-900"><div className="space-y-0.5"><span>{user.name}</span><span className="block text-[10px] font-mono text-slate-400 font-medium">{user.email}</span></div></td>
                      <td className="px-4 py-3.5 align-middle"><button type="button" onClick={() => handleUpdateRole(user.id, user.role)} className="px-2 py-0.5 rounded text-[10px] font-mono font-black tracking-wider bg-slate-100 text-slate-700 border hover:bg-brand-primary hover:text-white transition cursor-pointer">{user.role || 'Staff'}</button></td>
                      <td className="px-4 py-3.5 align-middle"><span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{user.status || 'Active'}</span></td>
                      <td className="px-4 py-3.5 text-right align-middle space-x-1.5"><button type="button" onClick={() => handleToggleUserStatus(user.id, user.status)} className="text-[10px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer">{user.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}</button><button type="button" onClick={() => setUserToDelete({ id: user.id, email: user.email })} className="p-1 text-slate-400 hover:text-red-600 transition inline-block align-middle cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🧬 CANVAS AREA 2: CRITICAL SYSTEM DIAGNOSTICS */}
      {currentAdminView === 'dev' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs border-t-4 border-brand-orange space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b"><Terminal className="w-5 h-5 text-brand-orange shrink-0" /><h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Developer System Architecture Console</h3></div>
          {isDevUser ? (
            <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-dashed text-xs font-medium max-w-xl"><span className="block font-black text-brand-orange uppercase tracking-widest font-mono text-[10px]">🟢 Terminal Connection Security Verified</span><p className="text-slate-500 leading-relaxed">Your account token matches full root execution guidelines.</p></div>
          ) : (
            <div className="p-6 text-center text-slate-400 select-none space-y-2"><ShieldAlert className="w-8 h-8 mx-auto text-slate-300" /><span className="block text-xs font-black font-mono uppercase tracking-wider text-rose-600">🚫 Restricted Terminal Access Security Breach</span><p className="text-[11px] text-slate-400 max-w-sm mx-auto">Root development tools are restricted.</p></div>
          )}
        </div>
      )}

      {/* DETACHMENT DELETION WARNING POPUP LIGHTBOX PANEL MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs select-none">
          <div className="absolute inset-0" onClick={() => setUserToDelete(null)} />
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border overflow-hidden relative z-10 p-5 space-y-4 text-left animate-fadeIn">
            <div className="flex items-center gap-2 text-red-600 font-black text-sm uppercase tracking-wide"><Shield className="w-5 h-5 shrink-0" /><span>Revoke All Access</span></div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Are you sure you want to permanently delete this user?</p>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs font-bold text-slate-700 truncate">{userToDelete.email}</div>
            <div className="flex justify-end gap-2 pt-2 border-t text-xs font-bold"><button type="button" onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl cursor-pointer">Cancel</button><button type="button" onClick={handlePermanentDeleteUser} className="px-4 py-2 bg-red-600 text-white rounded-xl shadow-md cursor-pointer">Revoke Account</button></div>
          </div>
        </div>
      )}

    </div>
  );
}
