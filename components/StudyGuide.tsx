import React from 'react';
import { ArrowLeft, BookOpen, Download, Printer, Share2, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StudyGuide } from '../types';

interface StudyGuideProps {
  guide: StudyGuide;
  onExit: () => void;
}

export const StudyGuideView: React.FC<StudyGuideProps> = ({ guide, onExit }) => {
  const handlePrint = () => {
    window.print();
  };

  const speakGuide = () => {
     try {
       if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
         window.speechSynthesis.cancel();
         const utterance = new SpeechSynthesisUtterance(guide.content);
         utterance.lang = /[a-zA-Z]/.test(guide.content.substring(0,20)) ? 'en-US' : 'ar-SA';
         window.speechSynthesis.speak(utterance);
       }
     } catch (e) {
        console.warn("Speech synthesis failed", e);
        alert("خاصية القراءة الصوتية غير مدعومة على هذا الجهاز.");
     }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <button onClick={onExit} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center font-medium">
            <ArrowLeft size={20} className="ml-1" /> العودة
        </button>
        <div className="flex space-x-3 space-x-reverse">
            <button 
               onClick={speakGuide}
               className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
               title="قراءة الملخص"
            >
               <Volume2 size={18} />
               <span>استماع</span>
            </button>
            <button 
               onClick={handlePrint}
               className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
            >
               <Printer size={18} />
               <span>طباعة / PDF</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden print:shadow-none print:border-none transition-colors">
         <div className="bg-slate-900 dark:bg-slate-950 text-white p-10 print:bg-white print:text-black print:p-0 print:pb-8">
            <div className="flex items-center space-x-3 space-x-reverse mb-4 opacity-80 print:hidden">
               <BookOpen size={24} />
               <span className="uppercase tracking-wider font-bold text-sm">Study Guide</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{guide.title}</h1>
            <div className="flex flex-wrap gap-2">
               {guide.topics.map(topic => (
                  <span key={topic} className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm print:border print:border-black print:text-black">
                     {topic}
                  </span>
               ))}
            </div>
         </div>

         <div className="p-8 md:p-12 print:p-0">
             <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-strong:text-slate-900 dark:prose-strong:text-white">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {guide.content}
                </ReactMarkdown>
             </div>
         </div>
      </div>
    </div>
  );
};