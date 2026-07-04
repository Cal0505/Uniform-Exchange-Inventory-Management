import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { CheckCircle, ArrowRight, X } from 'lucide-react';

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

  const filteredModules = trainingModules.filter((module) => {
    const roles = Array.isArray(module.roles) ? module.roles : [];
    const targetUsers = Array.isArray(module.targetUsers) ? module.targetUsers : [];
    if (targetUsers.includes(loggedInEmail)) return true;
    if (roles.includes(userRole) || roles.includes('Everyone')) return true;
    return roles.length === 0 && targetUsers.length === 0;
  });

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((lesson) => {
              const done = lessonsCompleted.includes(lesson.id);
              return (
                <div key={lesson.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-2">{lesson.title}</h3>
                  <p className="text-slate-500 text-sm mb-3 line-clamp-2">{lesson.description || 'No description provided.'}</p>
                  <button 
                    onClick={() => handleViewModule(lesson)} 
                    className={`w-full py-2 rounded-xl font-bold text-sm ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-primary text-white'}`}
                  >
                    {done ? 'Completed' : 'View Module'}
                  </button>
                </div>
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