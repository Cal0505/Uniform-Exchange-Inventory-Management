import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Search, Trash2, User, Settings, Filter, Plus, X, Edit2 } from 'lucide-react';

interface Slide { text: string; imageUrl: string; }
interface UserManagementProps { userRole: string; }

export default function UserManagement({ userRole }: UserManagementProps) {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [newRoleName, setNewRoleName] = useState('');

  const [trainingModules, setTrainingModules] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'directory' | 'roles' | 'training' | 'create_task' | 'publish_news'>('directory');
  
  // New structured training fields
  const [moduleNumber, setModuleNumber] = useState<number | ''>('');
  const [moduleLetter, setModuleLetter] = useState('');
  const [newTrainingTitle, setNewTrainingTitle] = useState('');
  const [newTrainingDescription, setNewTrainingDescription] = useState('');
  const [newTrainingSlides, setNewTrainingSlides] = useState<Slide[]>([{ text: '', imageUrl: '' }]);
  const [newTrainingDuration, setNewTrainingDuration] = useState('5m');
  const [newTrainingRoles, setNewTrainingRoles] = useState<string[]>([]);
  const [newTrainingUsers, setNewTrainingUsers] = useState('');

  // Editing Training Module State
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [editModuleNumber, setEditModuleNumber] = useState<number | ''>('');
  const [editModuleLetter, setEditModuleLetter] = useState('');
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleDescription, setEditModuleDescription] = useState('');
  const [editSlides, setEditSlides] = useState<Slide[]>([]);
  const [editModuleDuration, setEditModuleDuration] = useState('');
  const [editModuleRoles, setEditModuleRoles] = useState<string[]>([]);
  const [editModuleUsers, setEditModuleUsers] = useState('');

  // Separate forms state for news and tasks
  const [newsMessage, setNewsMessage] = useState('');
  const [newsTargetRoles, setNewsTargetRoles] = useState<string[]>([]);
  const [newsTargetUsers, setNewsTargetUsers] = useState('');

  const [taskNameInput, setTaskNameInput] = useState('');
  const [taskRolesInput, setTaskRolesInput] = useState<string[]>([]);
  const [taskAssignedToInput, setTaskAssignedToInput] = useState('');

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Helper for generating automatic image filenames
  const getGeneratedSlideUrl = (num: number | '', letter: string, index: number) => {
    return `${num}${letter.toLowerCase()}${index + 1}.png`;
  };

  // Helper for slide arrays
  const addSlide = (isEdit: boolean) => {
    if (isEdit) setEditSlides([...editSlides, { text: '', imageUrl: '' }]);
    else setNewTrainingSlides([...newTrainingSlides, { text: '', imageUrl: '' }]);
  };

  const updateSlide = (index: number, field: keyof Slide, value: string, isEdit: boolean) => {
    if (isEdit) {
      const updated = [...editSlides]; updated[index][field] = value; setEditSlides(updated);
    } else {
      const updated = [...newTrainingSlides]; updated[index][field] = value; setNewTrainingSlides(updated);
    }
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTraining = onSnapshot(collection(db, 'training_modules'), (snap) => {
      setTrainingModules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubUsers(); unsubRoles(); unsubTraining(); };
  }, []);

  const handleApprove = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { status: 'Active' });
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    await addDoc(collection(db, 'roles'), { name: newRoleName.trim(), weight: 0 });
    setNewRoleName('');
  };

  const handleAddTrainingModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleNumber || !moduleLetter.trim() || !newTrainingTitle.trim() || newTrainingSlides.length === 0) {
      showNotification('error', 'Please fill out Number, Letter, Title, and add at least one slide.');
      return;
    }

    // Auto-generate URLs for all slides
    const processedSlides = newTrainingSlides.map((slide, index) => ({
      ...slide,
      imageUrl: getGeneratedSlideUrl(moduleNumber, moduleLetter, index)
    }));

    const formattedTitle = `Module ${moduleNumber}-${moduleLetter.toUpperCase()} ${newTrainingTitle.trim()}`;

    const moduleData = {
      moduleNumber: moduleNumber, 
      moduleLetter: moduleLetter.toLowerCase(), 
      title: formattedTitle,
      description: newTrainingDescription,
      slides: processedSlides,
      duration: newTrainingDuration.trim() || '5m',
      roles: newTrainingRoles,
      users: newTrainingUsers.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean),
      active: true,
      createdAt: new Date()
    };
    await addDoc(collection(db, 'training_modules'), moduleData);
    
    setModuleNumber('');
    setModuleLetter('');
    setNewTrainingTitle('');
    setNewTrainingDescription('');
    setNewTrainingSlides([{ text: '', imageUrl: '' }]);
    setNewTrainingDuration('5m');
    setNewTrainingRoles([]);
    setNewTrainingUsers('');
    showNotification('success', 'Training module created successfully.');
  };

  const handleDeleteTrainingModule = async (moduleId: string) => {
    await deleteDoc(doc(db, 'training_modules', moduleId));
    showNotification('success', 'Training module removed.');
  };

  const handleOpenEditModule = (mod: any) => {
    setEditingModule(mod);
    const match = mod.title?.match(/^Module\s(\d+)-([a-zA-Z])\s(.*)$/i);
    if (match) {
      setEditModuleNumber(Number(match[1]));
      setEditModuleLetter(match[2].toUpperCase());
      setEditModuleTitle(match[3]);
    } else {
      setEditModuleNumber(mod.moduleNumber || '');
      setEditModuleLetter(mod.moduleLetter?.toUpperCase() || '');
      setEditModuleTitle(mod.title || '');
    }

    setEditModuleDescription(mod.description || '');
    setEditSlides(mod.slides || []);
    setEditModuleDuration(mod.duration || '');
    setEditModuleRoles(mod.roles || []);
    setEditModuleUsers((mod.users || []).join(', '));
  };

  const handleSaveEditModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;

    if (!editModuleNumber || !editModuleLetter.trim() || !editModuleTitle.trim()) {
      showNotification('error', 'Please fill out required fields.');
      return;
    }

    // Auto-generate URLs for all slides upon saving edits
    const processedSlides = editSlides.map((slide, index) => ({
      ...slide,
      imageUrl: getGeneratedSlideUrl(editModuleNumber, editModuleLetter, index)
    }));

    const formattedTitle = `Module ${editModuleNumber}-${editModuleLetter.toUpperCase()} ${editModuleTitle.trim()}`;

    const updatedData = {
      moduleNumber: editModuleNumber, 
      moduleLetter: editModuleLetter.toLowerCase(), 
      title: formattedTitle,
      description: editModuleDescription,
      slides: processedSlides,
      duration: editModuleDuration.trim() || '5m',
      roles: editModuleRoles,
      users: editModuleUsers.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean),
    };

    try {
      await updateDoc(doc(db, 'training_modules', editingModule.id), updatedData);
      setEditingModule(null);
      showNotification('success', 'Training module updated successfully.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to update module.');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    if (typeof (window as any).showNotification === 'function') {
      (window as any).showNotification(type, message);
      return;
    }
    alert(message);
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role || 'Staff');
    setEditStatus(user.status || 'Pending');
  };

  const [viewUser, setViewUser] = useState<any | null>(null);
  const [viewUserTasks, setViewUserTasks] = useState<any[]>([]);
  const [viewUserProgress, setViewUserProgress] = useState<string[]>([]);

  const handleOpenUserView = async (user: any) => {
    setViewUser(user);
    try {
      const email = (user.email || '').toString().trim().toLowerCase();
      const tasksQ = query(collection(db, 'tasks'), where('assignedTo', '==', email));
      const tasksSnap = await getDocs(tasksQ);
      setViewUserTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const progRef = doc(db, 'training_progress', email);
      const progSnap = await getDoc(progRef);
      if (progSnap.exists()) {
        const data = progSnap.data();
        setViewUserProgress(Array.isArray(data.lessonsCompleted) ? data.lessonsCompleted : []);
      } else {
        setViewUserProgress([]);
      }
    } catch (err) { console.error('Failed to load user view details', err); }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await updateDoc(doc(db, 'users', editingUser.id), { role: editRole, status: editStatus });
    setEditingUser(null);
  };

  const currentUserRoleObj = roles.find(r => r.name.toLowerCase() === userRole?.toLowerCase());
  const currentUserWeight = currentUserRoleObj ? Number(currentUserRoleObj.weight || 0) : 0;
  const sortedRoles = [...roles].sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0));

  const filteredUsers = usersList.filter(user => {
    const matchesSearch = (user.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="w-full text-left font-sans pl-2 pr-6 py-4 space-y-6 relative select-none animate-fadeIn">
      <div>
        <h2 className="text-sm font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">Manage Staff</h2>
        <p className="text-[11px] font-medium text-amber-700 mt-1">Oversee user configurations, modify system role hierarchy authority levels, and handle pending approvals.</p>
      </div>

      <div className="flex flex-wrap gap-2 bg-amber-50 p-3 rounded-3xl border border-amber-200">
        {['directory', 'roles', 'training', 'create_task', 'publish_news'].map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section as any)}
            className={`px-4 py-2 text-xs font-bold rounded-full transition ${activeSection === section ? 'bg-orange-500 text-white shadow-sm shadow-orange-200' : 'bg-amber-100 text-slate-700 hover:bg-amber-200'}`}
          >
            {section === 'directory' ? 'Staff Directory' : section === 'roles' ? 'Role Manager' : section === 'training' ? 'Training Modules' : section === 'create_task' ? 'Create Task' : 'Publish News'}
          </button>
        ))}
      </div>

      {activeSection === 'directory' && (
        <>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-wrap gap-3 items-center shadow-sm mt-3">
            <Search className="w-5 h-5 text-teal-700" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-[200px] p-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
            <Filter className="w-5 h-5 text-teal-700 ml-4 hidden sm:block" />
            <select onChange={(e) => setRoleFilter(e.target.value)} className="p-2 border border-amber-200 rounded-lg min-w-[120px] text-sm bg-white text-slate-700">
              <option value="ALL">All Roles</option>
              {sortedRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            <select onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-amber-200 rounded-lg min-w-[120px] text-sm bg-white text-slate-700">
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <div className="mt-4">
            <div className="flex-1 flex flex-wrap gap-6 justify-start items-start w-full mt-4">
              {filteredUsers.map(user => {
                const targetUserRoleObj = roles.find(r => r.name.toLowerCase() === user.role?.toLowerCase());
                const targetUserWeight = targetUserRoleObj ? Number(targetUserRoleObj.weight || 0) : 0;
                const isHeadDev = userRole === 'Head_Dev';
                const canEdit = isHeadDev || currentUserWeight > targetUserWeight;
                const isClickable = isHeadDev || currentUserWeight > 10;

                return (
                  <div key={user.id} className={`bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4 w-full sm:w-[380px] shrink-0`}>
                    <div onClick={() => isClickable && handleOpenUserView(user)} className={`border-[1.5px] border-black bg-white p-3 flex gap-4 relative ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}>
                      <div className="w-24 h-32 border-4 border-[#e25822] bg-orange-50 shrink-0 flex items-center justify-center">
                        <User className="w-12 h-12 text-[#e25822]" />
                      </div>
                      <div className="flex flex-col justify-between flex-1 py-1">
                        <div className="flex gap-3 items-start"><img src="/The_King's_Awardlogo.png" className="w-14 h-14 object-contain" alt="K" /><img src="/Uniform_Exchange.png" className="w-20 h-12 object-contain mt-1" alt="UE" /></div>
                        <div className="flex flex-col mt-2"><h5 className="font-extrabold text-[22px] text-[#3ca4d8] truncate">{user.displayName}</h5>
                        <p className="text-[#e25822] font-bold text-[15px]">{user.role}</p></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-auto">{user.status}</span>
                      {(user.status === 'Pending' || user.status === 'Suspended') && canEdit && (
                        <button onClick={() => handleApprove(user.id)} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg font-black text-[11px] uppercase cursor-pointer hover:bg-emerald-100">Approve</button>
                      )}
                      <button onClick={() => canEdit && handleOpenEdit(user)} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-black text-[11px] uppercase cursor-pointer hover:bg-slate-200">Edit</button>
                      <button onClick={() => canEdit && window.confirm('Delete?') && deleteDoc(doc(db, 'users', user.id))} className="bg-rose-50 text-rose-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-rose-100"><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeSection === 'create_task' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm mt-3">
          <h3 className="text-lg font-bold text-teal-800">Create Task</h3>
          <p className="text-sm text-amber-700 mt-1">Create an operational task and assign to roles or users.</p>
          <div className="mt-4">
            <div className="bg-amber-100 border border-amber-200 rounded-2xl p-4">
              <form onSubmit={async (e) => { e.preventDefault(); if (!taskNameInput.trim()) return; await addDoc(collection(db, 'tasks'), { taskName: taskNameInput.trim(), status: 'unassigned', assignedTo: taskAssignedToInput.trim().toLowerCase() || '', roles: taskRolesInput, createdAt: serverTimestamp(), completedAt: null }); setTaskNameInput(''); setTaskAssignedToInput(''); setTaskRolesInput([]); showNotification('success', 'Task created.'); }}>
                <input value={taskNameInput} onChange={(e) => setTaskNameInput(e.target.value)} placeholder="Task name" className="w-full p-2 border border-amber-200 rounded-md text-sm mb-2" />
                <select multiple value={taskRolesInput} onChange={(e) => setTaskRolesInput(Array.from(e.target.selectedOptions, o => o.value))} className="w-full p-2 border border-amber-200 rounded-md text-sm mb-2 bg-white" size={6}>
                  <option key="everyone" value="Everyone">Everyone</option>
                  {sortedRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                <input value={taskAssignedToInput} onChange={(e) => setTaskAssignedToInput(e.target.value)} placeholder="Assign to (email, optional)" className="w-full p-2 border border-amber-200 rounded-md text-sm mb-2" />
                <button type="submit" className="w-full bg-orange-500 text-white p-2 rounded-md text-sm cursor-pointer hover:bg-orange-600">Create Task</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'publish_news' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm mt-3">
          <h3 className="text-lg font-bold text-teal-800">Publish News</h3>
          <p className="text-sm text-amber-700 mt-1">Broadcast an announcement to roles or specific users.</p>
          <div className="mt-4">
            <div className="bg-amber-100 border border-amber-200 rounded-2xl p-4">
              <form onSubmit={async (e) => { e.preventDefault(); if (!newsMessage.trim()) return; await addDoc(collection(db, 'news_feed'), { message: newsMessage.trim(), postedBy: 'System', targetRoles: newsTargetRoles, targetUsers: newsTargetUsers.split(',').map(u => u.trim().toLowerCase()).filter(Boolean), createdAt: serverTimestamp() }); setNewsMessage(''); setNewsTargetRoles([]); setNewsTargetUsers(''); showNotification('success', 'News published.'); }}>
                <textarea value={newsMessage} onChange={(e) => setNewsMessage(e.target.value)} placeholder="News message..." className="w-full p-2 border border-amber-200 rounded-md text-sm mb-2" />
                <select multiple value={newsTargetRoles} onChange={(e) => setNewsTargetRoles(Array.from(e.target.selectedOptions, o => o.value))} className="w-full p-2 border border-amber-200 rounded-md text-sm mb-2 bg-white" size={6}>
                  <option value="Everyone">Everyone</option>
                  {sortedRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                <input value={newsTargetUsers} onChange={(e) => setNewsTargetUsers(e.target.value)} placeholder="Comma-separated user emails" className="w-full p-2 border border-amber-200 rounded-md text-sm mb-2" />
                <button type="submit" className="w-full bg-orange-500 text-white p-2 rounded-md text-sm cursor-pointer hover:bg-orange-600">Publish News</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'roles' && (
        <div className="w-full lg:w-80 shrink-0 mt-4">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 shadow-sm">
            <h4 className="font-bold uppercase mb-1 flex items-center gap-2 text-teal-800 text-sm"><Settings size={16}/> Role Manager</h4>
            <div className="space-y-1 mb-4 max-h-60 overflow-y-auto pr-1">
              {sortedRoles.map(r => {
                const canEditRole = userRole === 'Head_Dev' || currentUserWeight > Number(r.weight || 0);
                return (
                  <div key={r.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm font-bold text-teal-700">{r.name}</span>
                    <input type="number" defaultValue={r.weight} disabled={!canEditRole} className={`w-12 border rounded p-1 text-center text-sm ${canEditRole ? 'bg-white border-teal-200' : 'bg-slate-50 border-slate-200'}`}
                      onBlur={(e) => {
                        const newWeight = Number(e.target.value);
                        if (userRole === 'Head_Dev' || newWeight <= currentUserWeight) {
                          updateDoc(doc(db, 'roles', r.id), { weight: newWeight });
                        } else {
                          e.target.value = String(r.weight);
                          alert("Security: Cannot assign weight > your own.");
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleAddRole} className="flex gap-2 pt-4 border-t border-teal-100">
              <input type="text" placeholder="New Role..." value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="flex-1 p-2 border border-teal-200 rounded-lg text-sm" />
              <button type="submit" className="bg-orange-500 text-white p-2 rounded-lg cursor-pointer hover:bg-orange-600"><Plus size={18} /></button>
            </form>
          </div>
        </div>
      )}

      {activeSection === 'training' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-teal-800">Training Modules</h3>
                <p className="text-sm text-amber-700 mt-1">Create training assignments, publish announcements, and assign tasks to staff roles or users.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-teal-700">{trainingModules.length} modules</span>
            </div>

            <form onSubmit={handleAddTrainingModule} className="space-y-4">
              <div className="grid grid-cols-[80px_80px_1fr] gap-3">
                <label className="block text-sm font-semibold text-teal-800">
                  No.
                  <input type="number" min="1" max="99" value={moduleNumber} onChange={(e) => setModuleNumber(e.target.value ? Number(e.target.value) : '')} className="mt-2 w-full p-3 border border-amber-200 rounded-2xl text-sm text-center focus:outline-teal-500" placeholder="1-99" />
                </label>
                <label className="block text-sm font-semibold text-teal-800">
                  Letter
                  <input type="text" maxLength={1} value={moduleLetter} onChange={(e) => { const val = e.target.value; if (/^[A-Za-z]*$/.test(val)) setModuleLetter(val.toUpperCase()); }} className="mt-2 w-full p-3 border border-amber-200 rounded-2xl text-sm uppercase text-center focus:outline-teal-500" placeholder="A-Z" />
                </label>
                <label className="block text-sm font-semibold text-teal-800">
                  Module Title
                  <input value={newTrainingTitle} onChange={(e) => setNewTrainingTitle(e.target.value)} className="mt-2 w-full p-3 border border-amber-200 rounded-2xl text-sm focus:outline-teal-500" placeholder='e.g. "App Overview"' />
                </label>
              </div>

              <label className="block text-sm font-semibold text-teal-800">
                  Description
                  <textarea value={newTrainingDescription} onChange={(e) => setNewTrainingDescription(e.target.value)} className="mt-2 w-full p-3 border border-amber-200 rounded-2xl text-sm focus:outline-teal-500" placeholder="A short description of the training..." />
              </label>

              <div className="block text-sm font-semibold text-teal-800">
                  Slides
                  {newTrainingSlides.map((slide, i) => (
                    <div key={i} className="mt-2 p-3 bg-white border border-amber-200 rounded-2xl space-y-2">
                      <textarea value={slide.text} onChange={(e) => updateSlide(i, 'text', e.target.value, false)} className="w-full p-2 border rounded-xl text-sm" placeholder="Slide Content" />
                    </div>
                  ))}
                  <button type="button" onClick={() => addSlide(false)} className="mt-2 text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full">+ Add Slide</button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm font-semibold text-teal-800">
                  Duration
                  <input value={newTrainingDuration} onChange={(e) => setNewTrainingDuration(e.target.value)} className="mt-2 w-full p-3 border border-amber-200 rounded-2xl text-sm focus:outline-teal-500" placeholder="e.g. 10m" />
                </label>
                <label className="block text-sm font-semibold text-teal-800">
                  Target Roles
                  <select multiple value={newTrainingRoles} onChange={(e) => setNewTrainingRoles(Array.from(e.target.selectedOptions, (option) => option.value))} className="mt-2 w-full p-3 border border-amber-200 rounded-2xl text-sm min-h-[120px] bg-white focus:outline-teal-500" size={4}>
                    <option key="everyone" value="Everyone">Everyone</option>
                    {sortedRoles.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-semibold text-teal-800">
                Target Users
                <input value={newTrainingUsers} onChange={(e) => setNewTrainingUsers(e.target.value)} className="mt-2 w-full p-3 border border-amber-200 rounded-2xl text-sm focus:outline-teal-500" placeholder="Comma-separated emails or IDs" />
              </label>
              
              <button type="submit" className="w-full bg-orange-500 text-white rounded-2xl py-3 text-sm font-bold cursor-pointer hover:bg-orange-600 transition">Add Training Module</button>
            </form>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-teal-800 mb-4">Existing Modules</h4>
            <div className="space-y-4">
              {trainingModules.length > 0 ? trainingModules.map((module) => (
                <div key={module.id} className="border border-teal-100 rounded-2xl p-4 bg-white shadow-sm hover:border-teal-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-teal-900">{module.title}</p>
                      <p className="text-xs text-slate-500 italic">{module.description || 'No description provided'}</p>
                      <p className="text-sm text-teal-700 leading-relaxed">Contains {module.slides?.length || 0} slides</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => handleOpenEditModule(module)} className="rounded-full bg-amber-100 hover:bg-amber-200 transition px-3 py-2 text-amber-700 text-xs font-black uppercase tracking-wider cursor-pointer">
                        Edit
                      </button>
                      <button type="button" onClick={() => window.confirm('Delete this training module?') && handleDeleteTrainingModule(module.id)} className="rounded-full bg-rose-100 hover:bg-rose-200 transition px-3 py-2 text-rose-700 text-xs font-black uppercase tracking-wider cursor-pointer">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-teal-700">No training modules have been created yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-teal-100 p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xl text-teal-900">Edit Training Module</h3>
              <button onClick={() => setEditingModule(null)} className="text-slate-400 hover:text-slate-600 transition bg-slate-100 p-2 rounded-full cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSaveEditModule} className="space-y-4">
              <div className="grid grid-cols-[80px_80px_1fr] gap-3">
                <label className="block text-sm font-semibold text-teal-800">
                  No.
                  <input type="number" min="1" max="99" value={editModuleNumber} onChange={(e) => setEditModuleNumber(e.target.value ? Number(e.target.value) : '')} className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl text-sm text-center focus:border-teal-500 focus:outline-none bg-slate-50" />
                </label>
                <label className="block text-sm font-semibold text-teal-800">
                  Letter
                  <input type="text" maxLength={1} value={editModuleLetter} onChange={(e) => { const val = e.target.value; if (/^[A-Za-z]*$/.test(val)) setEditModuleLetter(val.toUpperCase()); }} className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl text-sm uppercase text-center focus:border-teal-500 focus:outline-none bg-slate-50" />
                </label>
                <label className="block text-sm font-semibold text-teal-800">
                  Module Title
                  <input value={editModuleTitle} onChange={(e) => setEditModuleTitle(e.target.value)} className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-slate-50" />
                </label>
              </div>

              <label className="block text-sm font-semibold text-teal-800">
                Description
                <textarea value={editModuleDescription} onChange={(e) => setEditModuleDescription(e.target.value)} className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-slate-50" />
              </label>

              <div className="block text-sm font-semibold text-teal-800">
                Slides
                {editSlides.map((slide, i) => (
                  <div key={i} className="mt-2 p-3 border border-slate-200 rounded-2xl space-y-2">
                    <textarea value={slide.text} onChange={(e) => updateSlide(i, 'text', e.target.value, true)} className="w-full p-2 border rounded-xl text-sm" placeholder="Slide Text" />
                  </div>
                ))}
                <button type="button" onClick={() => addSlide(true)} className="mt-2 text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full">+ Add Slide</button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm font-semibold text-teal-800">
                  Duration
                  <input value={editModuleDuration} onChange={(e) => setEditModuleDuration(e.target.value)} className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-slate-50" />
                </label>
                <label className="block text-sm font-semibold text-teal-800">
                  Target Roles
                  <select multiple value={editModuleRoles} onChange={(e) => setEditModuleRoles(Array.from(e.target.selectedOptions, (option) => option.value))} className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl text-sm min-h-[100px] bg-slate-50 focus:border-teal-500 focus:outline-none" size={4}>
                    <option key="everyone" value="Everyone">Everyone</option>
                    {sortedRoles.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm font-semibold text-teal-800">
                Target Users (Emails)
                <input value={editModuleUsers} onChange={(e) => setEditModuleUsers(e.target.value)} className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-500 focus:outline-none bg-slate-50" />
              </label>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingModule(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 transition py-3 rounded-xl text-sm font-bold text-slate-700 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 transition text-white py-3 rounded-xl text-sm font-bold shadow-md cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border p-6 w-full max-w-2xl shadow-xl overflow-auto max-h-[80vh]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-lg">{viewUser.displayName || 'Staff Member'}</h3>
                <p className="text-sm text-slate-500">Tasks, training, and profile details for the selected staff member.</p>
              </div>
              <button onClick={() => setViewUser(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Name</p>
                  <p className="text-sm font-semibold text-slate-700">{viewUser.displayName || 'No name available'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Email</p>
                  <p className="text-sm text-slate-700">{viewUser.email || 'No email provided'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Role</p>
                  <p className="text-sm text-slate-700">{viewUser.role || 'Staff'}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-sm mb-2">Assigned Tasks</h4>
                <div className="space-y-2">
                  {viewUserTasks.length > 0 ? viewUserTasks.map(t => (
                    <div key={t.id} className="p-3 border rounded-lg bg-slate-50">
                      <div className="font-bold text-sm">{t.taskName}</div>
                      <div className="text-xs text-slate-500">Status: {t.status}</div>
                    </div>
                  )) : <div className="text-xs text-slate-400">No tasks assigned.</div>}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2">Training Progress</h4>
                <div className="mt-2 space-y-2">
                  {trainingModules.map((mod) => (
                    <div key={mod.id} className="p-2 border rounded bg-white">
                      <div className="font-medium text-sm">{mod.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-extrabold text-lg mb-4">Edit User</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full p-2 border rounded-xl text-sm">
                {sortedRoles.filter(r => userRole === 'Head_Dev' || Number(r.weight || 0) <= currentUserWeight).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full p-2 border rounded-xl text-sm">
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-slate-100 py-2 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}