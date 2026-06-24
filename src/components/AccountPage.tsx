import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Shield, User, Mail, Lock, Check } from 'lucide-react';

interface AccountPageProps { userEmail: string; userRole: string; }

export default function AccountPage({ userEmail, userRole }: AccountPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(userEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [userDocId, setUserDocId] = useState('');
  const [saving, setSaving] = useState(false);

  // FETCH LIVE DATA MATCHING USER SESSION FROM FIRESTORE ON MOUNT
  useEffect(() => {
    const fetchLiveProfile = async () => {
      if (!userEmail) return;
      try {
        const q = query(collection(db, 'users'), where('email', '==', userEmail.toLowerCase().trim()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          // Lock in the unique document ID and active display name string
          setUserDocId(snap.docs[0].id);
          setName(snap.docs[0].data().name || 'Staff Member');
        }
      } catch (err) {
        console.error('Error connecting to user collection:', err);
      }
    };
    fetchLiveProfile();
  }, [userEmail]);

  // CORE WRITE ACTION: PUSH MODIFICATIONS LIVE TO CLOUD DOCUMENT
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');

    if (password && password !== confirmPassword) {
      setStatus('mismatch');
      return;
    }
    if (password && password.length < 6) {
      setStatus('short');
      return;
    }
    if (!userDocId) {
      setStatus('missing-doc');
      return;
    }

    setSaving(true);
    try {
      // Package up base updates
      const updatePayload: any = { name: name.trim() };
      
      // If they opted to alter their password text, append it to transaction payload
      if (password) {
        updatePayload.password = password;
      }

      // 1. Commit modifications to Cloud Firestore users collection
      await updateDoc(doc(db, 'users', userDocId), updatePayload);

      setStatus('success');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Profile transmission failed:', err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 font-sans">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Personal Account Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Modify your profile details and maintain security updates. Your role remains hard-locked.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        {status === 'success' && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-600">Profile metrics updated successfully inside live database!</div>}
        {status === 'mismatch' && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">Password confirmation values do not match. Please verify characters.</div>}
        {status === 'short' && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">Password must be at least 6 characters long.</div>}
        {status === 'missing-doc' && <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-600">Profile connection record not linked to active database documentation.</div>}
        {status === 'error' && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">Transmission error saving details to live cloud directory.</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-600">Display Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50" required disabled={saving} />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-600">Authorized Email Address</label>
            <input type="email" value={email} disabled className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-400 bg-slate-100 cursor-not-allowed outline-none" />
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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900" disabled={saving} />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900" disabled={saving} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 ml-auto">
          <Check className="w-4 h-4" /> 
          <span>{saving ? 'Saving...' : 'Save Account Modifications'}</span>
        </button>
      </form>
    </div>
  );
}
