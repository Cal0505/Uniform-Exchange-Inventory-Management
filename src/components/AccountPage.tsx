import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { Shield, User, Mail, Lock, Check } from 'lucide-react';

interface TrainingModule {
  id: string;
  title?: string;
  description?: string;
  duration?: string;
  roles?: string[];
  targetUsers?: string[];
}

interface AccountPageProps { userEmail: string; userRole: string; }

export default function AccountPage({ userEmail, userRole }: AccountPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(userEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [userDocId, setUserDocId] = useState('');
  const [saving, setSaving] = useState(false);
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);
  const [lessonsCompleted, setLessonsCompleted] = useState<string[]>([]);

  const normalizedEmail = (userEmail || '').toLowerCase().trim();
  const eligibleTrainingModules = trainingModules.filter((module) => {
    const roles = Array.isArray(module.roles) ? module.roles : [];
    const users = Array.isArray(module.targetUsers) ? module.targetUsers.map((u) => u.toString().toLowerCase().trim()) : [];
    if (users.includes(normalizedEmail)) return true;
    if (roles.includes(userRole) || roles.includes('Everyone')) return true;
    return roles.length === 0 && users.length === 0;
  });
  const completedModules = eligibleTrainingModules.filter((mod) => lessonsCompleted.includes(mod.id));
  const currentModules = eligibleTrainingModules.filter((mod) => !lessonsCompleted.includes(mod.id));
  const completedTrainingCount = completedModules.length;
  const totalTrainingCount = eligibleTrainingModules.length;
  const trainingProgressPercent = totalTrainingCount === 0 ? 0 : Math.round((completedTrainingCount / totalTrainingCount) * 100);

  // FETCH LIVE DATA MATCHING USER SESSION FROM FIRESTORE ON MOUNT
  useEffect(() => {
    const fetchLiveProfile = async () => {
      if (!userEmail) return;
      try {
        const q = query(collection(db, 'users'), where('email', '==', userEmail.toLowerCase().trim()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          // Lock in the unique document ID and target displayName
          setUserDocId(snap.docs[0].id);
          setName(snap.docs[0].data().displayName || 'Staff Member');
        }
      } catch (err) {
        console.error('Error connecting to user collection:', err);
      }
    };
    fetchLiveProfile();
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    const normalizedEmail = userEmail.toLowerCase().trim();

    const unsubModules = onSnapshot(collection(db, 'training_modules'), (snap) => {
      const items: TrainingModule[] = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as TrainingModule));
      setTrainingModules(items.sort((a, b) => (b.duration || '').localeCompare(a.duration || '')));
    });

    const progressDoc = doc(db, 'training_progress', normalizedEmail);
    const unsubProgress = onSnapshot(progressDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLessonsCompleted(Array.isArray(data.lessonsCompleted) ? data.lessonsCompleted : []);
      } else {
        setLessonsCompleted([]);
      }
    });

    return () => {
      unsubModules();
      unsubProgress();
    };
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
      // Use 'displayName' as the key to avoid creating a new 'name' field
      const updatePayload: any = { displayName: name.trim() };
      
      if (password) {
        updatePayload.password = password;
      }

      // Commit modifications to Cloud Firestore using updateDoc
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
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" /> Personal Account Settings
        </h2>
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

      <section className="mt-8 bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Training Record</h2>
            <p className="text-sm text-slate-500 mt-1">Your current training progress and modules waiting for completion.</p>
          </div>
          <div className="rounded-3xl bg-white border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
            {completedTrainingCount}/{totalTrainingCount} completed · {trainingProgressPercent}%
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">Current Training Record</p>
                  <h3 className="text-base font-black text-slate-900 mt-1">Completed Modules</h3>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{completedTrainingCount}</span>
              </div>
              {completedModules.length > 0 ? (
                <div className="space-y-3">
                  {completedModules.map((mod) => (
                    <div key={mod.id} className="rounded-2xl border border-slate-200 bg-emerald-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{mod.title || 'Untitled Module'}</p>
                          <p className="text-xs text-slate-500 mt-1">{mod.description || 'No description provided.'}</p>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{mod.duration || 'n/a'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">You have not completed any training modules yet.</p>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">Assigned Modules</p>
                  <h3 className="text-base font-black text-slate-900 mt-1">Work In Progress</h3>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{currentModules.length} open</span>
              </div>
              {currentModules.length > 0 ? (
                <div className="space-y-3">
                  {currentModules.map((mod) => (
                    <div key={mod.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{mod.title || 'Untitled Module'}</p>
                          <p className="text-xs text-slate-500 mt-1">{mod.description || 'No description available.'}</p>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{mod.duration || 'n/a'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No active training modules are currently assigned to you.</p>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">Your Training Summary</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Training Modules</span>
                  <span>{totalTrainingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Completed</span>
                  <span>{completedTrainingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Remaining</span>
                  <span>{currentModules.length}</span>
                </div>
                <div className="pt-3">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${trainingProgressPercent}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Progress toward your completed training record.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] font-semibold text-slate-300">Training Tips</p>
              <ul className="text-sm space-y-2 list-disc list-inside text-slate-200">
                <li>Finish your next module to keep your compliance on track.</li>
                <li>Open training is prioritized by role and target assignment.</li>
                <li>Reach out to your supervisor if a module appears missing.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}