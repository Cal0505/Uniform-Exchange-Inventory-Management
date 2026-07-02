import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitedUser, setInvitedUser] = useState<any | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Verify the token immediately on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('No invitation token found.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', token);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().status === 'Pending') {
          setInvitedUser({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('This invitation link is invalid or has already been used.');
        }
      } catch (err) {
        setError('Error verifying your invitation code.');
      }
      setLoading(false);
    }
    verifyToken();
  }, [token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitedUser || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);

      // 1. Authenticate user natively in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        invitedUser.email, 
        password
      );

      // 2. Sync their Firebase Auth display name
      await updateProfile(userCredential.user, {
        displayName: invitedUser.displayName
      });

      // 3. ACTIVATE and VOID the token simultaneously 
      // Option A: If you want to keep the record but make it active:
      await updateDoc(doc(db, 'users', invitedUser.id), {
        status: 'Active',
        uid: userCredential.user.uid // Link their authentication ID
      });

      // Option B: If you prefer to completely delete/clear out an independent invite token, 
      // you could run `await deleteDoc(doc(db, 'users', invitedUser.id))` here instead.

      alert('Account activated successfully!');
      navigate('/dashboard'); // Direct them straight to the application workspace
    } catch (err: any) {
      setError(err.message || 'Failed to finalize your registration profile.');
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Verifying security token...</div>;
  if (error) return <div className="p-8 text-center text-rose-500 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border shadow-md w-full max-w-sm text-left">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Activate Account</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Welcome <span className="font-bold text-slate-800">{invitedUser?.displayName}</span>! Set up your account password below.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
            <input 
              type="text" 
              value={invitedUser?.email} 
              disabled 
              className="w-full p-2.5 bg-slate-100 border text-slate-500 rounded-xl text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Create Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-sm focus:outline-none focus:border-slate-400"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-bold transition-colors mt-2 shadow-sm"
          >
            Complete Registration
          </button>
        </form>
      </div>
    </div>
  );
}