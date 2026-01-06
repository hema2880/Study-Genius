import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, X } from 'lucide-react';

export const PomodoroTimer: React.FC = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Explicitly use window.setInterval to get the numeric ID type
    let interval: number | undefined;

    if (isActive) {
      interval = window.setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished
            setIsActive(false);
            
            // Safe Notification Call
            try {
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(mode === 'focus' ? 'انتهى وقت التركيز! خذ استراحة' : 'انتهت الاستراحة! عد للعمل');
              }
            } catch (e) {
              console.log('Notifications not supported');
            }
            
            // Auto switch mode
            if (mode === 'focus') {
               setMode('break');
               setMinutes(5);
            } else {
               setMode('focus');
               setMinutes(25);
            }
          } else {
            setMinutes(m => m - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(s => s - 1);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, minutes, mode]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(mode === 'focus' ? 25 : 5);
    setSeconds(0);
  };

  const switchMode = () => {
    setIsActive(false);
    const newMode = mode === 'focus' ? 'break' : 'focus';
    setMode(newMode);
    setMinutes(newMode === 'focus' ? 25 : 5);
    setSeconds(0);
  };

  useEffect(() => {
     try {
       if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
       }
     } catch (e) {
       // Ignore permission errors in restricted webviews
     }
  }, []);

  if (!isVisible) {
     return (
        <button 
           onClick={() => setIsVisible(true)}
           className="fixed bottom-4 right-4 z-50 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-all active:scale-95"
           title="إظهار المؤقت"
        >
           <Brain size={24} />
        </button>
     );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div className={`backdrop-blur-md bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-2xl w-64 transition-colors`}>
        <div className="flex justify-between items-center mb-3">
           <div className="flex items-center space-x-2 space-x-reverse text-sm font-bold text-slate-700 dark:text-slate-200">
              {mode === 'focus' ? <Brain size={16} className="text-primary-500" /> : <Coffee size={16} className="text-green-500" />}
              <span>{mode === 'focus' ? 'وقت التركيز' : 'وقت الراحة'}</span>
           </div>
           <button onClick={() => setIsVisible(false)} className="text-slate-400 hover:text-red-500">
              <X size={16} />
           </button>
        </div>

        <div className="text-4xl font-mono font-bold text-center text-slate-800 dark:text-white mb-4 tracking-widest">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="flex justify-center items-center space-x-2 space-x-reverse">
          <button
            onClick={toggleTimer}
            className={`p-2 rounded-full text-white transition-all shadow-md active:scale-95 ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'}`}
          >
            {isActive ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
          
          <button
            onClick={resetTimer}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors active:scale-95"
          >
            <RotateCcw size={20} />
          </button>

          <button
             onClick={switchMode}
             className={`p-2 rounded-full transition-colors active:scale-95 ${mode === 'focus' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'}`}
             title={mode === 'focus' ? "تبديل إلى راحة" : "تبديل إلى تركيز"}
          >
             {mode === 'focus' ? <Coffee size={20} /> : <Brain size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};