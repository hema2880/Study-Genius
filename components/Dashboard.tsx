
import React from 'react';
import { Clock, Trophy, Play, BookOpen, Trash2, Download, RotateCw, FileText, Layers, Printer, Share2, BarChart3 } from 'lucide-react';
import { Quiz, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface DashboardProps {
  quizzes: Quiz[];
  onSelectQuiz: (quiz: Quiz, mode: 'quiz' | 'flashcard') => void;
  onDeleteQuiz: (id: string) => void;
  language: AppLanguage;
}

export const Dashboard: React.FC<DashboardProps> = ({ quizzes, onSelectQuiz, onDeleteQuiz, language }) => {
  const t = translations[language];
  const totalQuestionsAnswered = quizzes.reduce((acc, q) => acc + (q.completed ? q.questions.length : 0), 0);
  const averageScore = quizzes.filter(q => q.completed).length > 0
    ? Math.round(quizzes.filter(q => q.completed).reduce((acc, q) => acc + (q.score || 0) / q.questions.length, 0) / quizzes.filter(q => q.completed).length * 100)
    : 0;
    
  const difficultyLabel: { [key: string]: string } = {
    Easy: t.easy, 
    Medium: t.mediumDifficulty, 
    Hard: t.hardDifficulty, 
    Mixed: t.mixedDifficulty,
  };

  const StatCard = ({ icon: Icon, label, value, colorClass, delay }: any) => (
    <div 
        className="glass-panel p-6 rounded-[2rem] shadow-lg border border-white/40 dark:border-white/5 flex items-center space-x-4 space-x-reverse relative overflow-hidden group animate-fade-in-up"
        style={{ animationDelay: delay }}
    >
      <div className={`absolute right-0 top-0 w-32 h-32 -mr-6 -mt-6 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${colorClass}`}></div>
      <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 text-opacity-100 ring-1 ring-white/20 dark:ring-white/5`}>
        <Icon size={32} className={colorClass.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-4xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={BookOpen} label={t.totalQuizzes} value={quizzes.length} colorClass="bg-blue-500" delay="0ms" />
        <StatCard icon={Trophy} label={t.avgScore} value={`${averageScore}%`} colorClass="bg-yellow-500" delay="100ms" />
        <StatCard icon={BarChart3} label={t.questionsAnswered} value={totalQuestionsAnswered} colorClass="bg-purple-500" delay="200ms" />
      </div>

      <div className="flex justify-between items-center px-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.library}</h2>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-24 glass-panel rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="bg-slate-100 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
             <BookOpen className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.noQuizzes}</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t.startJourney}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, idx) => (
            <div 
                key={quiz.id} 
                className="glass-panel rounded-[2rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-white/40 dark:border-white/5 flex flex-col overflow-hidden group animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="p-7 flex-grow relative">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary-400 to-secondary-400"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border
                    ${quiz.completed 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800' 
                      : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 border-yellow-200 dark:border-yellow-800'}`}>
                    {quiz.completed ? `${Math.round((quiz.score! / quiz.questions.length) * 100)}% ${t.completed}` : t.newBadge}
                  </span>
                  
                  <button onClick={() => onDeleteQuiz(quiz.id)} className="p-2 -mr-2 -mt-2 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                  {quiz.title}
                </h3>
                
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
                  <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md"><Layers size={12}/> {quiz.questions.length} {t.questions}</span>
                  <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md"><BarChart3 size={12}/> {difficultyLabel[quiz.settings.difficulty] || quiz.settings.difficulty}</span>
                </div>
              </div>
              
              {/* Dual Actions */}
              <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <button 
                  onClick={() => onSelectQuiz(quiz, 'quiz')}
                  className="py-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-primary-600 transition-colors flex items-center justify-center gap-2 group/btn"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                     <Play size={14} className="fill-current text-primary-600 dark:text-primary-400"/> 
                  </div>
                  {t.quizAction}
                </button>
                <button 
                  onClick={() => onSelectQuiz(quiz, 'flashcard')}
                  className="py-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-secondary-600 transition-colors flex items-center justify-center gap-2 group/btn"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                     <RotateCw size={14} className="text-secondary-600 dark:text-secondary-400"/>
                  </div>
                   {t.cardsAction}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
