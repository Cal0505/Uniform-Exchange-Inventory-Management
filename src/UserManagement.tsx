import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { User, Plus, Trash2, Shield, UserCheck, Mail } from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  role: 'Admin' | 'User';
  name: string;
  active: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'User'>('User');
  const [loading, setLoading] = useState(true);

  // Synchronize user list from Firestore in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const items: StaffUser[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as StaffUser);
      });
      setUsers(items.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
    });
    return () => unsub();
  }, []);

  // Action: Add a new user to the Firestore database
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    try {
      await addDoc(collection(db, 'users'), {
        email: newEmail.trim().toLowerCase(),
        name: newName.trim(),
        role: newRole,
        active: true,
        createdAt: serverTimestamp()
      });
      setNewEmail('');
      setNewName('');
      setNewRole('User');
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  // Action: Toggle user active status
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { active: !currentStatus });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Action: Change user role
  const handleToggleRole = async (userId: string, currentRole: 'Admin' | 'User') => {
    const nextRole = currentRole === 'Admin' ? 'User' : 'Admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: nextRole });
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  // Action: Delete a user
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this user's app access?")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };
  if (loading) {
    return <div className="p-6 text-sm text-slate-500 font-medium">Loading user database...</div>;
  }

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Staff Account Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage app permissions, administrative roles, and warehouse system access controls.</p>
        </div>
        <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl self-start md:self-auto">
          {users.length} Registered Personnel
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADD USER FORM PANEL */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add New Staff Member</span>
          </h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Full Name</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Email Address</label>
              <input 
                type="email" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@uniformexchange.org"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Initial System Role</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'Admin' | 'User')}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="User">Standard User (Stock Changes Only)</option>
                <option value="Admin">Administrator (Full System Control)</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Register Account</span>
            </button>
          </form>
        </div>

        {/* INTERACTIVE DATA TABLE */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-500">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100">
                <tr>
                  <th scope="col" className="px-6 py-4">Staff Member</th>
                  <th scope="col" className="px-6 py-4">Role</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4 className text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleRole(user.id, user.role)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                          user.role === 'Admin' 
                            ? 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100' 
                            : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Click to switch role"
                      >
                        <Shield className="w-3 h-3" />
                        <span>{user.role}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user.id, user.active)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                          user.active 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'
                        }`}
                        title="Click to toggle account access"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>{user.active ? 'Active' : 'Suspended'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all"
                        title="Permanently remove staff record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-sm text-slate-400 font-medium">
                      No staff accounts found. Use the submission panel to register teams.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
