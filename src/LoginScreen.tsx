import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Shirt, Eye, EyeOff, ArrowLeft, CheckCircle, Send } from 'lucide-react';

interface LoginScreenProps {
  emailInput: string; setEmailInput: (v: string) => void;
  passwordInput: string; setPasswordInput: (v: string) => void;
  loginError: string; showPassword: boolean; setShowPassword: (v: boolean) => void;
  handleLogin: () => void; showContactForm: boolean; setShowContactForm: (v: boolean) => void;
  contactMessage: string; setContactMessage: (v: string) => void; handleSendMessage: () => void;
}

export default function LoginScreen({
  emailInput, setEmailInput, passwordInput, setPasswordInput, loginError,
  showPassword, setShowPassword, handleLogin, showContactForm, setShowContactForm,
  contactMessage, setContactMessage, handleSendMessage
}: LoginScreenProps) {
  const [view, setView] = useState<'login' | 'request' | 'activate'>('login');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg('');
    try {
      const q = query(collection(db, 'users'), where('email', '==', reqEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) { setErrorMsg('Account already approved. Run First-Time Activation.'); return; }
      await addDoc(collection(db, 'user_requests'), {
        name: reqName.trim(), email: reqEmail.trim().toLowerCase(), message: reqNotes.trim(), status: 'pending', timestamp: serverTimestamp()
      });
      setSuccess(true); setTimeout(() => { setView('login'); setSuccess(false); setReqName(''); setReqEmail(''); setReqNotes(''); }, 2000);
    } catch (err) { setErrorMsg('Submission error. Check your network configuration.'); }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg('');
    const targetEmail = reqEmail.trim().toLowerCase();
    if (passwordInput !== reqNotes) { setErrorMsg('Passwords do not match.'); return; }
    if (passwordInput.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    try {
      const uQuery = query(collection(db, 'users'), where('email', '==', targetEmail));
      const uSnap = await getDocs(uQuery);
      if (uSnap.empty) { setErrorMsg('Email not approved yet. Submit an Access Request first.'); return; }
      const uDoc = uSnap.docs[0];
      if (!uDoc.data().active) { setErrorMsg('Account suspended by an administrator.'); return; }
      await updateDoc(doc(db, 'users', uDoc.id), { password: passwordInput, activatedAt: serverTimestamp() });
      const rQuery = query(collection(db, 'user_requests'), where('email', '==', targetEmail), where('status', '==', 'pending'));
      const rSnap = await getDocs(rQuery);
      if (!rSnap.empty) { await updateDoc(doc(db, 'user_requests', rSnap.docs[0].id), { status: 'approved' }); }
      setSuccess(true); setTimeout(() => { setEmailInput(targetEmail); setView('login'); setSuccess(false); setReqEmail(''); setPasswordInput(''); setReqNotes(''); }, 2000);
    } catch (err) { setErrorMsg('Database connection error.'); }
  };
  if (view === 'request' || view === 'activate') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans text-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <button type="button" onClick={() => { setView('login'); setErrorMsg(''); }} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Sign In</span>
          </button>

          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md"><Shirt className="w-6 h-6 text-white" /></div>
            <h2 className="text-xl font-bold tracking-tight">{view === 'request' ? '1. Request System Access' : '2. First-Time Activation'}</h2>
            <p className="text-xs text-slate-500">{view === 'request' ? 'Submit your name and email for admin verification approval' : 'Create a secure password for your approved staff email registry profile'}</p>
          </div>

          {success ? (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center gap-2 text-center">
              <CheckCircle className="w-8 h-8 text-blue-600 animate-bounce" />
              <h4 className="text-sm font-bold text-blue-900">Step Completed Successfully!</h4>
              <p className="text-xs text-blue-600">Updating registration records. Redirecting you...</p>
            </div>
          ) : (
            <form onSubmit={view === 'request' ? handleRequest : handleActivate} className="space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">{errorMsg}</div>}
              
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Email Address</label>
                <input type="email" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} placeholder="staff@uniformexchange.org" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              {view === 'request' ? (
                <>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-600">Your Full Name</label>
                    <input type="text" value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-600">Notes for Admin (Optional)</label>
                    <textarea value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} placeholder="Specify your warehouse role or branch..." className="w-full h-16 p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-600">Create Password</label>
                    <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-600">Confirm Password</label>
                    <input type="password" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                </>
              )}

              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                <span>{view === 'request' ? 'Submit Registration Request' : 'Activate Password Configuration'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans text-slate-900">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center gap-3 mb-6 text-center">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md"><Shirt className="w-8 h-8 text-white" /></div>
          <h2 className="text-2xl font-bold tracking-tight">Uniform Exchange Sign In</h2>
          <p className="text-xs text-slate-500">Kirklees Warehouse Stock Manager Access Portal</p>
        </div>
        
        <div className="space-y-4">
          {loginError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">{loginError}</div>}
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">Email Address</label>
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="enter your email" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 outline-none" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 outline-none pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="button" onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md">Sign In</button>
          
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2 mt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">New User Guide Pipeline</p>
            <div className="flex gap-2 justify-center">
              <button type="button" onClick={() => setView('request')} className="text-xs font-bold text-blue-600 hover:underline">1. Request Access</button>
              <span className="text-slate-300">➔</span>
              <button type="button" onClick={() => setView('activate')} className="text-xs font-bold text-emerald-600 hover:underline">2. Activate Password</button>
            </div>
          </div>

          <button type="button" onClick={() => setShowContactForm(!showContactForm)} className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 transition-all mt-1 block">Trouble logging in? Message tech dev support</button>

          {showContactForm && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="Type your message to the admin team here..." className="w-full h-16 p-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500 bg-slate-50 outline-none" />
              <button type="button" onClick={handleSendMessage} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-all">Send Message</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
