import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc, onSnapshot, getDocs, query, where, increment } from 'firebase/firestore';
import { Megaphone, CheckSquare, Clock, User, Check, Play, AlertCircle } from 'lucide-react';

interface HomeLandingProps {
  categories: any[];
  schools: any[];
  inventory: any[];
  userRole: string;
  loggedInEmail: string;
  newsFeed: any[];
  tasksList: any[];
  users: any[];
}

export default function HomeLanding({
  categories,
  schools,
  inventory,
  userRole,
  loggedInEmail,
  newsFeed,
  tasksList,
  users
}: HomeLandingProps) {
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainingModules, setTrainingModules] = useState<any[]>([]);

  const isAdminOrDev = userRole === 'Admin' || userRole === 'admin' || userRole === 'Dev' || userRole === 'dev';
  const sortedNews = [...newsFeed].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  
  const personalizedNews = sortedNews.filter((n) => {
    if (!n) return false;
    const roles = Array.isArray(n.targetRoles) ? n.targetRoles : [];
    const targetUsers = Array.isArray(n.targetUsers) ? n.targetUsers : [];
    if (targetUsers.includes(loggedInEmail)) return true;
    if (roles.includes(userRole) || roles.includes('Everyone')) return true;
    return roles.length === 0 && targetUsers.length === 0;
  });

  const activeTaskPool = tasksList.filter((t) => {
    if (t.status !== 'unassigned') return false;
    const roles = Array.isArray(t.roles) ? t.roles : [];
    const targetUsers = Array.isArray(t.targetUsers) ? t.targetUsers : [];
    if (targetUsers.includes(loggedInEmail)) return true;
    if (roles.includes(userRole) || roles.includes('Everyone')) return true;
    return roles.length === 0 && targetUsers.length === 0;
  });
  const myClaimedTasks = tasksList.filter((t) => t.status === 'claimed' && t.assignedTo === loggedInEmail);

  const [lessonsCompleted, setLessonsCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (!loggedInEmail) return;
    const loadProgress = async () => {
      try {
        const docRef = doc(db, 'training_progress', loggedInEmail);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setLessonsCompleted(Array.isArray(data.lessonsCompleted) ? data.lessonsCompleted : []);
        }
      } catch (err) { console.error('Failed to load training progress', err); }
    };
    loadProgress();
  }, [loggedInEmail]);

  useEffect(() => {
    const unsubTraining = onSnapshot(collection(db, 'training_modules'), (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setTrainingModules(items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    return () => { unsubTraining(); };
  }, []);

  const modulesForUser = trainingModules.filter((module) => {
    if (isAdminOrDev) return true;
    const roles = Array.isArray(module.roles) ? module.roles : [];
    const targetUsers = Array.isArray(module.targetUsers) ? module.targetUsers : [];
    if (targetUsers.includes(loggedInEmail)) return true;
    if (roles.includes(userRole) || roles.includes('Everyone')) return true;
    return roles.length === 0 && targetUsers.length === 0;
  });
  
  const completedTrainingCount = modulesForUser.filter((m) => lessonsCompleted.includes(m.id)).length;
  const totalTrainingCount = modulesForUser.length;
  const trainingPercent = totalTrainingCount === 0 ? 0 : Math.round((completedTrainingCount / totalTrainingCount) * 100);

  const totalStockUnits = inventory.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const currentUserRecord = (users || []).find((u) => {
    const userEmail = (u?.email || '').toString().trim().toLowerCase();
    const loggedEmail = (loggedInEmail || '').toString().trim().toLowerCase();
    return userEmail === loggedEmail || u?.id === loggedInEmail;
  });
  
  const completedTaskCount = currentUserRecord
    ? Number(currentUserRecord.taskComplete || 0)
    : tasksList.filter((t) => t.status === 'completed' && (t.assignedTo || '').toString().trim().toLowerCase() === (loggedInEmail || '').toString().trim().toLowerCase()).length;

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'news_feed'), {
        message: newAnnouncement.trim(),
        postedBy: loggedInEmail,
        createdAt: serverTimestamp()
      });
      setNewAnnouncement('');
    } catch (err) { console.error("Broadcast write failed:", err); } 
    finally { setIsSubmitting(false); }
  };

  const handleClaimTask = async (taskId: string) => {
    try {
      if (myClaimedTasks.length >= 1) {
        alert("Operation Blocked: You must mark your current active task as completed before claiming another one.");
        return;
      }
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'claimed',
        assignedTo: loggedInEmail
      });
    } catch (err) { console.error("Claim update failed:", err); }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const task = tasksList.find((t) => t.id === taskId);
      if (!task) {
        console.warn('Complete task failed: task not found', taskId);
        return;
      }

      const assignedUserEmail = (task.assignedTo || '').toString().trim().toLowerCase();
      if (assignedUserEmail) {
        const matchedUser = users.find((u) => {
          const email = (u.email || '').toString().trim().toLowerCase();
          return email === assignedUserEmail || u.id === task.assignedTo;
        });

        if (matchedUser?.id) {
          await updateDoc(doc(db, 'users', matchedUser.id), {
            taskComplete: increment(1)
          });
        } else {
          const userQuery = query(collection(db, 'users'), where('email', '==', assignedUserEmail));
          const userSnapshot = await getDocs(userQuery);
          userSnapshot.forEach((userDoc) => {
            updateDoc(userDoc.ref, { taskComplete: increment(1) }).catch((err) => console.error('Failed to increment taskComplete', err));
          });
        }
      }

      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'completed',
        completedAt: serverTimestamp()
      });
    } catch (err) { console.error('Sign-off write failed:', err); }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn font-sans w-full max-w-5xl">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-xs">
          <span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Garments Stocked</span>
          <span className="block text-2xl font-black text-brand-primary mt-1">{totalStockUnits} Units</span>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-xs">
          <span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Completed Tasks</span>
          <span className="block text-2xl font-black text-slate-800 mt-1">{completedTaskCount}</span>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-xs">
          <span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Training Modules Complete</span>
          <span className="block text-2xl font-black text-slate-800 mt-1">{completedTrainingCount}/{totalTrainingCount} {trainingPercent}%</span>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-xs">
          <span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Connected User</span>
          <div className="mt-3 space-y-2 text-slate-700 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="font-black uppercase tracking-[0.2em] text-emerald-700">Connected</span>
            </div>
            <div className="text-slate-500">{loggedInEmail || 'No email available'}</div>
            <div className="text-slate-500">{userRole || 'No role assigned'}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs border-t-4 border-brand-teal space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Megaphone className="w-5 h-5 text-brand-teal shrink-0" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">News Feed</h3>
        </div>

        {isAdminOrDev && (
          <form onSubmit={handlePostAnnouncement} className="flex gap-2 w-full">
            <input type="text" placeholder="Type a warehouse alert notice message..." value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} className="flex-1 p-2.5 border rounded-xl text-xs" disabled={isSubmitting} />
            <button type="submit" className="py-2.5 px-4 bg-brand-teal text-white text-xs font-black rounded-xl cursor-pointer" disabled={isSubmitting}>Broadcast</button>
          </form>
        )}

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-none">
          {personalizedNews.map((news) => (
            <div key={news.id} className="p-3 bg-slate-50 border rounded-xl flex items-start gap-2.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-brand-orange mt-1.5 shrink-0" />
              <div className="space-y-0.5 flex-1">
                <p className="font-bold text-slate-900 leading-tight">{news.message}</p>
                <span className="block text-[9px] font-mono text-slate-400">Posted by {news.postedBy?.split('@')[0]}</span>
              </div>
            </div>
          ))}
          {personalizedNews.length === 0 && <p className="text-xs text-slate-400 italic py-2">No updates for you right now.</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 text-left">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-brand-primary shrink-0" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Unassigned Tasks</h3>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{activeTaskPool.length} Open</span>
          </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
            {activeTaskPool.map((task) => (
              <div key={task.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition">
                <span className="text-xs font-bold text-slate-800 truncate">{task.taskName}</span>
                <button type="button" onClick={() => handleClaimTask(task.id)} className="flex items-center gap-1 py-1 px-3 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-lg text-[10px] font-black tracking-wider uppercase transition cursor-pointer shrink-0"><Play className="w-3 h-3" /><span>Claim</span></button>
              </div>
            ))}
            {activeTaskPool.length === 0 && <p className="text-xs text-slate-400 italic py-4 text-center">All warehouse tasks have been fully claimed!</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 text-left">
          <div className="flex items-center gap-2 border-b pb-2">
            <User className="w-5 h-5 text-slate-800 shrink-0" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Your Active Tasks</h3>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[140px] space-y-3">
            {myClaimedTasks.map((task) => (
              <div key={task.id} className="w-full p-4 bg-amber-50/60 border-2 border-dashed border-amber-300 rounded-2xl flex flex-col justify-between gap-4 animate-fadeIn">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-black uppercase text-amber-700 tracking-wider">Locked Active Assignment</span>
                  <p className="text-sm font-black text-slate-900 leading-snug">{task.taskName}</p>
                </div>
                <button type="button" onClick={() => handleCompleteTask(task.id)} className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition hover:bg-emerald-700 cursor-pointer"><Check className="w-4 h-4" /><span>Mark Complete</span></button>
              </div>
            ))}
            {myClaimedTasks.length === 0 && (
              <div className="text-center py-6 text-slate-400 select-none">
                <AlertCircle className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                <span className="block text-[10px] font-mono uppercase tracking-wider font-bold">You are currently idle.</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">Claim an open action from the unassigned pool to begin work.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}