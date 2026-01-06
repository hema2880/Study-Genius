
import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, Rocket, Atom, Zap, Search, Star, Layers, Cpu, Coffee } from 'lucide-react';
import { AppLanguage } from '../types';

interface LoadingOverlayProps {
  language: AppLanguage;
}

const ICONS = [Atom, Brain, Rocket, Zap, Search, Sparkles, Layers, Cpu, Star];

const FIXED_MESSAGE = {
  ar: "اللهم صل وسلم على نبينا محمد ﷺ",
  en: "Peace and blessings be upon Prophet Muhammad ﷺ"
};

const VARIABLE_MESSAGES = {
  ar: [
    "جاري تحليل النصوص واستخراج الدرر المعرفية... 💎",
    "هل تعلم؟ المخ البشري يمكنه تخزين 2.5 بيتابايت من المعلومات! 🧠",
    "نقوم الآن بهندسة أسئلة تتحدى ذكاءك... 🧩",
    "جاري الاتصال بقاعدة المعرفة... 🌐",
    "نحول المعلومات الخام إلى أسئلة ذهبية ✨",
    "الذكاء الاصطناعي يفكر... الرجاء الانتظار قليلاً 🤖",
    "نجهز لك تجربة تعليمية لا تُنسى... 🚀",
    "كل ثانية انتظار تقربك خطوة من التفوق 🎓",
    "جاري تفعيل وضع العبقري... 💡",
    "نبحث عن أدق التفاصيل لضمان جودة الاختبار 🔍",
    "سبحان الله وبحمده، سبحان الله العظيم 🌿",
    "استغفر الله العظيم وأتوب إليه 🤲",
    "العلم نور، ونحن نمهد لك الطريق 🕯️",
    "جاري صياغة الأسئلة بدقة عالية... 📝",
    "لا تنس ذكر الله 📿",
    "النجاح يبدأ بخطوة، ونحن نجهز لك المسار 🛤️",
    "نقوم بترتيب الأفكار والمفاهيم... 📚",
    "اصبر وما صبرك إلا بالله ❤️",
    "جاري معالجة البيانات المعقدة... ⚙️",
    "قليل من الصبر = الكثير من الفائدة ⏳"
  ],
  en: [
    "Analyzing text and extracting knowledge gems... 💎",
    "Did you know? The human brain can store 2.5 petabytes of info! 🧠",
    "Engineering questions to challenge your intellect... 🧩",
    "Connecting to the knowledge base... 🌐",
    "Turning raw data into golden questions ✨",
    "AI is thinking... Please wait a moment 🤖",
    "Preparing an unforgettable learning experience... 🚀",
    "Every second of waiting brings you closer to excellence 🎓",
    "Activating Genius Mode... 💡",
    "Searching for the finest details... 🔍",
    "Glory be to God, the Greatest 🌿",
    "Knowledge is light, we are paving the way 🕯️",
    "Crafting questions with high precision... 📝",
    "Don't forget to remember God 📿",
    "Success starts with a step, we are preparing the path 🛤️",
    "Organizing ideas and concepts... 📚",
    "Processing complex data structures... ⚙️",
    "A little patience yields great rewards ⏳",
    "Optimizing your study plan... 📊",
    "Generating smart flashcards... 🃏"
  ]
};

const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ language }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    // 1. Get the fixed prayer message
    const fixed = FIXED_MESSAGE[language];
    
    // 2. Get the variable messages and shuffle them
    const pool = VARIABLE_MESSAGES[language];
    const shuffled = shuffleArray(pool);
    
    // 3. Set the state: Fixed message first, then random ones
    setMessages([fixed, ...shuffled]);
    setMessageIndex(0);
  }, [language]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
      setIconIndex((prev) => (prev + 1) % ICONS.length);
    }, 3500); // Change message every 3.5 seconds

    return () => clearInterval(interval);
  }, [messages]);

  const CurrentIcon = ICONS[iconIndex];
  const currentMessage = messages.length > 0 ? messages[messageIndex] : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl transition-all duration-500">
      <div className="relative max-w-md w-full mx-4 flex flex-col items-center">
        
        {/* Orbital Loader Animation */}
        <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
            {/* Glowing Core Background */}
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse"></div>
            
            {/* Ring 1 (Slow & Large) */}
            <div className="absolute inset-0 rounded-full border border-white/10 border-t-primary-500/80 border-r-primary-500/30 w-full h-full animate-[spin_3s_linear_infinite]"></div>
            
            {/* Ring 2 (Fast & Reverse) */}
            <div className="absolute inset-2 rounded-full border border-white/5 border-b-secondary-500/80 border-l-secondary-500/30 w-[88%] h-[88%] left-[6%] top-[6%] animate-[spin_2s_linear_infinite_reverse]"></div>
            
            {/* Ring 3 (Static Decorative) */}
            <div className="absolute inset-0 rounded-full border border-white/5 w-[60%] h-[60%] left-[20%] top-[20%]"></div>

            {/* Central Icon Container */}
            <div className="relative z-10 bg-slate-900 rounded-full p-4 border border-slate-700 shadow-2xl shadow-primary-500/20">
                <CurrentIcon size={32} className="text-white animate-pulse" />
            </div>

            {/* Orbiting Particles */}
            <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary-400 rounded-full shadow-[0_0_10px_rgba(167,139,250,0.8)]"></div>
            </div>
             <div className="absolute inset-4 animate-[spin_3s_linear_infinite_reverse]">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-secondary-400 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.8)]"></div>
            </div>
        </div>

        {/* Content Box */}
        <div className="text-center space-y-4 px-4 relative z-10 w-full">
          {/* Animated Text */}
          <div className="min-h-[80px] flex items-center justify-center">
            <h3 
                key={messageIndex} // Key change triggers animation
                className={`text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 animate-in fade-in slide-in-from-bottom-2 duration-700 leading-relaxed ${messageIndex === 0 ? 'text-primary-300 drop-shadow-md' : ''}`}
            >
                {currentMessage}
            </h3>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
             <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
             <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce delay-75"></div>
             <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce delay-150"></div>
             <span className="tracking-widest uppercase text-xs font-semibold ml-2">
                {language === 'ar' ? 'جاري المعالجة' : 'Processing'}
             </span>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
