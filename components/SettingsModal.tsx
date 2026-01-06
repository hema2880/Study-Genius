
import React, { useState } from 'react';
import { X, Save, CheckCircle2, Cpu, Languages } from 'lucide-react';
import { AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, language, setLanguage }) => {
  const [saved, setSaved] = useState(false);
  const t = translations[language];

  const handleSave = () => {
    try {
      // Force provider to gemini and default model
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('gemini_model', 'gemini-2.5-flash');
      
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } catch (e) {
      console.warn("Failed to save settings", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="text-primary-600" size={24} />
            {t.settingsTitle}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Languages size={14} /> {t.language}
            </label>
            <div className="flex gap-2">
                <button 
                    onClick={() => setLanguage('ar')}
                    className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${language === 'ar' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`}
                >
                    العربية
                </button>
                <button 
                    onClick={() => setLanguage('en')}
                    className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${language === 'en' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`}
                >
                    English
                </button>
            </div>
          </div>

        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all
              ${saved ? 'bg-green-500' : 'bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-primary-500/25'}
            `}
          >
            {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
            <span>{saved ? t.saved : t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
