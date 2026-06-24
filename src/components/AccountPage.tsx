import React, { useState } from 'react';
import { Shield, User, Mail, Lock, Check } from 'lucide-react';

interface AccountPageProps { userEmail: string; userRole: string; }

export default function AccountPage({ userEmail, userRole }: AccountPageProps) {
  const [name, setName] = useState('Staff Member');
  const [email, setEmail] = useState(userEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setStatus('mismatch'); return;
    }
    setStatus('success');
    setPassword(''); setConfirmPassword('');
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 font-sans">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Personal Account Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Modify your profile details and maintain security updates. Your role remains hard-locked.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        {status === 'success' && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-600">Profile metrics updated successfully inside local cache!</div>}
        {status === 'mismatch' && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">Password confirmation values do not match. Please verify characters.</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-600">Display Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50" required />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-600">Authorized Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50" required />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <div>
              <p className="text-xs font-bold text-slate-800">Your Current System Role Permission</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Modifiable exclusively by senior administration personnel.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-extrabold rounded-full border border-purple-100 uppercase tracking-wider">{userRole}</span>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-slate-400" /> Change Private Password</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900" />
            </div>
          </div>
        </div>

        <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 ml-auto"><Check className="w-4 h-4" /> Save Account Modifications</button>
      </form>
    </div>
  );
}
