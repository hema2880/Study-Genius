
import React from 'react';
import { Trash2, AlertCircle, Zap, CheckCircle2, BookX } from 'lucide-react';
import { Mistake, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface SmartReviewProps {
  mistakes: Mistake[];
  onDeleteMistake: (id: string) => void;
  onDeleteTopic: (title: string) => void;
  onClearAll: () => void;
  onGenerateRemedial: (topicTitle: string, mistakes: Mistake[]) => void;
  language: AppLanguage;
}

export const SmartReview: React.FC<SmartReviewProps> = ({ mistakes, onDeleteMistake, onDeleteTopic, onClearAll, onGenerateRemedial, language }) => {
  const t = translations[language];
  
  // Group mistakes by Quiz Title (Subject)
  const groupedMistakes = mistakes.reduce((acc, mistake) => {
    if (!acc[mistake.quizTitle]) {
      acc[mistake.quizTitle] = [];
    }
    acc[mistake.quizTitle].push(mistake);
    return acc;
  }, {} as Record<string, Mistake[]>);

  if (mistakes.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 animate-in fade-in">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.cleanRecord}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-lg">{t.cleanDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{t.mistakesBank}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">{t.reviewWeakness}</p>
        </div>
        <button 
          onClick={onClearAll}
          className="text-red-500 hover:text-red-700 font-medium flex items-center px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 size={18} className="ml-2" />
          {t.deleteAll}
        </button>
      </div>

      <div className="grid gap-8">
        {Object.entries(groupedMistakes).map(([title, items]: [string, Mistake[]]) => (
          <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Subject Header */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg text-red-600 ml-3">
                  <BookX size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{items.length} {t.mistakes}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                  onClick={() => onGenerateRemedial(title, items)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-primary-500/30 transition-all flex items-center justify-center whitespace-nowrap text-sm"
                >
                  <Zap size={16} className="ml-2 fill-current" />
                  {t.remedialQuiz}
                </button>
                <button
                  onClick={() => onDeleteTopic(title)}
                  className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 text-slate-600 dark:text-slate-300 px-3 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center"
                  title="Delete Topic"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Mistakes List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {items.map((mistake) => (
                <div key={mistake.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group relative">
                  <button 
                    onClick={() => onDeleteMistake(mistake.id)}
                    className="absolute top-6 left-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="pr-0 pl-10">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-lg mb-3">{mistake.question}</h4>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
                        <span className="block text-xs font-bold text-red-800 dark:text-red-300 uppercase mb-1">{t.yourAnswer}</span>
                        <p className="text-red-700 dark:text-red-400 font-medium">{mistake.userAnswer}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg p-3">
                        <span className="block text-xs font-bold text-green-800 dark:text-green-300 uppercase mb-1">{t.correctAnswer}</span>
                        <p className="text-green-700 dark:text-green-400 font-medium">{mistake.correctAnswer}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 space-x-reverse text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                      <AlertCircle size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                      <p>{mistake.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
