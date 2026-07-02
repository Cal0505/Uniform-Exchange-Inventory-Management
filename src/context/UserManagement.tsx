import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Search, Trash2, User, Settings, Filter, Plus, X } from 'lucide-react';

interface UserManagementProps {
  userRole: string;
}

export default function UserManagement({ userRole }: UserManagementProps) {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [newRoleName, setNewRoleName] = useState('');

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubUsers(); unsubRoles(); };
  }, []);

  const handleApprove = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { status: 'Active' });
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    await addDoc(collection(db, 'roles'), { name: newRoleName.trim(), weight: 0 });
    setNewRoleName('');
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role || 'Staff');
    setEditStatus(user.status || 'Pending');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await updateDoc(doc(db, 'users', editingUser.id), { role: editRole, status: editStatus });
    setEditingUser(null);
  };

  const currentUserRoleObj = roles.find(r => r.name.toLowerCase() === userRole?.toLowerCase());
  const currentUserWeight = currentUserRoleObj ? Number(currentUserRoleObj.weight || 0) : 0;
  const sortedRoles = [...roles].sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0));

  const filteredUsers = usersList.filter(user => {
    const matchesSearch = (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="w-full text-left font-sans pl-2 pr-6 py-4 space-y-6 relative select-none animate-fadeIn">
      <div>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">Manage Staff</h2>
        <p className="text-[11px] font-medium text-slate-400 mt-1">Oversee user configurations, modify system role hierarchy authority levels, and handle pending approvals.</p>
      </div>

      <div className="bg-white border p-4 rounded-xl flex flex-wrap gap-3 items-center shadow-sm">
        <Search className="w-5 h-5 text-slate-400" />
        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-[200px] p-2 border rounded-lg text-sm focus:outline-none focus:border-slate-400" />
        <Filter className="w-5 h-5 text-slate-400 ml-4 hidden sm:block" />
        <select onChange={(e) => setRoleFilter(e.target.value)} className="p-2 border rounded-lg min-w-[120px] text-sm bg-white">
          <option value="ALL">All Roles</option>
          {sortedRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
        <select onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border rounded-lg min-w-[120px] text-sm bg-white">
          <option value="ALL">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Role Manager */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h4 className="font-bold uppercase mb-1 flex items-center gap-2 text-slate-900 text-sm"><Settings size={16}/> Role Manager</h4>
            <div className="space-y-1 mb-4 max-h-60 overflow-y-auto pr-1">
              {sortedRoles.map(r => {
                const canEditRole = currentUserWeight > Number(r.weight || 0);
                return (
                  <div key={r.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm font-bold text-slate-700">{r.name}</span>
                    <input type="number" defaultValue={r.weight} disabled={!canEditRole} className={`w-12 border rounded p-1 text-center text-sm ${canEditRole ? 'bg-white' : 'bg-slate-50'}`}
                      onBlur={(e) => {
                        const newWeight = Number(e.target.value);
                        if (newWeight < currentUserWeight) updateDoc(doc(db, 'roles', r.id), { weight: newWeight });
                        else { e.target.value = String(r.weight); alert("Security: Cannot assign weight >= your own."); }
                      }} 
                    />
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleAddRole} className="flex gap-2 pt-4 border-t border-slate-100">
              <input type="text" placeholder="New Role..." value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" />
              <button type="submit" className="bg-slate-900 text-white p-2 rounded-lg"><Plus size={18} /></button>
            </form>
          </div>
        </div>

        {/* Staff ID Badges */}
        <div className="flex-1 flex flex-wrap gap-6 justify-start items-start w-full">
          {filteredUsers.map(user => {
            const targetUserRoleObj = roles.find(r => r.name.toLowerCase() === user.role?.toLowerCase());
            const targetUserWeight = targetUserRoleObj ? Number(targetUserRoleObj.weight || 0) : 0;
            const canEdit = currentUserWeight > targetUserWeight;

            return (
              <div key={user.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4 w-full sm:w-[380px] shrink-0">
                <div className="border-[1.5px] border-black bg-white p-3 flex gap-4 relative">
                  <div className="w-24 h-32 border-4 border-[#e25822] bg-orange-50 shrink-0 flex items-center justify-center">
                    <User className="w-12 h-12 text-[#e25822]" />
                  </div>
                  <div className="flex flex-col justify-between flex-1 py-1">
                    <div className="flex gap-3 items-start"><img src="/The_King's_Awardlogo.png" className="w-14 h-14 object-contain" alt="K" /><img src="/Uniform_Exchange.png" className="w-20 h-12 object-contain mt-1" alt="UE" /></div>
                    <div className="flex flex-col mt-2"><h5 className="font-extrabold text-[22px] text-[#3ca4d8] truncate">{user.displayName}</h5>
                    <p className="text-[#e25822] font-bold text-[15px]">{user.role}</p></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-auto">{user.status}</span>
                  {(user.status === 'Pending' || user.status === 'Suspended') && canEdit && (
                    <button onClick={() => handleApprove(user.id)} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg font-black text-[11px] uppercase">Approve</button>
                  )}
                  <button onClick={() => canEdit && handleOpenEdit(user)} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-black text-[11px] uppercase">Edit</button>
                  <button onClick={() => canEdit && window.confirm('Delete?') && deleteDoc(doc(db, 'users', user.id))} className="bg-rose-50 text-rose-600 px-3 py-2 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-extrabold text-lg mb-4">Edit User</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full p-2 border rounded-xl text-sm">
                {sortedRoles.filter(r => Number(r.weight || 0) < currentUserWeight).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-2 border rounded-xl text-sm">
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-slate-100 py-2 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}