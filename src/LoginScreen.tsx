import React from 'react';
import { Shirt, Eye, EyeOff } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
            <Shirt className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
            Uniform Exchange Sign In
          </h2>
          <p className="text-xs text-slate-500 text-center">
            Please enter your credentials to access the stock manager
          </p>
        </div>
        
        <div className="space-y-4">
          {loginError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {loginError}
            </div>
          )}
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">Email Address</label>
            <input 
              type="email" 
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="enter your email" 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900" 
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button 
            onClick={handleLogin} 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
          >
            Sign In
          </button>
          <button onClick={() => setShowContactForm(!showContactForm)} className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 mt-2 block transition-all">
            Trouble logging in? Message the dev team
          </button>
          {showContactForm && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <textarea 
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Type your message to the admin team here..." 
                className="w-full h-20 p-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-slate-50 text-slate-900" 
              />
              <button 
                onClick={handleSendMessage} 
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-all"
              >
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
