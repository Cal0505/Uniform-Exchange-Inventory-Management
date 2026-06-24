import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const [view, setView] = useState<'login' | 'request'>('login');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // UNIFIED PIPELINE: REQUEST AND SUBMIT PASSWORD ALL AT ONCE
  const handleRequestAndCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg('');
    const cleanEmail = reqEmail.trim().toLowerCase();

    if (reqPassword !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (reqPassword.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }

    try {
      // Check if an account profile or request already exists
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) { setErrorMsg('An account profile with this email already exists.'); return; }

      // Save user details AND password to a pending user_requests pool
      await addDoc(collection(db, 'user_requests'), {
        name: reqName.trim(),
        email: cleanEmail,
        password: reqPassword, // Saved immediately to make it 1 easy step
        status: 'pending',
        timestamp: serverTimestamp()
      });

      setSuccess(true);
      setTimeout(() => {
        setView('login'); setSuccess(false);
        setReqName(''); setReqEmail(''); setReqPassword(''); setConfirmPassword('');
      }, 2500);
    } catch (err) { setErrorMsg('Submission error. Check your firewall settings.'); }
  };
  if (view === 'request') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans text-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <button type="button" onClick={() => { setView('login'); setErrorMsg(''); }} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Sign In</span>
          </button>

          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md"><Shirt className="w-6 h-6 text-white" /></div>
            <h2 className="text-xl font-bold tracking-tight">Request Access & Set Password</h2>
            <p className="text-xs text-slate-500">Submit your profile and choose your password. An admin will activate it shortly.</p>
          </div>

          {success ? (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center gap-2 text-center">
              <CheckCircle className="w-8 h-8 text-blue-600 animate-bounce" />
              <h4 className="text-sm font-bold text-blue-900">Request Received!</h4>
              <p className="text-xs text-blue-600">Your selected password is locked in. Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleRequestAndCreateAccount} className="space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">{errorMsg}</div>}
              
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Full Name</label>
                <input type="text" value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Work Email Address</label>
                <input type="email" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} placeholder="staff@uniformexchange.org" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Choose a Password</label>
                <input type="password" value={reqPassword} onChange={(e) => setReqPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>

              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                <span>Submit Access Request</span>
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
          
          <div className="text-center pt-2 mt-2 border-t border-slate-100">
            <button type="button" onClick={() => setView('request')} className="text-xs font-bold text-blue-600 hover:underline">
              New Staff Member? Request Account Access Here
            </button>
          </div>

          <button type="button" onClick={() => setShowContactForm(!showContactForm)} className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 transition-all mt-3 block">Trouble logging in? Message tech dev support</button>

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
