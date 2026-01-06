
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { InputSection } from './components/InputSection';
import { QuizPlayer } from './components/QuizPlayer';
import { FlashcardPlayer } from './components/FlashcardPlayer';
import { Dashboard } from './components/Dashboard';
import { SmartReview } from './components/SmartReview';
import { ChatBot } from './components/ChatBot';
import { StudyGuideView } from './components/StudyGuide';
import { SettingsModal } from './components/SettingsModal';
import { ReviewPlanner } from './components/ReviewPlanner';
import { LoadingOverlay } from './components/LoadingOverlay';
import { AdminDashboard } from './components/AdminDashboard';
import { generateQuizContent, generateStudyGuide, checkActivationStatus } from './services/geminiService';
import { Quiz, InputMode, QuizSettings, FileData, QuestionType, Mistake, UserProfile, StudyGuide, AppLanguage } from './types';
import { Lock, KeyRound, ChevronRight } from 'lucide-react';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// --- ACTIVATION SCREEN COMPONENT ---
const ActivationScreen = ({ onActivate }: { onActivate: () => void }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const isValid = await checkActivationStatus(code.trim().toUpperCase());
        
        if (isValid) {
            localStorage.setItem('activation_code', code.trim().toUpperCase());
            onActivate();
        } else {
            setError('كود غير صالح. يرجى التحقق من الكود والمحاولة مرة أخرى.');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-700 p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full text-center">
                 <div className="w-20 h-20 bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-500 animate-pulse">
                     <Lock size={40} />
                 </div>
                 <h1 className="text-3xl font-bold text-white mb-2">تفعيل التطبيق</h1>
                 <p className="text-slate-400 mb-8">أدخل كود التفعيل الخاص بك للدخول إلى StudyGenius</p>
                 
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="relative">
                         <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                         <input 
                            type="text" 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full bg-slate-800 border-2 border-slate-700 focus:border-primary-500 rounded-xl py-4 pr-12 pl-4 text-white font-mono text-lg text-center uppercase placeholder:text-slate-600 outline-none transition-all"
                            placeholder="XXXX-XXXX"
                         />
                     </div>
                     {error && <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>}
                     
                     <button 
                        type="submit" 
                        disabled={loading || !code}
                        className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                     >
                         <span>{loading ? 'جاري التحقق...' : 'دخول'}</span>
                         {!loading && <ChevronRight size={20} className="rotate-180" />}
                     </button>
                 </form>
                 <p className="mt-6 text-xs text-slate-600">للحصول على كود، يرجى التواصل مع المسؤول.</p>
             </div>
        </div>
    );
};


