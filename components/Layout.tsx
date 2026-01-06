
import React, { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, LayoutDashboard, Menu, X, BrainCircuit, MessageCircle, Star, Award, Moon, Sun, Settings, CalendarClock } from 'lucide-react';
import { UserProfile, AppLanguage } from '../types';
import { PomodoroTimer } from './PomodoroTimer';
import { translations } from '../utils/translations';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  userProfile?: UserProfile;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onOpenSettings: () => void;
  language: AppLanguage;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, userProfile, darkMode, toggleDarkMode, onOpenSettings, language }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = translations[language];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const xpPerLevel = 1000;
  const currentLevelXP = userProfile ? userProfile.xp % xpPerLevel : 0;
  const progressPercent = (currentLevelXP / xpPerLevel) * 100;

  const NavItem = ({ view, icon: Icon, label }: { view: string; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveView(view);
        setMobileMenuOpen(false);
      }}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 font-bold select-none whitespace-nowrap group
        ${activeView === view 
          ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-lg shadow-primary-500/30 scale-105' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-primary-600 dark:hover:text-primary-300'
        }`}
    >
      <Icon size={18} className={`transition-transform duration-300 ${activeView === view ? 'animate-bounce' : 'group-hover:scale-110'}`} />
      <span>{label}</span>
      {activeView === view && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-70"></span>
      )}
    </button>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500`}>
      <div 
        className={`fixed top-0 left-0 right-0 z-50 px-2 py-2 md:p-4 transition-all duration-300 print:hidden`}
        style={{ paddingTop: scrolled ? '0.5rem' : 'max(1rem, env(safe-area-inset-top))' }}
      >
        <nav className={`max-w-6xl mx-auto rounded-[2rem] md:rounded-full transition-all duration-300 ${scrolled ? 'glass-panel shadow-md py-2 px-3 md:px-4' : 'glass-panel shadow-xl py-2 px-4 md:py-3 md:px-6'}`}>
          <div className="flex justify-between items-center">
              
            <div className="flex items-center cursor-pointer group select-none" onClick={() => setActiveView('home')}>
              <div className="relative">
                 <div className="absolute inset-0 bg-primary-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
                 <div className="relative bg-gradient-to-br from-primary-500 to-secondary-600 p-1.5 md:p-2 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                    <GraduationCap className="text-white w-5 h-5 md:w-6 md:h-6" />
                 </div>
              </div>
              <div className="mr-2 md:mr-3 hidden xs:block ml-2">
                  <span className="text-lg md:text-xl font-black text-gradient block leading-none">StudyGenius</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm mx-4">
              <NavItem view="home" icon={BookOpen} label={t.new} />
              <NavItem view="dashboard" icon={LayoutDashboard} label={t.library} />
              <NavItem view="mistakes" icon={BrainCircuit} label={t.mistakes} />
              <NavItem view="review_plan" icon={CalendarClock} label={t.review} />
              <NavItem view="chat" icon={MessageCircle} label={t.assistant} />
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              {userProfile && (
                <div className="hidden sm:flex items-center gap-2 md:gap-3 bg-white dark:bg-slate-800 py-1 md:py-1.5 px-2 md:px-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-1">
                      <Award className="text-yellow-500 w-3 h-3 md:w-4 md:h-4" />
                      <span className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-300">Lvl {userProfile.level}</span>
                    </div>
                    <div className="w-10 md:w-16 h-1 md:h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
              )}

              <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-1 md:pr-2 mr-1">
                 <button
                  onClick={toggleDarkMode}
                  className="p-2 md:p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:rotate-12 active:scale-90"
                >
                  {darkMode ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
                <button
                  onClick={onOpenSettings}
                  className="p-2 md:p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:rotate-90 active:scale-90"
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </nav>
      </div>

      <div className={`fixed inset-x-0 top-16 md:top-20 z-40 lg:hidden transition-all duration-300 ease-out origin-top ${mobileMenuOpen ? 'opacity-100 scale-y-100 translate-y-2' : 'opacity-0 scale-y-0 -translate-y-4 pointer-events-none'}`}>
        <div className="mx-3 md:mx-4 glass-panel rounded-3xl p-3 shadow-2xl flex flex-col gap-2 ring-1 ring-black/5">
            <NavItem view="home" icon={BookOpen} label={t.new} />
            <NavItem view="dashboard" icon={LayoutDashboard} label={t.library} />
            <NavItem view="mistakes" icon={BrainCircuit} label={t.mistakes} />
            <NavItem view="review_plan" icon={CalendarClock} label={t.review} />
            <NavItem view="chat" icon={MessageCircle} label={t.assistant} />
        </div>
      </div>

      <div className="h-24 md:h-28"></div>

      <main className="flex-grow max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-2 md:py-4 relative z-10">
         <div key={activeView} className="animate-fade-in-up">
            {children}
         </div>
      </main>
      
      <PomodoroTimer />

      <footer className="mt-8 md:mt-12 py-6 md:py-8 border-t border-slate-200/50 dark:border-slate-800/50 glass text-center print:hidden">
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          {t.footer}
        </p>
      </footer>
    </div>
  );
};
