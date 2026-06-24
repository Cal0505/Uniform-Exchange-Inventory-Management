import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Shirt, Eye, EyeOff, Send } from 'lucide-react';

interface LoginScreenProps {
  emailInput: string; setEmailInput: (val: string) => void;
  passwordInput: string; setPasswordInput: (val: string) => void;
  loginError: string; showPassword: boolean; setShowPassword: (val: boolean) => void;
  handleLogin: () => void;
}

export default function LoginScreen({
  emailInput, setEmailInput, passwordInput, setPasswordInput,
  loginError, showPassword, setShowPassword, handleLogin
}: LoginScreenProps) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requestStatus, setRequestStatus] = useState('');

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim() || !requestEmail.trim()) return;
    try {
      await addDoc(collection(db, 'user_requests'), {
        name: requestName.trim(),
        email: requestEmail.trim().toLowerCase(),
        note: requestNote.trim(),
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setRequestStatus('success');
      setRequestName(''); setRequestEmail(''); setRequestNote('');
    } catch (err) {
      setRequestStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md"><Shirt className="w-8 h-8" /></div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center">Uniform Exchange Hub</h2>
          <p className="text-xs text-slate-500 text-center">Warehouse Inventory Stock Manager Login</p>
        </div>
        
        {!showRequestForm ? (
          <div className="space-y-4">
            {loginError && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">{loginError}</div>}
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-700">Email Address</label>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="enter your email" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <button onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10">Sign In</button>
            <button onClick={() => setShowRequestForm(true)} className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 mt-2 block transition-all">Don't have an account? Request access here</button>
          </div>
        ) : (
          <form onSubmit={handleAccessRequest} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Submit Access Request</h3>
            {requestStatus === 'success' && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-600">Request submitted! The admin team will review it.</div>}
            {requestStatus === 'error' && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">Submission failed. Try again.</div>}
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Your Full Name</label>
              <input type="text" value={requestName} onChange={(e) => setRequestName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900" required />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Your Email Address</label>
              <input type="email" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900" required />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-600">Reason / Department</label>
              <textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="e.g. Warehouse intake assistant" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 h-16" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Submit Request</button>
            <button type="button" onClick={() => { setShowRequestForm(false); setRequestStatus(''); }} className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 mt-1 block">Back to Sign In</button>
          </form>
        )}
      </div>
    </div>
  );
}
