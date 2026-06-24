import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { User, Plus, Trash2, Shield, UserCheck, Mail, Inbox, Check, X } from 'lucide-react';

interface StaffUser { id: string; email: string; role: 'Admin' | 'User'; name: string; active: boolean; signupToken?: string; }
interface RequestUser { id: string; name: string; email: string; note: string; status: 'pending' | 'granted' | 'rejected'; }

export default function UserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [requests, setRequests] = useState<RequestUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'User'>('User');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const items: StaffUser[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as StaffUser));
      setUsers(items.sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubReqs = onSnapshot(collection(db, 'user_requests'), (snap) => {
      const items: RequestUser[] = []; snap.forEach((d) => items.push({ id: d.id, ...d.data() } as RequestUser));
      setRequests(items.filter(r => r.status === 'pending'));
    });
    return () => { unsubUsers(); unsubReqs(); };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;
    try {
      await addDoc(collection(db, 'users'), {
        email: newEmail.trim().toLowerCase(), name: newName.trim(), role: newRole, active: true, signupToken: 'setup_pending', createdAt: serverTimestamp()
      });
      setNewEmail(''); setNewName(''); setShowAddModal(false);
    } catch (err) { console.error(err); }
  };

  const handleGrantRequest = async (req: RequestUser) => {
    try {
      await addDoc(collection(db, 'users'), {
        email: req.email, name: req.name, role: 'User', active: true, signupToken: 'setup_pending', createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'user_requests', req.id), { status: 'granted' });
    } catch (err) { console.error(err); }
  };

  const handleRejectRequest = async (id: string) => {
    try { await updateDoc(doc(db, 'user_requests', id), { status: 'rejected' }); } catch (err) { console.error(err); }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try { await updateDoc(doc(db, 'users', id), { active: !current }); } catch (err) { console.error(err); }
  };

  const handleToggleRole = async (id: string, current: 'Admin' | 'User') => {
    try { await updateDoc(doc(db, 'users', id), { role: current === 'Admin' ? 'User' : 'Admin' }); } catch (err) { console.error(err); }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("Permanently revoke app authorization?")) { try { await deleteDoc(doc(db, 'users', id)); } catch (err) { console.error(err); } }
  };

  return (
    <div className="space-y-6">
      {/* ACCESS REQUEST QUEUE */}
      {requests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2"><Inbox className="w-4 h-4 text-amber-700" /> Pending Entry Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{req.name}</h4>
                  <p className="text-xs text-slate-500">{req.email}</p>
                  {req.note && <p className="text-xs italic text-slate-400 mt-1">"{req.note}"</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleGrantRequest(req)} className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleRejectRequest(req.id)} className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEADER SECTION WITH ADD STAFF MODAL BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Account Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Passwords are securely encrypted out of visibility. Admins manage system roles and tokens.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Manual Staff</button>
      </div>

      {/* STAFF ID CARDS CONTAINER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map((u) => (
          <div key={u.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden">
            {u.signupToken === 'setup_pending' && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-extrabold px-3 py-1 uppercase tracking-widest rounded-bl-xl animate-pulse">Setup Pending</div>}
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">{u.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => handleToggleRole(u.id, u.role)} className={`px-2.5 py-1 text-[11px] font-bold rounded-full border flex items-center gap-1 transition-all ${u.role === 'Admin' ? 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}><Shield className="w-3 h-3" /> {u.role}</button>
                <button onClick={() => handleToggleActive(u.id, u.active)} className={`px-2.5 py-1 text-[11px] font-bold rounded-full border flex items-center gap-1 transition-all ${u.active ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'}`}><UserCheck className="w-3 h-3" /> {u.active ? 'Active' : 'Suspended'}</button>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-50 mt-4 pt-3">
              <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* POPUP SELECTION MODAL BLOCK */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form onSubmit={handleAddUser} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Add Staff Profile</h3>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Full Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900" required />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Email Address</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900" required />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'Admin' | 'User')} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white">
                <option value="User">User (Read/Write Stock)</option>
                <option value="Admin">Admin (Full Control)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs">Cancel</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md">Register Staff</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
