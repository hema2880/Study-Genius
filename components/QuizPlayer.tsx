
import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, RefreshCw, HelpCircle, Save, BrainCircuit, BarChart3, Volume2, SkipForward, Loader2, AlertTriangle, Share2, Home, Pause, Play } from 'lucide-react';
import { Quiz, Question, QuestionType, GradingResult, AppLanguage } from '../types';
import { gradeOpenEndedAnswer } from '../services/geminiService';
import { translations } from '../utils/translations';

const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = React.useRef<(() => void) | null>(null);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    function tick() { if (savedCallback.current) savedCallback.current(); }
    if (delay !== null) { let id = setInterval(tick, delay); return () => clearInterval(id); }
  }, [delay]);
};

interface QuizPlayerProps {
  quiz: Quiz;
  onComplete: (quiz: Quiz) => void;
  onExit: () => void;
  language: AppLanguage;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onComplete, onExit, language }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [openEndedAnswer, setOpenEndedAnswer] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResults, setGradingResults] = useState<Record<string, GradingResult>>({});
  const [animatingOut, setAnimatingOut] = useState(false); // For transition
  const [isPaused, setIsPaused] = useState(false);
  const t = translations[language];

  useInterval(() => {
    setElapsedTime(prev => prev + 1);
  }, (isFinished || isPaused) ? null : 1000);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  const handleAnswerSelect = (option: string) => {
    if (answers[currentQuestion.id] || isFinished || isPaused) return;
    setAnswers({ ...answers, [currentQuestion.id]: option });
    setShowExplanation(true);
  };
  
  const handleSkip = () => {
    if (answers[currentQuestion.id] || isFinished || isPaused) return;
    handleAnswerSelect("SKIPPED"); 
  };

  const handleOpenEndedSubmit = async () => {
    if (!openEndedAnswer.trim() || answers[currentQuestion.id] || isPaused) return;
    setIsGrading(true);
    try {
        const result = await gradeOpenEndedAnswer(openEndedAnswer, currentQuestion.correctAnswer);
        setGradingResults(prev => ({ ...prev, [currentQuestion.id]: result }));
    } catch (e) { console.error(e); }
    setIsGrading(false);
    setAnswers({ ...answers, [currentQuestion.id]: openEndedAnswer });
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setAnimatingOut(true);
    setTimeout(() => {
        setAnimatingOut(false);
        setShowExplanation(false);
        setOpenEndedAnswer('');
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch(e) {}
        
        if (isLastQuestion) {
            finalizeQuiz();
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, 300); // Wait for animation
  };
  
  const finalizeQuiz = () => {
      setIsFinished(true);
      let score = 0;
      const finalQuestions = quiz.questions.map(q => {
          const userAnswer = answers[q.id];
          let isCorrect = false;
          if (q.type === QuestionType.OPEN_ENDED) {
              const grading = gradingResults[q.id];
              isCorrect = grading?.verdict === 'Correct';
          } else {
              isCorrect = userAnswer === q.correctAnswer;
          }
          if (isCorrect) score++;
          return { ...q, userAnswer: userAnswer, isCorrect: isCorrect, gradingResult: gradingResults[q.id] };
      });
      const updatedQuiz: Quiz = { ...quiz, questions: finalQuestions, completed: true, score, timeSpentSeconds: elapsedTime };
      onComplete(updatedQuiz);
  };

  const speakText = (text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = /[a-zA-Z]/.test(text.substring(0, 10)) ? 'en-US' : 'ar-SA';
          window.speechSynthesis.speak(utterance);
      }
    } catch(e) {}
  };

  if (isFinished) {
    const score = quiz.questions.filter(q => q.isCorrect).length;
    const percentage = Math.round((score / quiz.questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto py-10 animate-scale-in">
        <div className="glass-panel rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/60 dark:border-white/10">
           {/* Confetti Background Effect (CSS only) */}
           <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

           <div className="p-8 md:p-12 text-center relative">
             <div className="mb-6 inline-flex p-5 md:p-6 rounded-full bg-gradient-to-tr from-white to-slate-100 dark:from-slate-800 dark:to-slate-700 shadow-xl ring-8 ring-slate-50 dark:ring-slate-900/50 animate-float">
                <TrophyIcon percentage={percentage} />
             </div>
             <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              {percentage >= 80 ? t.legendary : percentage >= 50 ? t.great : t.tryAgain}
             </h2>
             <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg mb-8 md:mb-10 font-medium">"{quiz.title}" {t.completed}</p>
             
             <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-10">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
                   <div className="text-2xl md:text-3xl font-black text-primary-600 dark:text-primary-400">{percentage}%</div>
                   <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.score}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
                   <div className="text-2xl md:text-3xl font-black text-green-600">{score}/{quiz.questions.length}</div>
                   <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.correct}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-3xl border border-slate-200 dark:border-slate-700">
                   <div className="text-2xl md:text-3xl font-black text-orange-600">{Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}</div>
                   <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.time}</div>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                <button onClick={onExit} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 md:px-8 md:py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2">
                  <Home size={20} /> {t.home}
                </button>
                <button className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-6 py-3.5 md:px-8 md:py-4 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                   <Share2 size={20} /> {t.share}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }
  
  const currentGradingResult = gradingResults[currentQuestion.id];

  return (
    <div className="max-w-5xl mx-auto pb-6 md:pb-10 px-1 md:px-2 relative" key={currentQuestionIndex}>
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
         <button onClick={onExit} className="p-2 -ml-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
             <XCircle size={24} className="w-8 h-8 md:w-6 md:h-6" />
         </button>
         
         <div className="flex flex-col items-center flex-1 mx-4">
             <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t.question} {currentQuestionIndex + 1} / {quiz.questions.length}</div>
             <div className="w-full max-w-xs h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
             </div>
         </div>

         <div className="flex items-center gap-2">
            <div className="font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 md:px-3 rounded-lg text-xs md:text-sm">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </div>
            <button 
                onClick={() => setIsPaused(true)}
                className="p-1.5 md:p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-200 transition-colors"
                title={t.paused}
            >
                <Pause size={18} />
            </button>
         </div>
      </div>

      {/* Paused Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl text-center shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                    <Pause size={40} fill="currentColor" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.paused}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">{t.pausedDesc}</p>
                <button 
                    onClick={() => setIsPaused(false)} 
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-xl flex items-center justify-center gap-2"
                >
                    <Play size={20} fill="currentColor" />
                    <span>{t.resume}</span>
                </button>
            </div>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start transition-all duration-300 ${animatingOut ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
         
         {/* Question Card */}
         <div className="lg:col-span-7 glass-panel rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 min-h-[250px] md:min-h-[400px] flex flex-col shadow-xl border border-white/60 dark:border-white/10 relative overflow-hidden">
             {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-primary-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex-grow relative z-10">
               <div className="flex justify-between items-start mb-4 md:mb-6">
                  {currentQuestion.bloomLevel && (
                     <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-bold px-2 md:px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800 uppercase tracking-wider">
                        {currentQuestion.bloomLevel}
                     </span>
                  )}
                  <button onClick={() => speakText(currentQuestion.question)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                     <Volume2 size={18} />
                  </button>
               </div>
               
               <h2 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentQuestion.question}
               </h2>
            </div>
            
            {showExplanation && (
               <div className="mt-6 md:mt-8 animate-fade-in-up">
                  {currentQuestion.scientificWarning && (
                     <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 md:p-4 rounded-2xl border border-yellow-200 dark:border-yellow-800 flex gap-3">
                        <AlertTriangle className="text-yellow-600 flex-shrink-0" size={18} />
                        <p className="text-xs md:text-sm text-yellow-800 dark:text-yellow-200">{currentQuestion.scientificWarning}</p>
                     </div>
                  )}
                  
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-4 md:p-6 rounded-2xl border border-primary-100 dark:border-primary-800/50">
                     <div className="flex items-center gap-2 mb-2 text-primary-700 dark:text-primary-300 font-bold text-sm">
                        <HelpCircle size={18} />
                        <span>{t.explanation}</span>
                     </div>
                     <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{currentQuestion.explanation}</p>
                  </div>
               </div>
            )}
         </div>

         {/* Options / Answer Area */}
         <div className="lg:col-span-5 space-y-3">
            {(currentQuestion.type === QuestionType.MULTIPLE_CHOICE || currentQuestion.type === QuestionType.TRUE_FALSE) && (
               currentQuestion.options?.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === option;
                  const isCorrect = option === currentQuestion.correctAnswer;
                  const showResult = !!answers[currentQuestion.id];

                  let cardClass = "bg-white/60 dark:bg-slate-800/60 border-white/40 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:scale-[1.02] hover:shadow-md"; // Default
                  
                  if (showResult) {
                     if (isSelected && isCorrect) cardClass = "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30 scale-[1.02]";
                     else if (isSelected && !isCorrect) cardClass = "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30 scale-[1.02]";
                     else if (!isSelected && isCorrect) cardClass = "bg-green-100 dark:bg-green-900/40 border-green-500 ring-1 ring-green-500";
                     else cardClass = "opacity-40 grayscale";
                  }

                  return (
                     <button key={idx} onClick={() => handleAnswerSelect(option)} disabled={showResult || isPaused}
                        className={`w-full text-right p-4 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group backdrop-blur-md ${cardClass}`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                     >
                        <span className={`text-base md:text-lg font-bold ${showResult ? (isCorrect || isSelected ? 'text-white':'text-slate-900 dark:text-white') : 'text-slate-700 dark:text-slate-200'}`}>{option}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ml-2 ${showResult && isSelected ? 'border-white bg-white/20' : 'border-slate-300 group-hover:border-primary-500'}`}>
                           {showResult && isSelected && isCorrect && <CheckCircle2 size={16} className="text-white" />}
                           {showResult && isSelected && !isCorrect && <XCircle size={16} className="text-white" />}
                        </div>
                     </button>
                  )
               })
            )}

            {currentQuestion.type === QuestionType.OPEN_ENDED && !showExplanation && (
              <div className="space-y-4 animate-fade-in-up">
                <textarea
                  value={openEndedAnswer}
                  onChange={(e) => setOpenEndedAnswer(e.target.value)}
                  placeholder={language === 'ar' ? "اكتب إجابتك بالتفصيل..." : "Type your answer..."}
                  className="w-full h-40 md:h-48 p-4 md:p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 resize-none shadow-sm transition-all"
                  disabled={isGrading || isPaused}
                />
                <button onClick={handleOpenEndedSubmit} disabled={!openEndedAnswer.trim() || isGrading || isPaused}
                  className="w-full py-3.5 md:py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-2xl font-bold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  {isGrading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                  {isGrading ? t.grading : t.confirm}
                </button>
              </div>
            )}
            
            {showExplanation && (
                <div className="pt-2 md:pt-4 animate-fade-in-up">
                    <button onClick={nextQuestion}
                        className="w-full py-3.5 md:py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 space-x-reverse transition-all duration-300 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
                    >
                        <span>{isLastQuestion ? t.results : t.next}</span>
                        <ArrowLeft size={20} />
                    </button>
                </div>
            )}
             
            {!showExplanation && currentQuestion.type !== QuestionType.OPEN_ENDED && (
               <button onClick={handleSkip} className="w-full text-center py-3 md:py-4 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors">
                  {t.skip}
               </button>
            )}
         </div>
      </div>
    </div>
  );
};

const TrophyIcon = ({ percentage }: { percentage: number }) => {
  if (percentage >= 80) return <div className="text-5xl md:text-6xl animate-bounce">🏆</div>;
  if (percentage >= 50) return <div className="text-5xl md:text-6xl animate-pulse">⭐</div>;
  return <div className="text-5xl md:text-6xl">📚</div>;
};