const App: React.FC = () => {
  const [activeView, _setActiveView] = useState('home'); 
  const activeViewRef = useRef(activeView);
  const [isActivated, setIsActivated] = useState(false); // NEW STATE
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ... (Existing State) ...
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentStudyGuide, setCurrentStudyGuide] = useState<StudyGuide | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>('ar');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    xp: 0,
    level: 1,
    streak: 0,
    lastStudyDate: Date.now()
  });

  // --- AUTH CHECK EFFECT ---
  useEffect(() => {
      const checkAuth = async () => {
          const code = localStorage.getItem('activation_code');
          if (code) {
              const valid = await checkActivationStatus(code);
              if (valid) setIsActivated(true);
              else localStorage.removeItem('activation_code');
          }
          setCheckingAuth(false);
      };
      checkAuth();
  }, []);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  const setActiveView = (view: string) => {
    // Prevent overwriting admin view if we are already there
    if (activeViewRef.current === 'admin' && view !== 'home') return;
    
    const currentHash = window.location.hash.substring(1);
    if (currentHash !== view) {
      try {
        window.history.pushState({ view }, '', `#${view}`);
      } catch (e) { console.warn("History API failed", e); }
    }
    _setActiveView(view);
  };

  useEffect(() => {
    // --- ROUTING LOGIC ---
    // Priority: 1. URL Path (/admin) -> 2. Hash (#admin) -> 3. Hash (#other) -> 4. Default ('home')
    const path = window.location.pathname;
    const hash = window.location.hash.substring(1);

    let initialView = 'home';

    if (path.includes('/admin') || hash === 'admin') {
        initialView = 'admin';
    } else if (hash) {
        initialView = hash;
    }

    _setActiveView(initialView);
    
    // Clean up history state to match
    try {
        if (initialView === 'admin') {
            // Optional: Clean URL to just /admin if desired, but keeping it simple
        } else {
             window.history.replaceState({ view: initialView }, '', `#${initialView}`);
        }
    } catch(e) { console.warn("History API failed", e); }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        _setActiveView(event.state.view);
      } else {
        // Fallback checks on popstate
        if (window.location.pathname.includes('/admin')) {
             _setActiveView('admin');
        } else {
             _setActiveView(window.location.hash.substring(1) || 'home');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
      const savedQuizzes = localStorage.getItem('studygenius_quizzes');
      const savedMistakes = localStorage.getItem('studygenius_mistakes');
      const savedProfile = localStorage.getItem('studygenius_profile');
      const savedTheme = localStorage.getItem('studygenius_theme');
      const savedLang = localStorage.getItem('studygenius_language');
      
      if (savedQuizzes) setQuizzes(JSON.parse(savedQuizzes));
      if (savedMistakes) setMistakes(JSON.parse(savedMistakes));
      if (savedProfile) setUserProfile(JSON.parse(savedProfile));
      if (savedTheme === 'dark') {
         setDarkMode(true);
         document.documentElement.classList.add('dark');
      }
      if (savedLang === 'en' || savedLang === 'ar') {
        setLanguage(savedLang as AppLanguage);
      }
    } catch (e) {
      console.warn("Failed to load from local storage", e);
    }
  }, []);

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('studygenius_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('studygenius_theme', 'light');
      }
    } catch(e){
      console.warn("Failed to save theme to local storage", e);
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    try { localStorage.setItem('studygenius_language', language); } catch(e){}
  }, [language]);

  useEffect(() => {
    try { localStorage.setItem('studygenius_quizzes', JSON.stringify(quizzes)); } catch(e){ console.warn("Failed to save quizzes", e); }
  }, [quizzes]);

  useEffect(() => {
    try { localStorage.setItem('studygenius_mistakes', JSON.stringify(mistakes)); } catch(e){ console.warn("Failed to save mistakes", e); }
  }, [mistakes]);

  useEffect(() => {
    try { localStorage.setItem('studygenius_profile', JSON.stringify(userProfile)); } catch(e){ console.warn("Failed to save profile", e); }
  }, [userProfile]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const awardXP = (amount: number) => {
    setUserProfile(prev => {
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / 1000) + 1;
      return { ...prev, xp: newXP, level: newLevel };
    });
  };

  const handleGenerationError = (error: any) => {
    console.error("Generation Error:", error);
    // Rate limit handling
    if (error.message.includes('429') || error.message.includes('wait')) {
        alert(`⏳ ${error.message}`);
    } else {
        alert(`Generation Failed: ${error.message}`);
    }
  };

  const handleGenerate = async (mode: InputMode, content: string | FileData[], settings: QuizSettings) => {
    setIsGenerating(true);
    try {
      const questions = await generateQuizContent(mode, content, settings);
      
      let title = "Generated Quiz";
      if (mode === InputMode.TOPIC) title = content as string;
      if (mode === InputMode.FILE) {
        const files = content as FileData[];
        title = files.length > 1 ? `${files[0].name} + ${files.length - 1} others` : files[0].name;
      }
      if (mode === InputMode.TEXT) {
          const text = content as string;
          title = text.startsWith("REMEDIAL_INSTRUCTION:") 
                  ? "Remedial: " + (text.split("Topic:")[1]?.split("\n")[0] || "Review") 
                  : text.substring(0, 30) + "...";
      }

      const newQuiz: Quiz = {
        id: generateId(), title, createdAt: Date.now(), questions, settings, completed: false, timeSpentSeconds: 0
      };

      setQuizzes([newQuiz, ...quizzes]);
      setCurrentQuiz(newQuiz);
      setActiveView(settings.questionType === QuestionType.FLASHCARD ? 'flashcards' : 'quiz');
    } catch (error: any) {
      handleGenerationError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateStudyGuide = async (mode: InputMode, content: string | FileData[], language: string, thinking: boolean) => {
    setIsGenerating(true);
    try {
       const guideData = await generateStudyGuide(mode, content, language, thinking);
       const newGuide: StudyGuide = {
          id: generateId(), title: guideData.title, content: guideData.content, topics: guideData.topics, createdAt: Date.now()
       };
       setCurrentStudyGuide(newGuide);
       setActiveView('study_guide');
       awardXP(50); 
    } catch (error: any) {
      handleGenerationError(error);
    } finally {
       setIsGenerating(false);
    }
  };

  const handleQuizComplete = (completedQuiz: Quiz) => {
    setQuizzes(quizzes.map(q => q.id === completedQuiz.id ? completedQuiz : q));
    setCurrentQuiz(completedQuiz);
    awardXP(100 + ((completedQuiz.score || 0) * 10));

    const newMistakes = completedQuiz.questions
      .filter(q => q.isCorrect === false)
      .map(q => ({
        id: generateId(), questionId: q.id, quizTitle: completedQuiz.title,
        question: q.question, userAnswer: q.userAnswer || 'Skipped', correctAnswer: q.correctAnswer,
        explanation: q.explanation, timestamp: Date.now()
      }));

    if (newMistakes.length > 0) setMistakes(prev => [...prev, ...newMistakes]);
  };

  const handleSRSUpdate = (questionId: string, status: 'learning' | 'review' | 'mastered') => {
     awardXP(5);
  };

  const handleDeleteQuiz = (id: string) => {
    if (confirm("Delete this quiz?")) {
      setQuizzes(quizzes.filter(q => q.id !== id));
    }
  };

  const handleDeleteMistake = (id: string) => setMistakes(mistakes.filter(m => m.id !== id));

  const handleDeleteTopic = (title: string) => {
    if (confirm(`Delete all mistakes for "${title}"?`)) {
      setMistakes(mistakes.filter(m => m.quizTitle !== title));
    }
  };

  const handleClearMistakes = () => {
    if(confirm("Clear all mistakes history?")) setMistakes([]);
  };

  const handleGenerateRemedial = (topicTitle: string, topicMistakes: Mistake[]) => {
    const mistakesContext = topicMistakes.map(m => 
      `Question: ${m.question}\nCorrect Answer: ${m.correctAnswer}\nStudent Wrong Answer: ${m.userAnswer}\nKey Concept: ${m.explanation}`
    ).join('\n---\n');
    const fullPrompt = `REMEDIAL_INSTRUCTION: Topic: ${topicTitle}\nMistakes to address:\n${mistakesContext}`;
    const settings: QuizSettings = {
      questionType: QuestionType.MULTIPLE_CHOICE, difficulty: 'Medium' as any,
      quantity: Math.min(topicMistakes.length + 2, 10), language: language === 'ar' ? 'Arabic' : 'English'
    };
    handleGenerate(InputMode.TEXT, fullPrompt, settings);
  };

  // Render Admin View directly
  if (activeView === 'admin') {
      return <AdminDashboard onExit={() => {
        // Clear history and go home
        window.history.pushState({ view: 'home' }, '', '/#home');
        _setActiveView('home');
      }} />;
  }

  // --- RENDER BLOCKING ACTIVATION SCREEN ---
  if (checkingAuth) return null; // Or a generic loading spinner
  if (!isActivated) return <ActivationScreen onActivate={() => setIsActivated(true)} />;

  return (
    <Layout 
      activeView={activeView} setActiveView={setActiveView} userProfile={userProfile}
      darkMode={darkMode} toggleDarkMode={toggleDarkMode} onOpenSettings={() => setIsSettingsOpen(true)}
      language={language}
    >
      {isGenerating && <LoadingOverlay language={language} />}
      {activeView === 'home' && <InputSection onGenerate={handleGenerate} onGenerateStudyGuide={handleGenerateStudyGuide} isGenerating={isGenerating} language={language} />}
      {activeView === 'dashboard' && <Dashboard quizzes={quizzes} onSelectQuiz={(quiz, mode) => { setCurrentQuiz(quiz); setActiveView(mode === 'flashcard' ? 'flashcards' : 'quiz'); }} onDeleteQuiz={handleDeleteQuiz} language={language} />}
      {activeView === 'mistakes' && <SmartReview mistakes={mistakes} onDeleteMistake={handleDeleteMistake} onDeleteTopic={handleDeleteTopic} onClearAll={handleClearMistakes} onGenerateRemedial={handleGenerateRemedial} language={language} />}
      {activeView === 'review_plan' && <ReviewPlanner onOpenSettings={() => setIsSettingsOpen(true)} language={language} />}
      {activeView === 'chat' && <ChatBot language={language} />}
      {activeView === 'study_guide' && currentStudyGuide && <StudyGuideView guide={currentStudyGuide} onExit={() => setActiveView('home')} />}
      {activeView === 'quiz' && currentQuiz && (
        <QuizPlayer 
          quiz={currentQuiz} 
          onComplete={handleQuizComplete} 
          onExit={() => { setCurrentQuiz(null); setActiveView('dashboard'); }}
          language={language}
        />
      )}
      {activeView === 'flashcards' && currentQuiz && (
        <FlashcardPlayer 
          quiz={currentQuiz} 
          onExit={() => { setCurrentQuiz(null); setActiveView('dashboard'); }} 
          onUpdateProgress={handleSRSUpdate} 
          language={language}
        />
      )}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        language={language}
        setLanguage={setLanguage}
      />
    </Layout>
  );
};

export default App;
