import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Megaphone, CheckSquare, BookOpen, Clock, User, Check, Play, AlertCircle } from 'lucide-react';

interface HomeLandingProps {
  categories: any[];
  schools: any[];
  inventory: any[];
  userRole: string;
  loggedInEmail: string;
  newsFeed: any[];
  tasksList: any[];
}

export default function HomeLanding({
  categories,
  schools,
  inventory,
  userRole,
  loggedInEmail,
  newsFeed,
  tasksList
}: HomeLandingProps) {
  // Input tracking states for content creation
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out and sort your live data streams
  const isAdminOrDev = userRole === 'Admin' || userRole === 'admin' || userRole === 'Dev' || userRole === 'dev';
  const sortedNews = [...newsFeed].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  
  const activeTaskPool = tasksList.filter(t => t.status === 'unassigned');
  const myClaimedTasks = tasksList.filter(t => t.status === 'claimed' && t.assignedTo === loggedInEmail);

  // Total hardware calculations for the ledger cards
  const totalStockUnits = inventory.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

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
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'tasks'), {
        taskName: newTaskName.trim(),
        status: 'unassigned',
        assignedTo: '',
        createdAt: serverTimestamp(),
        completedAt: null
      });
      setNewTaskName('');
    } catch (err) { console.error("Task payload failed:", err); } 
    finally { setIsSubmitting(false); }
  };

  const handleClaimTask = async (taskId: string) => {
    try {
      // Enforce your lock rule: Pickers can only handle 1 active task at a time
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
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'completed',
        completedAt: serverTimestamp()
      });
    } catch (err) { console.error("Sign-off write failed:", err); }
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn font-sans w-full max-w-5xl">
      
      {/* 🏷️ MASTER DATA SUMMARY TRACK CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-xs"><span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Garments Stocked</span><span className="block text-2xl font-black text-brand-primary mt-1">{totalStockUnits} Units</span></div>
        <div className="bg-white border rounded-2xl p-5 shadow-xs"><span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Active Folders</span><span className="block text-2xl font-black text-slate-800 mt-1">{categories.length} Nodes</span></div>
        <div className="bg-white border rounded-2xl p-5 shadow-xs"><span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Campus Registries</span><span className="block text-2xl font-black text-slate-800 mt-1">{schools.length} Profiles</span></div>
        <div className="bg-white border rounded-2xl p-5 shadow-xs"><span className="block text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">Radar Sync</span><span className="block text-xs font-black text-emerald-600 uppercase font-mono tracking-widest mt-4 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" /> Live Flow</span></div>
      </div>

      {/* 📢 CONTAINER 1: THE DYNAMIC ADMINISTRATIVE NEWS FEED */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs border-t-4 border-brand-teal space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Megaphone className="w-5 h-5 text-brand-teal shrink-0" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Admin News Update Feed</h3>
        </div>

        {isAdminOrDev && (
          <form onSubmit={handlePostAnnouncement} className="flex gap-2 w-full">
            <input type="text" placeholder="Type a warehouse alert notice message..." value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} className="flex-1 p-2.5 border rounded-xl text-xs" disabled={isSubmitting} />
            <button type="submit" className="py-2.5 px-4 bg-brand-teal text-white text-xs font-black rounded-xl cursor-pointer" disabled={isSubmitting}>Broadcast</button>
          </form>
        )}

        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-none">
          {sortedNews.map((news) => (
            <div key={news.id} className="p-3 bg-slate-50 border rounded-xl flex items-start gap-2.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-brand-orange mt-1.5 shrink-0" />
              <div className="space-y-0.5 flex-1">
                <p className="font-bold text-slate-900 leading-tight">{news.message}</p>
                <span className="block text-[9px] font-mono text-slate-400">Posted by {news.postedBy?.split('@')[0]}</span>
              </div>
            </div>
          ))}
          {sortedNews.length === 0 && <p className="text-xs text-slate-400 italic py-2">No updates broadcasted onto the wire yet.</p>}
        </div>
      </div>
      {/* 📋 CONTAINER 2: DYNAMIC TASK POOL & VOLUNTARY ASSIGNMENT LOGIC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        
        {/* LEFT COLUMN: ACTIVE UNASSIGNED TASK LOG POOL */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 text-left">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-brand-primary shrink-0" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Unassigned Task Pool</h3>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{activeTaskPool.length} Open</span>
          </div>

          {isAdminOrDev && (
            <form onSubmit={handleCreateTask} className="flex gap-2 w-full">
              <input type="text" placeholder="Formulate a new operational task..." value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="flex-1 p-2.5 border rounded-xl text-xs" disabled={isSubmitting} />
              <button type="submit" className="py-2.5 px-4 bg-brand-primary text-white text-xs font-black rounded-xl cursor-pointer" disabled={isSubmitting}>Issue</button>
            </form>
          )}

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

        {/* RIGHT COLUMN: MY CURRENTLY LOCKED ACTIVE WORK TRACKER */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 text-left">
          <div className="flex items-center gap-2 border-b pb-2">
            <User className="w-5 h-5 text-slate-800 shrink-0" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">My Active Tracked Task</h3>
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

      {/* 📚 CONTAINER 3: THE INTERACTIVE ACADEMY WORKMAN MANUAL TUTORIALS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 w-full">
        <div className="flex items-center gap-2 pb-2 border-b">
          <BookOpen className="w-5 h-5 text-slate-800 shrink-0" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Warehouse Academy Manual</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
          <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1.5"><span className="block font-black text-slate-900 uppercase tracking-wider text-[10px] text-brand-primary">📘 1. Stocking In Intake</span><p className="text-slate-500 leading-relaxed text-[11px]">Expand Management and register custom category blue-prints before sorting box item counts into stock shelves.</p></div>
          <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1.5"><span className="block font-black text-slate-900 uppercase tracking-wider text-[10px] text-brand-primary">🔍 2. Tracking Location Prefixes</span><p className="text-slate-500 leading-relaxed text-[11px]">Always cross-verify physical warehouse tags. Fixed Shelf routes row lines, while UO marks Under-Office bulk containers.</p></div>
          <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1.5"><span className="block font-black text-slate-900 uppercase tracking-wider text-[10px] text-brand-primary">⚙️ 3. Operational Sign-Off</span><p className="text-slate-500 leading-relaxed text-[11px]">Claim an active task card from the tracking pool, run the physical audit on row bins, then hit sign-off inside your tray profile.</p></div>
        </div>
      </div>

    </div>
  );
}
