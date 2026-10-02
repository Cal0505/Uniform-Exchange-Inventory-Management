import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { CheckCircle, ArrowRight, ChevronDown, ChevronRight, X } from 'lucide-react';
import { groupTrainingModules } from '../trainingModules';

interface TrainingProps {
  userRole: string;
  loggedInEmail: string;
  users: any[];
}

export default function Training({ userRole, loggedInEmail, users }: TrainingProps) {
  const [trainingModules, setTrainingModules] = useState<any[]>([]);
  const [lessonsCompleted, setLessonsCompleted] = useState<string[]>([]);
  const [activeModule, setActiveModule] = useState<any | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [expandedTrainingGroups, setExpandedTrainingGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubModules = onSnapshot(collection(db, 'training_modules'), (snap) => {
      setTrainingModules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    if (loggedInEmail) {
      const loadProgress = async () => {
        try {
          const docRef = doc(db, 'training_progress', loggedInEmail.toLowerCase());
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setLessonsCompleted(snap.data().lessonsCompleted || []);
          }
        } catch (err) { console.error('Failed to load progress', err); }
      };
      loadProgress();
    }
    return () => unsubModules();
  }, [loggedInEmail]);

  const filteredModules = useMemo(() => trainingModules.filter((module) => {
    const roles = Array.isArray(module.roles) ? module.roles : [];
    const targetUsers = Array.isArray(module.targetUsers) ? module.targetUsers : [];
    if (targetUsers.includes(loggedInEmail)) return true;
    if (roles.includes(userRole) || roles.includes('Everyone')) return true;
    return roles.length === 0 && targetUsers.length === 0;
  }), [trainingModules, userRole, loggedInEmail]);
  const trainingModuleGroups = useMemo(() => groupTrainingModules(filteredModules), [filteredModules]);

  const handleViewModule = (mod: any) => {
    setActiveModule(mod);
    setCurrentSlideIndex(0);
  };

  const handleCompleteTraining = async () => {
    if (!activeModule || !loggedInEmail) return;
    try {
      const docRef = doc(db, 'training_progress', loggedInEmail.toLowerCase());
      await setDoc(docRef, { lessonsCompleted: arrayUnion(activeModule.id) }, { merge: true });
      setLessonsCompleted([...lessonsCompleted, activeModule.id]);
      setActiveModule(null);
      setCurrentSlideIndex(0);
    } catch (err) { console.error('Failed to mark complete', err); }
  };

  const slides = activeModule?.slides || [{ text: activeModule?.description || "No content available." }];
  const currentSlide = slides[currentSlideIndex] || { text: 'Loading...' };
  const imagePath = activeModule ? `/Training/${activeModule.moduleNumber}${activeModule.moduleLetter?.toLowerCase()}${currentSlideIndex + 1}.png` : '';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {!activeModule ? (
        <div className="space-y-6">
          {/* --- TEST HEADER START --- */}
          <div className="mb-8 p-4 bg-slate-100 rounded-2xl border border-dashed border-slate-300">
            <h3 className="text-sm font-bold text-slate-500 mb-2">Debug Path Test:</h3>
            <img 
              src="/Training/1a1.png" 
              alt="Test 1a1.png" 
              className="max-h-[100px] object-contain"
              onError={(e) => { 
                console.error("Critical Error: Cannot find 1a1.png at /Training/1a1.png");
                (e.target as HTMLImageElement).style.display = 'none'; 
              }} 
              onLoad={() => console.log("Success: 1a1.png loaded!")}
            />
          </div>
          {/* --- TEST HEADER END --- */}

          <h2 className="text-2xl font-black text-slate-800">Training Modules</h2>
          <div className="space-y-4">
            {trainingModuleGroups.map((group) => {
              const isExpanded = !!expandedTrainingGroups[group.key];
              return (
                <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedTrainingGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <span className="font-black text-slate-900">{group.label}</span>
                    <span className="ml-auto text-xs font-semibold text-slate-500">{group.modules.length} {group.modules.length === 1 ? 'module' : 'modules'}</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                  </button>
                  {isExpanded && (
                    <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/50 p-4 md:grid-cols-2 lg:grid-cols-3">
                      {group.modules.map((lesson) => {
                        const done = lessonsCompleted.includes(lesson.id);
                        return (
                          <div key={lesson.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-2 font-bold text-slate-900">{lesson.title}</h3>
                            <p className="mb-3 line-clamp-2 text-sm text-slate-500">{lesson.description || 'No description provided.'}</p>
                            <button
                              onClick={() => handleViewModule(lesson)}
                              className={`mt-auto w-full rounded-xl py-2 text-sm font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-primary text-white'}`}
                            >
                              {done ? 'Completed' : 'View Module'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-black text-lg">{activeModule.title}</h2>
              <button onClick={() => setActiveModule(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid md:grid-cols-2 gap-8">
              <div className="text-slate-700 leading-relaxed text-lg">
                {currentSlide.text}
              </div>
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center min-h-[300px] overflow-hidden">
                <img 
                  src={imagePath}
                  alt="Slide" 
                  className="max-h-[500px] object-contain"
                  onError={(e) => { 
                    console.error("Image failed to load:", imagePath);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }} 
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-between items-center bg-slate-50">
              <span className="text-sm font-bold text-slate-500">
                Slide {currentSlideIndex + 1} of {slides.length}
              </span>
              
              {currentSlideIndex < slides.length - 1 ? (
                <button 
                  onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-800"
                >
                  Next Slide <ArrowRight size={16} />
                </button>
              ) : (
                <button 
                  onClick={handleCompleteTraining}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700"
                >
                  Complete Training <CheckCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}