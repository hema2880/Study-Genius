
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Link, Type, Upload, Loader2, Sparkles, File as FileIcon, X, BrainCircuit, Book, Music, Video, Zap, Infinity, ArrowRight, Wand2, Calculator, BarChart3, PieChart } from 'lucide-react';
import { InputMode, QuizSettings, QuestionType, Difficulty, FileData, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface InputSectionProps {
  onGenerate: (mode: InputMode, content: string | FileData[], settings: QuizSettings) => void;
  onGenerateStudyGuide: (mode: InputMode, content: string | FileData[], language: string, thinking: boolean) => void;
  isGenerating: boolean;
  language: AppLanguage;
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const InputSection: React.FC<InputSectionProps> = ({ onGenerate, onGenerateStudyGuide, isGenerating, language }) => {
  const [mode, setMode] = useState<InputMode>(InputMode.TOPIC);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FileData[]>([]); 
  const [processingFiles, setProcessingFiles] = useState<{name: string, progress: number}[]>([]);
  const t = translations[language];
  
  const [settings, setSettings] = useState<QuizSettings>({
    questionType: QuestionType.MULTIPLE_CHOICE,
    difficulty: Difficulty.MEDIUM,
    quantity: 10,
    maxMode: false,
    language: language === 'ar' ? 'Arabic' : 'English', // Initialize based on prop
    thinkingMode: false,
    distribution: { multipleChoice: 5, trueFalse: 3, openEnded: 2 },
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync settings.language when app language changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      language: language === 'ar' ? 'Arabic' : 'English'
    }));
  }, [language]);

  useEffect(() => {
    if (settings.questionType === QuestionType.SHORT_QUIZ) {
      setSettings(prev => ({
        ...prev, distribution: { multipleChoice: 5, trueFalse: 3, openEnded: 2 }, quantity: 10
      }));
    } else if (settings.questionType === QuestionType.COMPREHENSIVE) {
      setSettings(prev => ({
        ...prev, difficulty: Difficulty.HARD, distribution: { multipleChoice: 20, trueFalse: 15, openEnded: 5 }, quantity: 40
      }));
    }
  }, [settings.questionType]);

  useEffect(() => {
    if (settings.questionType === QuestionType.SHORT_QUIZ || settings.questionType === QuestionType.COMPREHENSIVE) {
      const total = (settings.distribution?.multipleChoice || 0) + (settings.distribution?.trueFalse || 0) + (settings.distribution?.openEnded || 0);
      setSettings(prev => ({ ...prev, quantity: total }));
    }
  }, [settings.distribution]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList: File[] = Array.from(e.target.files);
      const newProcessingFiles = fileList.map(f => ({ name: f.name, progress: 0 }));
      setProcessingFiles(prev => [...prev, ...newProcessingFiles]);
      const newFiles: FileData[] = [];
      let processedCount = 0;
      
      fileList.forEach((file: File) => {
        const reader = new FileReader();
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setProcessingFiles(prev => prev.map(pf => pf.name === file.name ? { ...pf, progress: percent } : pf));
            }
        };
        reader.onload = () => {
          try {
             const base64String = reader.result as string;
             if (base64String) {
                newFiles.push({ id: generateId(), name: file.name, mimeType: file.type, data: base64String.split(',')[1] });
             }
          } catch(err) { console.error("File Read Error", err); }
        };
        reader.onloadend = () => {
          processedCount++;
          if (processedCount === fileList.length) {
            setFiles(prev => [...prev, ...newFiles]);
            setProcessingFiles(prev => prev.filter(pf => !fileList.some(f => f.name === pf.name)));
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => setFiles(files.filter(f => f.id !== id));

  const handleGenerateClick = () => {
    if ((mode === InputMode.FILE && files.length > 0) || content.trim()) {
      onGenerate(mode, mode === InputMode.FILE ? files : content, settings);
    }
  };

  const handleStudyGuideClick = () => {
     if ((mode === InputMode.FILE && files.length > 0) || content.trim()) {
      onGenerateStudyGuide(mode, mode === InputMode.FILE ? files : content, settings.language, settings.thinkingMode || false);
    }
  };

  const isMixedType = settings.questionType === QuestionType.SHORT_QUIZ || settings.questionType === QuestionType.COMPREHENSIVE;
  const isMixedDifficulty = settings.difficulty === Difficulty.MIXED;
  const isReady = (mode === InputMode.FILE ? files.length > 0 : content.length > 2) && processingFiles.length === 0;

  const difficultySum = (settings.difficultyDistribution?.easy || 0) + (settings.difficultyDistribution?.medium || 0) + (settings.difficultyDistribution?.hard || 0);

  const ModeCard = ({ id, icon: Icon, title, desc, delay }: { id: InputMode, icon: any, title: string, desc: string, delay: string }) => (
    <button
      onClick={() => { setMode(id); setContent(''); setFiles([]); }}
      className={`relative p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-500 text-right group h-full flex flex-col min-h-[140px] md:min-h-[180px] overflow-hidden
        ${mode === id 
          ? 'bg-white dark:bg-slate-800 border-primary-500/50 shadow-xl shadow-primary-500/20 scale-[1.02] ring-2 ring-primary-500/20' 
          : 'bg-white/40 dark:bg-slate-800/40 border-white/20 dark:border-white/5 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-xl hover:-translate-y-1'
        } animate-fade-in-up`}
        style={{ animationDelay: delay }}
    >
      <div className={`absolute -right-10 -top-10 w-24 h-24 md:w-32 md:h-32 rounded-full transition-all duration-500 blur-2xl opacity-20 group-hover:opacity-40
        ${mode === id ? 'bg-primary-500 scale-150' : 'bg-slate-400 scale-100'}`}></div>

      <div className={`relative z-10 p-2.5 md:p-3.5 rounded-2xl w-fit mb-3 md:mb-4 transition-all duration-300 shadow-md
         ${mode === id 
           ? 'bg-gradient-to-br from-primary-500 to-secondary-600 text-white rotate-[-6deg]' 
           : 'bg-white dark:bg-slate-700 text-slate-500 group-hover:text-primary-600 group-hover:scale-110'}`}>
        <Icon size={22} className="md:w-[26px] md:h-[26px]" />
      </div>
      
      <h3 className={`relative z-10 text-base md:text-lg font-bold mb-1 md:mb-2 transition-colors ${mode === id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
        {title}
      </h3>
      <p className="relative z-10 text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-2">
        {desc}
      </p>
      
      {mode === id && (
        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 text-primary-500 animate-pulse">
            <div className="bg-primary-50 dark:bg-primary-900/30 p-1 md:p-1.5 rounded-full">
                <ArrowRight size={14} className="md:w-4 md:h-4" />
            </div>
        </div>
      )}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20">
      
      <div className="text-center space-y-4 md:space-y-6 pt-4 md:pt-12 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 backdrop-blur-md shadow-sm mb-2 md:mb-4">
            <Sparkles size={14} className="text-yellow-500 animate-spin-slow" />
            <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 tracking-wide">AI-POWERED LEARNING</span>
        </div>
        <h1 className="text-3xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          {t.heroTitle} <br/>
          <span className="text-gradient inline-block hover:scale-105 transition-transform duration-500 cursor-default">StudyGenius</span>
        </h1>
        <p className="text-sm md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium px-4 opacity-80 leading-relaxed">
          {t.heroDesc}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 px-1 md:px-2">
        <ModeCard id={InputMode.TOPIC} icon={Wand2} title={t.topicMode} desc={t.topicDesc} delay="0ms" />
        <ModeCard id={InputMode.TEXT} icon={Type} title={t.textMode} desc={t.textDesc} delay="100ms" />
        <ModeCard id={InputMode.FILE} icon={Upload} title={t.fileMode} desc={t.fileDesc} delay="200ms" />
        <ModeCard id={InputMode.URL} icon={Link} title={t.urlMode} desc={t.urlDesc} delay="300ms" />
      </div>

      <div className="glass-panel rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 shadow-xl md:shadow-2xl relative overflow-hidden transition-all duration-500 animate-scale-in mx-1 md:mx-2 border border-white/60 dark:border-white/10">
        
        <div className="min-h-[150px] md:min-h-[180px] flex flex-col justify-center">
          {mode === InputMode.TOPIC && (
            <div className="space-y-4 max-w-2xl mx-auto text-center w-full animate-fade-in-up">
              <label className="block text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200">
                {language === 'ar' ? 'عن ماذا تريد أن تتعلم اليوم؟' : 'What do you want to learn today?'}
              </label>
              <div className="relative group">
                 <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t.topicPlaceholder}
                  className="w-full text-lg md:text-xl p-5 md:p-6 pr-12 md:pr-14 rounded-2xl md:rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all placeholder:text-slate-400"
                />
                <Wand2 className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
          )}

          {mode === InputMode.TEXT && (
             <div className="space-y-3 animate-fade-in-up">
               <label className="block text-lg font-bold text-slate-800 dark:text-slate-200">{t.textLabel}</label>
               <textarea
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 placeholder={t.textPlaceholder}
                 className="w-full h-48 md:h-56 text-base md:text-lg p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all resize-none"
               />
             </div>
          )}

          {mode === InputMode.URL && (
            <div className="space-y-4 max-w-2xl mx-auto text-center w-full animate-fade-in-up">
              <label className="block text-xl font-bold text-slate-800 dark:text-slate-200">{t.urlLabel}</label>
              <div className="relative group">
                <input
                  type="url"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full text-lg md:text-xl p-5 md:p-6 pr-12 md:pr-14 rounded-2xl md:rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all ltr text-right"
                />
                <Link className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
          )}

          {mode === InputMode.FILE && (
            <div className="space-y-4 md:space-y-6 w-full animate-fade-in-up">
              <div 
                className="group relative flex flex-col items-center justify-center h-40 md:h-56 border-3 border-dashed border-slate-300 dark:border-slate-600 rounded-[1.5rem] md:rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-primary-500 transition-all cursor-pointer overflow-hidden active:scale-98"
                onClick={() => fileInputRef.current?.click()}
              >
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,image/*,video/*,audio/*" />
                
                <div className="bg-white dark:bg-slate-700 p-3 md:p-5 rounded-2xl shadow-lg mb-2 md:mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                   <Upload className="w-6 h-6 md:w-10 md:h-10 text-primary-600 dark:text-primary-400" />
                </div>
                <p className="text-base md:text-xl font-bold text-slate-700 dark:text-slate-200 z-10">{t.fileLabel}</p>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 md:mt-2 z-10 font-medium">{t.fileHelp}</p>
              </div>

              {(files.length > 0 || processingFiles.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {processingFiles.map((file, idx) => (
                    <div key={`proc-${idx}`} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 left-0 h-1 bg-slate-200 dark:bg-slate-700">
                             <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                        </div>
                        <div className="flex items-center space-x-3 space-x-reverse">
                            <Loader2 size={20} className="animate-spin text-primary-500" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate flex-1">{file.name}</span>
                            <span className="text-xs font-mono text-primary-600 dark:text-primary-400">{file.progress}%</span>
                        </div>
                    </div>
                  ))}
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm animate-scale-in">
                      <div className="flex items-center space-x-3 space-x-reverse overflow-hidden">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                           <FileIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{(file.data.length / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button onClick={() => removeFile(file.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 md:mt-10 pt-6 md:pt-8 border-t border-slate-200 dark:border-slate-700/50">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              
              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">{t.quizType}</label>
                 <div className="relative">
                   <select
                     value={settings.questionType}
                     onChange={(e) => setSettings({...settings, questionType: e.target.value as QuestionType})}
                     className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 text-slate-900 dark:text-white rounded-2xl p-3 md:p-4 pr-10 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 font-bold transition-all text-sm md:text-base"
                   >
                     <option value={QuestionType.MULTIPLE_CHOICE}>{t.mcq}</option>
                     <option value={QuestionType.TRUE_FALSE}>{t.trueFalse}</option>
                     <option value={QuestionType.SHORT_QUIZ}>{t.shortQuiz}</option>
                     <option value={QuestionType.COMPREHENSIVE}>{t.comprehensive}</option>
                     <option value={QuestionType.FLASHCARD}>{t.flashcardsType}</option>
                     <option value={QuestionType.OPEN_ENDED}>{t.openEnded}</option>
                   </select>
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase px-1">{t.difficulty}</label>
                 <div className="relative">
                   <select
                     value={settings.difficulty}
                     onChange={(e) => setSettings({...settings, difficulty: e.target.value as Difficulty})}
                     className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 text-slate-900 dark:text-white rounded-2xl p-3 md:p-4 pr-10 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 font-bold transition-all text-sm md:text-base"
                   >
                     <option value={Difficulty.EASY}>{t.easy}</option>
                     <option value={Difficulty.MEDIUM}>{t.mediumDifficulty}</option>
                     <option value={Difficulty.HARD}>{t.hardDifficulty}</option>
                     <option value={Difficulty.MIXED}>{t.mixedDifficulty}</option>
                   </select>
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                 </div>
              </div>

               <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-3 md:p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                     <div className="bg-white dark:bg-indigo-900 p-2 md:p-2.5 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-300">
                        <BrainCircuit size={20} className="md:w-[22px] md:h-[22px]" />
                     </div>
                     <div>
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">{t.thinkingMode}</h3>
                        <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Gemini 3 Pro</p>
                     </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.thinkingMode}
                      onChange={(e) => setSettings({...settings, thinkingMode: e.target.checked})} 
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
               </div>
           </div>

           <div className="mt-4 md:mt-6 space-y-4 md:space-y-6 animate-fade-in-up">
               {isMixedDifficulty && (
                 <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 md:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs md:text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                           <PieChart size={16} />
                           {t.distribution}
                        </h3>
                         <span className={`text-[10px] md:text-xs font-mono font-bold px-2 py-1 rounded-lg border ${difficultySum === 100 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                           {difficultySum}%
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <div>
                          <label className="block text-[10px] md:text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1 md:mb-2 text-center">{t.easy}</label>
                          <div className="relative">
                            <input 
                              type="number" min="0" max="100"
                              value={settings.difficultyDistribution?.easy || 0}
                              onChange={(e) => setSettings({...settings, difficultyDistribution: { ...settings.difficultyDistribution!, easy: parseInt(e.target.value) || 0 }})}
                              className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl p-2 text-center font-bold text-base md:text-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                          </div>
                        </div>
                         <div>
                          <label className="block text-[10px] md:text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1 md:mb-2 text-center">{t.mediumDifficulty}</label>
                          <div className="relative">
                             <input 
                              type="number" min="0" max="100"
                              value={settings.difficultyDistribution?.medium || 0}
                              onChange={(e) => setSettings({...settings, difficultyDistribution: { ...settings.difficultyDistribution!, medium: parseInt(e.target.value) || 0 }})}
                              className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl p-2 text-center font-bold text-base md:text-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                          </div>
                        </div>
                         <div>
                          <label className="block text-[10px] md:text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1 md:mb-2 text-center">{t.hardDifficulty}</label>
                          <div className="relative">
                            <input 
                              type="number" min="0" max="100"
                              value={settings.difficultyDistribution?.hard || 0}
                              onChange={(e) => setSettings({...settings, difficultyDistribution: { ...settings.difficultyDistribution!, hard: parseInt(e.target.value) || 0 }})}
                              className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl p-2 text-center font-bold text-base md:text-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                          </div>
                        </div>
                    </div>
                 </div>
               )}

               {isMixedType ? (
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <Calculator size={16} />
                           {t.questionsDist}
                        </h3>
                        <span className="text-[10px] md:text-xs font-mono font-bold bg-white dark:bg-slate-900 px-2 md:px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                           {settings.quantity} {t.questions}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between sm:block">
                          <label className="block text-xs font-bold text-slate-500 mb-0 sm:mb-2">{t.mcq}</label>
                          <input 
                            type="number" min="0" max="1000"
                            value={settings.distribution?.multipleChoice || 0}
                            onChange={(e) => setSettings({...settings, distribution: { ...settings.distribution!, multipleChoice: parseInt(e.target.value) || 0 }})}
                            className="w-20 sm:w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center font-bold text-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                          />
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between sm:block">
                          <label className="block text-xs font-bold text-slate-500 mb-0 sm:mb-2">{t.trueFalse}</label>
                          <input 
                            type="number" min="0" max="1000"
                            value={settings.distribution?.trueFalse || 0}
                            onChange={(e) => setSettings({...settings, distribution: { ...settings.distribution!, trueFalse: parseInt(e.target.value) || 0 }})}
                            className="w-20 sm:w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center font-bold text-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                          />
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between sm:block">
                          <label className="block text-xs font-bold text-slate-500 mb-0 sm:mb-2">{t.openEnded}</label>
                          <input 
                            type="number" min="0" max="1000"
                            value={settings.distribution?.openEnded || 0}
                            onChange={(e) => setSettings({...settings, distribution: { ...settings.distribution!, openEnded: parseInt(e.target.value) || 0 }})}
                            className="w-20 sm:w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center font-bold text-lg text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                          />
                        </div>
                    </div>
                 </div>
               ) : (
                  <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700 transition-all duration-300 ${settings.maxMode ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                     <div className="flex justify-between items-center mb-3">
                        <span className={`font-bold text-sm ${settings.maxMode ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                            {settings.maxMode ? t.maxMode : t.questionCount}
                        </span>
                        <div className="flex items-center gap-2">
                           <button onClick={() => setSettings(prev => ({...prev, maxMode: !prev.maxMode, quantity: !prev.maxMode ? 9999 : 10 }))} className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all border ${settings.maxMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-300'}`}>
                             {settings.maxMode ? 'Max ON ⚡' : 'Max OFF'}
                           </button>
                           {!settings.maxMode && (
                                <input 
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={settings.quantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val > 0) {
                                            setSettings({...settings, quantity: val});
                                        } else if (e.target.value === '') {
                                            setSettings({...settings, quantity: 0});
                                        }
                                    }}
                                    className="font-mono font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 md:px-3 rounded-lg border border-slate-200 dark:border-slate-600 w-20 md:w-24 text-center focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm md:text-base"
                                />
                           )}
                        </div>
                     </div>
                     {settings.maxMode ? (
                        <div className="flex items-center justify-center py-4 text-purple-600 dark:text-purple-300 bg-white/50 dark:bg-black/20 rounded-xl backdrop-blur-sm">
                            <Infinity size={32} className="mr-2 animate-pulse" />
                            <span className="text-xs font-bold">ALL DETAILS</span>
                        </div>
                     ) : (
                        <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            step="1" 
                            value={Math.min(settings.quantity, 50)} 
                            onChange={(e) => setSettings({...settings, quantity: parseInt(e.target.value)})} 
                            className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-600" 
                        />
                     )}
                  </div>
               )}
           </div>
        </div>

        <div className="mt-8 md:mt-10 flex flex-col md:flex-row gap-3 md:gap-4">
          <button
            onClick={handleGenerateClick}
            disabled={!isReady || isGenerating}
            className={`group relative flex-grow py-4 md:py-5 px-6 md:px-8 rounded-2xl flex items-center justify-center space-x-2 md:space-x-3 space-x-reverse text-white text-base md:text-lg font-bold transition-all duration-300 shadow-xl overflow-hidden
              ${!isReady || isGenerating
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-primary-600 via-purple-600 to-secondary-600 bg-[length:200%_auto] hover:bg-right hover:scale-[1.01] hover:shadow-primary-500/40'
              }`}
          >
             {isGenerating ? <Loader2 className="animate-spin w-5 h-5 md:w-6 md:h-6" /> : <Sparkles className="animate-float w-5 h-5 md:w-6 md:h-6" />}
             <span className="relative">{isGenerating ? t.generating : t.generateBtn}</span>
          </button>

          <button
            onClick={handleStudyGuideClick}
            disabled={!isReady || isGenerating}
            className={`flex-grow md:flex-grow-0 md:w-1/3 py-4 md:py-5 px-6 rounded-2xl flex items-center justify-center space-x-2 space-x-reverse text-base md:text-lg font-bold border-2 transition-all duration-300 active:scale-95
               ${!isReady || isGenerating 
                  ? 'border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-primary-400 hover:text-primary-600 hover:shadow-lg'
               }`}
          >
             <Book size={20} />
             <span>{t.studyGuideBtn}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
