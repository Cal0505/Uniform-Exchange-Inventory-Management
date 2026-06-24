import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Shirt, Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle } from 'lucide-react';

interface LoginScreenProps {
  emailInput: string;
  setEmailInput: (val: string) => void;
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  loginError: string;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  handleLogin: () => void;
  showContactForm: boolean;
  setShowContactForm: (val: boolean) => void;
  contactMessage: string;
  setContactMessage: (val: string) => void;
  handleSendMessage: () => void;
}

export default function LoginScreen({
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  loginError,
  showPassword,
  setShowPassword,
  handleLogin,
  showContactForm,
  setShowContactForm,
  contactMessage,
  setContactMessage,
  handleSendMessage
}: LoginScreenProps) {
  // Navigation views
  const [view, setView] = useState<'login' | 'activate'>('login');
  
  // Account registry setup inputs
  const [activateEmail, setActivateEmail] = useState('');
  const [activatePassword, setActivatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activateError, setActivateError] = useState('');
  const [activateSuccess, setActivateSuccess] = useState(false);

  // CORE ACTION: MATCH APPROVED RECORD & INJECT USER PASSWORD
  const handleAccountActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError('');

    if (activatePassword !== confirmPassword) {
      setActivateError('Passwords do not match. Please verify.');
      return;
    }

    if (activatePassword.length < 6) {
      setActivateError('Password must be at least 6 characters long.');
      return;
    }

    try {
      // Find matching approved record in the users database collection
      const q = query(collection(db, 'users'), where('email', '==', activateEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setActivateError('This email is not on the approved staff registry list. Please submit an access request below.');
        return;
      }

      const matchingDoc = querySnapshot.docs[0];
      const userData = matchingDoc.data();

      if (!userData.active) {
        setActivateError('Your staff account access has been suspended by an administrator.');
        return;
      }

      // Safe update: write the user-created password to their verified profile
      await updateDoc(doc(db, 'users', matchingDoc.id), {
        password: activatePassword,
        activatedAt: serverTimestamp()
      });

      setActivateSuccess(true);
      setTimeout(() => {
        setEmailInput(activateEmail);
        setView('login');
        setActivateSuccess(false);
        setActivateEmail('');
        setActivatePassword('');
        setConfirmPassword('');
      }, 2500);

    } catch (err) {
      console.error(err);
      setActivateError('An error occurred during secure registry database connection.');
    }
  };
  // VIEW A: RENDER ACCOUNT ACTIVATION SETUP CONTAINER
  if (view === 'activate') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <button type="button" onClick={() => setView('login')} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Sign In</span>
          </button>

          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md"><UserPlus className="w-6 h-6 text-white" /></div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight text-center">First-Time Activation</h2>
            <p className="text-xs text-slate-500 text-center">Set a password for an approved staff account registry profile</p>
          </div>

          {activateSuccess ? (
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center gap-2 text-center animate-in fade-in duration-200">
              <CheckCircle className="w-8 h-8 text-emerald-600 animate-bounce" />
              <h4 className="text-sm font-bold text-emerald-900">Account Activated!</h4>
              <p className="text-xs text-emerald-600">Password configured successfully. Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleAccountActivation} className="space-y-4">
              {activateError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">{activateError}</div>}
              
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Approved Email Address</label>
                <input type="email" value={activateEmail} onChange={(e) => setActivateEmail(e.target.value)} placeholder="staff@uniformexchange.org" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Create Secure Password</label>
                <input type="password" value={activatePassword} onChange={(e) => setActivatePassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-600">Re-type Password to Confirm</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md">
                Activate Account
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // VIEW B: RENDER STANDARD SIGN IN CONTAINER
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md"><Shirt className="w-8 h-8 text-white" /></div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center">Uniform Exchange Sign In</h2>
          <p className="text-xs text-slate-500 text-center">Please enter your credentials to access the stock manager</p>
        </div>
        
        <div className="space-y-4">
          {loginError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">{loginError}</div>}
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">Email Address</label>
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="enter your email" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="button" onClick={handleLogin} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10">
            Sign In
          </button>
          
          <div className="flex flex-col gap-2 pt-2 text-center">
            <button type="button" onClick={() => setView('activate')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-all">
              First-Time Activation Setup? Click Here
            </button>
            <button type="button" onClick={() => setShowContactForm(!showContactForm)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-all">
              Trouble logging in? Message the dev team
            </button>
          </div>

          {showContactForm && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="Type your message to the admin team here..." className="w-full h-20 p-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-slate-50 text-slate-900" />
              <button type="button" onClick={handleSendMessage} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-all">
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
