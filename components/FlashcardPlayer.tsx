
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, X, Clock, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import { Quiz, Question, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface FlashcardPlayerProps {
  quiz: Quiz;
  onExit: () => void;
  onUpdateProgress?: (questionId: string, srsStatus: 'learning' | 'review' | 'mastered') => void;
  language: AppLanguage;
}

export const FlashcardPlayer: React.FC<FlashcardPlayerProps> = ({ quiz, onExit, onUpdateProgress, language }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const t = translations[language];

  const currentCard = quiz.questions[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % quiz.questions.length);
    }, 200);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + quiz.questions.length) % quiz.questions.length);
    }, 200);
  };

  const handleSRS = (difficulty: 'hard' | 'good' | 'easy') => {
      if (onUpdateProgress) {
          const status = difficulty === 'easy' ? 'mastered' : difficulty === 'good' ? 'review' : 'learning';
          onUpdateProgress(currentCard.id, status);
      }
      handleNext();
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] flex flex-col items-center justify-center p-2">
      <div className="w-full flex justify-between items-center mb-4 md:mb-6">
        <button onClick={onExit} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center p-2 -ml-2">
            <X size={24} className="ml-1" />
        </button>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {t.card} {currentIndex + 1} / {quiz.questions.length}
        </span>
      </div>

      <div 
        className="relative w-full aspect-[3/4] md:aspect-[4/3] max-h-[60vh] cursor-pointer perspective-1000 group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full duration-500 transform-style-3d transition-all ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-6 md:p-8 text-center hover:shadow-2xl transition-shadow">
            <span className="absolute top-6 right-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.question}</span>
            <h3 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-white leading-snug">
              {currentCard.question}
            </h3>
            <p className="absolute bottom-6 text-sm text-slate-400 dark:text-slate-500 flex items-center animate-pulse">
              <RotateCw size={14} className="ml-2" /> {t.flip}
            </p>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-primary-600 dark:bg-primary-700 rounded-3xl shadow-xl flex flex-col items-center justify-center p-6 md:p-8 text-center text-white overflow-y-auto custom-scrollbar">
            <span className="absolute top-6 right-6 text-xs font-bold text-primary-200 uppercase tracking-wider">{t.answer}</span>
            <h3 className="text-lg md:text-2xl font-semibold leading-relaxed mb-4">
              {currentCard.correctAnswer}
            </h3>
             <div className="pt-4 border-t border-primary-500 text-xs md:text-sm text-primary-100">
              {currentCard.explanation}
            </div>
          </div>

        </div>
      </div>

      {/* SRS Controls */}
      {isFlipped ? (
          <div className="grid grid-cols-4 gap-2 md:gap-3 mt-6 md:mt-8 w-full">
            <button onClick={(e) => { e.stopPropagation(); handleSRS('hard'); }} className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
               <span className="text-xs md:text-sm font-bold">{t.hard}</span>
               <span className="text-[10px] md:text-xs opacity-70">1m</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleSRS('hard'); }} className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors">
               <span className="text-xs md:text-sm font-bold">{t.medium}</span>
               <span className="text-[10px] md:text-xs opacity-70">10m</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleSRS('good'); }} className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors">
               <span className="text-xs md:text-sm font-bold">{t.good}</span>
               <span className="text-[10px] md:text-xs opacity-70">1d</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleSRS('easy'); }} className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors">
               <span className="text-xs md:text-sm font-bold">{t.easy}</span>
               <span className="text-[10px] md:text-xs opacity-70">4d</span>
            </button>
          </div>
      ) : (
          <div className="flex items-center space-x-4 space-x-reverse mt-6 md:mt-8 w-full justify-between px-4">
            <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="p-3 md:p-4 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-all active:scale-95"
            >
            <ChevronRight size={20} className="md:w-6 md:h-6" />
            </button>
            <span className="text-slate-400 dark:text-slate-500 text-xs md:text-sm text-center">{language === 'ar' ? 'اضغط على البطاقة' : 'Tap card to flip'}</span>
            <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="p-3 md:p-4 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-all active:scale-95"
            >
            <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </button>
        </div>
      )}
    </div>
  );
};
