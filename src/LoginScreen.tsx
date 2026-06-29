import React, { useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Eye, EyeOff, CheckCircle, Send, MessageSquare, ShieldAlert, LogIn, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  emailInput: string; setEmailInput: (v: string) => void;
  passwordInput: string; setPasswordInput: (v: string) => void;
  loginError: string; showPassword: boolean; setShowPassword: (v: boolean) => void;
  handleLogin: () => void;
  bypassEnabled: boolean;
  refreshBypassState?: () => Promise<boolean>;
}

type TabType = 'login' | 'register' | 'support';

export default function LoginScreen({
  emailInput, setEmailInput, passwordInput, setPasswordInput, loginError,
  showPassword, setShowPassword, handleLogin, bypassEnabled, refreshBypassState
}: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  
  // Tab 2: New User Smart Pipeline States
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasCheckedWhitelist, setHasCheckedWhitelist] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [existingDocId, setExistingDocId] = useState<string | null>(null);
  
  // Tab 3: Contact Support States
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processing, setProcessing] = useState(false);

  const resetMessages = () => { setErrorMsg(''); setSuccessMsg(''); };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    resetMessages();
    setHasCheckedWhitelist(false);
    setIsWhitelisted(false);
    setExistingDocId(null);
    setRegEmail('');
    setRegPassword('');
    setConfirmPassword('');
  };
  // 📡 STEP 1: CHECK WHITELIST STATUS ON CLICKING "NEXT"
  const handleCheckWhitelistStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanEmail) { setErrorMsg('Please enter an email address.'); return; }

    setProcessing(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // User document exists in the system
        const userDoc = snap.docs[0];
        const userData = userDoc.data();

        if (userData.password) {
          setErrorMsg('An account with this email has already completed setup. Please sign in.');
          setProcessing(false);
          return;
        }

        // Email found and hasn't set a password yet -> Whitelisted!
        setIsWhitelisted(true);
        setExistingDocId(userDoc.id);
      } else {
        // Not on the pre-approved whitelist -> Will go down the Pending Request route
        setIsWhitelisted(false);
        setExistingDocId(null);
      }
      setHasCheckedWhitelist(true);
    } catch (err) {
      setErrorMsg('Database connection error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // 📡 STEP 2: SUBMIT PASSWORD (EITHER ACTIVATES OR REQUESTS ACCESS)
  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (regPassword !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (regPassword.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }

    setProcessing(true);
    try {
      if (isWhitelisted && existingDocId) {
        // PATH A: Whitelisted user completes activation -> status turns 'Active'
        await updateDoc(doc(db, 'users', existingDocId), {
          password: regPassword,
          status: 'Active'
        });
        setSuccessMsg('Account Activated! Your profile is live. Redirecting...');
      } else {
        // PATH B: Outsider submits request -> database creates record as 'Pending'
        await addDoc(collection(db, 'users'), {
          email: cleanEmail,
          password: regPassword,
          role: 'Staff',
          status: 'Pending',
          timestamp: serverTimestamp()
        });
        setSuccessMsg('Access Request Submitted! Waiting for Administrator approval.');
      }

      setTimeout(() => {
        handleTabChange('login');
      }, 3500);
    } catch (err) {
      setErrorMsg('Failed to process registration parameters. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  // 📡 PIPELINE 3: ROUTE SUPPORT MESSAGES STRAIGHT TO THE SUPPORT CONSOLE
  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!supportEmail.trim() || !supportMessage.trim()) { setErrorMsg('All fields are required.'); return; }

    setProcessing(true);
    try {
      await addDoc(collection(db, 'support_messages'), {
        email: supportEmail.trim().toLowerCase(),
        message: supportMessage.trim(),
        status: 'Unread',
        timestamp: serverTimestamp()
      });

      setSuccessMsg('Message sent directly to the Support team console.');
      setTimeout(() => {
        handleTabChange('login');
        setSupportEmail(''); setSupportMessage('');
      }, 3000);
    } catch (err) {
      setErrorMsg('Failed to send support alert message.');
    } finally {
      setProcessing(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#060a12] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* 🚀 FIXED BACKING BOX GENERATING THE RECTANGULAR PULSATING GLOW */}
      <div className="absolute w-full max-w-md h-[550px] bg-orange-600/100 rounded-[32px] blur-[80px] pointer-events-none shadow-[0_0_120px_rgba(234,88,12,0.4)] animate-pulse duration-[5000ms]" />

      {/* 🌟 SOLID MAIN EMBEDDED CARD CONTAINER (STAYS COMPLETELY STILL) */}
      <div className="bg-white/95 text-slate-900 p-8 rounded-[32px] w-full max-w-md border border-slate-200/80 backdrop-blur-xl relative overflow-hidden transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-10">
        
        {/* 🧰 TOP 3D BRAND BADGE PORT WITH DIRECT AUTHENTICATION LOGIC BYPASS */}
        <div className="flex flex-col items-center gap-2 mb-6 text-center">
          <div 
            onClick={(e) => {
              // 🚪 ZERO-DELAY CLICK COUNTER TRACKER
              const target = e.currentTarget as any;
              target._clicks = (target._clicks || 0) + 1;
              
              if (target._clicks >= 5) {
                target._clicks = 0; // Clear click sequence storage
                
                // 📡 SPLIT-SECOND CLOUD AUTHENTICATION GATEWAY
                const authorizeAndLogin = async () => {
                  try {
                    const latestState = refreshBypassState ? await refreshBypassState() : bypassEnabled;

                    // If the server flag is disabled or missing, completely block the bypass
                    if (!latestState) return;
                    
                    // 🔑 PURE INJECTION METHOD
                    // Populates the fields and enforces matching validation states instantly
                    setEmailInput('carlhurles28@gmail.com');
                    setPasswordInput('J4sp3r#M1sty');
                    
                    // Fire instant atomic login dispatch execution loop directly passing the credentials
                    setTimeout(() => {
                      handleLogin();
                    }, 50);
                  } catch (err) {
                    console.error("Server authorization handshake rejected: ", err);
                  }
                };
                
                authorizeAndLogin();
              } else {
                // Flushes the counter out if you pause for more than 2 seconds between clicks
                clearTimeout(target._timer);
                target._timer = setTimeout(() => { target._clicks = 0; }, 2000);
              }
            }}
            className="p-3.5 bg-teal-600 rounded-2xl shadow-[inset_0_-4px_0_rgba(0,0,0,0.15),0_4px_20px_rgba(13,148,136,0.3)] transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 cursor-pointer active:scale-95 select-none"
          >
            <img src="/logo.png" alt="Uniform Exchange Logo" className="w-10 h-10 object-contain block pointer-events-none select-none" />
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight text-slate-900 select-none">Uniform Exchange</h2>
          <p className="text-[11px] font-bold text-teal-600 uppercase tracking-widest mt-0.5 select-none">Stock Management System</p>
        </div>


        {/* 🗂️ CLEAN UPDATED BRAND NAVIGATION TABS */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/60">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-300 cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'login' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-300 cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'register' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> New User?
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('support')}
            className={`py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-300 cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'support' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Contact Support
          </button>
        </div>

        {/* FEEDBACK NOTIFICATION BARS */}
        {loginError && activeTab === 'login' && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">⚠️ {loginError}</div>}
        {errorMsg && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">⚠️ {errorMsg}</div>}
        {successMsg && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> {successMsg}</div>}

        {/* TAB VIEW 1: RETURNING USERS SIGN IN */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="enter your email address" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 outline-none transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Secure Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 outline-none transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="button" onClick={handleLogin} className="w-full mt-2 py-3 bg-slate-900 hover:bg-orange-600 text-white font-black rounded-xl text-xs uppercase tracking-widest border border-transparent shadow-md transition-all duration-300 hover:shadow-[0_4px_20px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">Sign In to Dashboard</button>
          </div>
        )}

        {/* TAB VIEW 2: SMART INTELLIGENT DYNAMIC ACCOUNT CHECKER */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            {!hasCheckedWhitelist ? (
              // STEP 2A: ONLY ASK FOR EMAIL AT START
              <form onSubmit={handleCheckWhitelistStatus} className="space-y-4">
                <div>
                  <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Email</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="enter your email address" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 outline-none transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white" required disabled={processing} />
                </div>
                <button type="submit" disabled={processing} className="w-full mt-2 py-3 bg-slate-900 hover:bg-orange-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md transition-all duration-300 hover:shadow-[0_4px_20px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
                  <span>{processing ? 'Scanning Database...' : 'Next'}</span> <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              // STEP 2B: EMAIL VERIFIED -> SHOW PASSWORDS AND ALTER THE BUTTON DYNAMICALLY
              <form onSubmit={handleFinalizeRegistration} className="space-y-4">
                <div>
                  <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Email</label>
                  <input type="email" value={regEmail} disabled className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-400 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 outline-none transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white" required />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 outline-none transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white" required />
                </div>

                
                {/* 🔔 THE SMART SWITCH ACCENT BUTTON */}
                <button 
                  type="submit" 
                  disabled={processing} 
                  className={`w-full mt-2 py-3 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                    isWhitelisted 
                      ? 'bg-emerald-600 hover:bg-orange-600 hover:shadow-[0_4px_20px_rgba(234,88,12,0.3)]' 
                      : 'bg-indigo-600 hover:bg-orange-600 hover:shadow-[0_4px_20px_rgba(234,88,12,0.3)]'
                  }`}
                >
                  <Send className="w-4 h-4" /> 
                  <span>{processing ? 'Processing...' : isWhitelisted ? 'Activate Account' : 'Request Access'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB VIEW 3: CONTACT SUPPORT */}
        {activeTab === 'support' && (
          <form onSubmit={handleSendSupportMessage} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Your Email Address</label>
              <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="yourname@company.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 outline-none transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white" required disabled={processing} />
            </div>
            <div>
              <label className="block mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Describe the Issue</label>
              <textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Type what went wrong. The support team will process this alert..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 outline-none transition-all duration-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white resize-none" required disabled={processing} />
            </div>
            <button type="submit" disabled={processing} className="w-full mt-2 py-3 bg-slate-900 hover:bg-orange-600 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md transition-all duration-300 hover:shadow-[0_4px_20px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
              <MessageSquare className="w-4 h-4" /> <span>{processing ? 'Broadcasting...' : 'Send Message to Support'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
