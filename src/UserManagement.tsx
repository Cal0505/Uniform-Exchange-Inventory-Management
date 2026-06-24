import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { User, Plus, Trash2, Shield, UserCheck, Mail, Clock, Check, X } from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  role: string;
  name: string;
  active: boolean;
  password?: string;
  isMasterDev?: boolean; // Tag to lock your master card
}

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  password?: string;
  message: string;
  status: string;
  timestamp: any;
}

export default function UserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'User'>('User');
  const [loading, setLoading] = useState(true);

  // Sync users and pending requests from Firestore in real-time
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const items: StaffUser[] = [];
      
      // 1. Ingest your bulletproof Master Dev card right at the top
      items.push({
        id: 'master-dev-id',
        name: 'Carl Hurles (System Creator)',
        email: 'carlhurles28@gmail.com',
        role: 'Dev',
        active: true,
        isMasterDev: true // Locked status
      });

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.email !== 'carlhurles28@gmail.com') {
          items.push({ id: doc.id, ...data } as StaffUser);
        }
      });
      
      // Sort subsequent entries alphabetically while keeping your card anchored
      setUsers([items[0], ...items.slice(1).sort((a, b) => a.name.localeCompare(b.name))]);
    });

    const unsubRequests = onSnapshot(collection(db, 'user_requests'), (snapshot) => {
      const items: AccessRequest[] = [];
      snapshot.forEach((doc) => { 
        const data = doc.data();
        if (data.status === 'pending' && data.email !== 'carlhurles28@gmail.com') {
          items.push({ id: doc.id, ...data } as AccessRequest); 
        }
      });
      setRequests(items.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
      setLoading(false);
    });

    return () => { unsubUsers(); unsubRequests(); };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;
    try {
      await addDoc(collection(db, 'users'), {
        email: newEmail.trim().toLowerCase(),
        name: newName.trim(),
        password: newPassword, 
        role: newRole,
        active: true,
        createdAt: serverTimestamp()
      });
      setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('User');
    } catch (err) { console.error(err); }
  };

  const handleApproveRequest = (req: AccessRequest) => {
    setNewName(req.name);
    setNewEmail(req.email);
    setNewPassword(req.password || ''); 
    updateDoc(doc(db, 'user_requests', req.id), { status: 'approved' });
  };

  const handleRejectRequest = (requestId: string) => {
    if (window.confirm("Reject and remove this sign-up request?")) {
      deleteDoc(doc(db, 'user_requests', requestId));
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (userId === 'master-dev-id') return; // Master protection stop
    updateDoc(doc(db, 'users', userId), { active: !currentStatus });
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    if (userId === 'master-dev-id') return; // Master protection stop
    updateDoc(doc(db, 'users', userId), { role: currentRole === 'Admin' ? 'User' : 'Admin' });
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === 'master-dev-id') return; // Master protection stop
    if (window.confirm("Permanently revoke this staff member's access?")) {
      deleteDoc(doc(db, 'users', userId));
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500 font-medium">Loading records...</div>;
  return (
    <div className="space-y-6">
      {/* HEADER ROW */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Staff Directory & Access Manager</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review pending signup applications and control team administrative permissions.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl">{users.length} Active Staff</span>
          {requests.length > 0 && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl animate-pulse">
              {requests.length} Pending Requests
            </span>
          )}
        </div>
      </div>

      {/* PENDING REQUESTS ALERTS DRAWER */}
      {requests.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-100 p-6 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2"><Clock className="w-4 h-4" /><span>Incoming Access Requests</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{req.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{req.email}</p>
                  <p className="text-xs text-slate-600 italic mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">"{req.message || 'Requesting staff system access.'}"</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleApproveRequest(req)} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all" title="Review credentials"><Check className="w-4 h-4" /></button>
                  <button onClick={() => handleRejectRequest(req.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all" title="Dismiss request"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADD / COMPLETE ACCOUNT FORM */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /><span>Register Staff Account</span></h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Full Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" required />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Email Address</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="staff@uniformexchange.org" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" required />
            </div>
            
            <input type="hidden" value={newPassword} />

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">System Permission Level</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'Admin' | 'User')} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900">
                <option value="User">Standard User (Stock Entry Only)</option>
                <option value="Admin">System Administrator (Full Settings Control)</option>
              </select>
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md"><Plus className="w-4 h-4" /><span>Confirm Registry</span></button>
          </form>
        </div>

        {/* STAFF ID CARDS LAYOUT GRID */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
          {users.map((user) => (
            <div key={user.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4 group hover:border-slate-200 transition-all relative overflow-hidden">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-slate-900 text-base truncate">{user.name}</div>
                  
                  {!user.isMasterDev && (
                    <button onClick={() => handleDeleteUser(user.id)} className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all absolute top-4 right-4"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5 text-slate-400" />{user.email}</div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                <button 
                  type="button" 
                  onClick={() => !user.isMasterDev && handleToggleRole(user.id, user.role)} 
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    user.role === 'Dev' 
                      ? 'bg-blue-50 border-blue-100 text-blue-700 font-extrabold cursor-default' 
                      : user.role === 'Admin' 
                        ? 'bg-purple-50 border-purple-100 text-purple-700' 
                        : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`} 
                  title={user.isMasterDev ? "System Creator lock" : "Click to flip authority rank"}
                >
                  <Shield className="w-3 h-3 inline mr-1" />
                  {user.role}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => !user.isMasterDev && handleToggleActive(user.id, user.active)} 
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    user.isMasterDev 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-extrabold cursor-default' 
                      : user.active 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                        : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`} 
                  title={user.isMasterDev ? "System Creator lock" : "Click to switch access permissions"}
                >
                  <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                  {user.active ? 'Active' : 'Suspended'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
