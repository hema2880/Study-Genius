
import React, { useState } from 'react';
import { Calendar, Brain, Loader2, AlertTriangle, Zap, BookOpen, CalendarPlus, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { generateSpacedRepetitionSchedule } from '../services/geminiService';
import { CalendarEvent, AppLanguage } from '../types';
import { translations } from '../utils/translations';

declare global {
  interface Window {
    google: any;
  }
}

interface ReviewPlannerProps {
    onOpenSettings?: () => void;
    language: AppLanguage;
}

export const ReviewPlanner: React.FC<ReviewPlannerProps> = ({ onOpenSettings, language }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [topicInput, setTopicInput] = useState('');
    const [schedule, setSchedule] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = translations[language];

    const handleCalculate = async () => {
        if (!topicInput.trim()) {
            setError(language === 'ar' ? "يرجى إدخال اسم الموضوع." : "Please enter a topic.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSchedule([]);
        try {
            const result = await generateSpacedRepetitionSchedule(selectedDate, topicInput.trim());
            setSchedule(result);
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const downloadICS = (schedule: CalendarEvent[]) => {
        let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//StudyGenius//Review Plan//EN\nCALSCALE:GREGORIAN\n";
        schedule.forEach(event => {
            const startDate = new Date(event.start);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1);
    
            const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
            
            icsContent += "BEGIN:VEVENT\n";
            icsContent += `SUMMARY:${event.title}\n`;
            icsContent += `DTSTART;VALUE=DATE:${formatDate(startDate)}\n`;
            icsContent += `DTEND;VALUE=DATE:${formatDate(endDate)}\n`;
            icsContent += `DESCRIPTION:${event.description}\n`;
            icsContent += "END:VEVENT\n";
        });
        icsContent += "END:VCALENDAR";

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'study_plan.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = reject;
            document.body.appendChild(script);
        });
    };

    const handleDirectSync = async () => {
        const clientId = localStorage.getItem('google_client_id');
        if (!clientId) {
            const msg = language === 'ar' ? "يجب إعداد Google Client ID للمزامنة المباشرة. هل تريد فتح الإعدادات الآن؟" : "Google Client ID required. Open settings?";
            if (confirm(msg)) {
                if (onOpenSettings) onOpenSettings();
            }
            return;
        }

        setIsSyncing(true);
        try {
            // Load Google Identity Services script dynamically
            await loadScript('https://accounts.google.com/gsi/client');

            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: async (response: any) => {
                    if (response.error !== undefined) {
                        throw response;
                    }
                    
                    const token = response.access_token;
                    let successCount = 0;
                    
                    // Batch insert using REST API
                    for (const event of schedule) {
                        const startDate = new Date(event.start);
                        // All day event structure
                        const eventResource = {
                            summary: event.title,
                            description: event.description,
                            start: { date: startDate.toISOString().split('T')[0] },
                            end: { date: startDate.toISOString().split('T')[0] }, // Google Cal all-day is exclusive, but for single day usually start=end or start=day, end=day+1. Best is end=day+1
                        };
                        
                        // Fix end date for all day event to be next day
                        const nextDay = new Date(startDate);
                        nextDay.setDate(startDate.getDate() + 1);
                        eventResource.end.date = nextDay.toISOString().split('T')[0];

                        try {
                            await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(eventResource)
                            });
                            successCount++;
                        } catch (err) {
                            console.error("Failed to add event", err);
                        }
                    }
                    
                    const successMsg = language === 'ar' ? `تمت مزامنة ${successCount} أحداث بنجاح إلى تقويمك!` : `Successfully synced ${successCount} events!`;
                    alert(successMsg);
                    setIsSyncing(false);
                },
            });

            // Trigger the auth flow
            tokenClient.requestAccessToken();

        } catch (err) {
            console.error("Sync Error", err);
            const errorMsg = language === 'ar' ? "حدث خطأ أثناء الاتصال بجوجل. تأكد من صحة Client ID." : "Google Sync Error. Check Client ID.";
            alert(errorMsg);
            setIsSyncing(false);
        }
    };

    const openGoogleCalendar = (event: CalendarEvent) => {
        const startDate = new Date(event.start);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);

        const formatDate = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '');
        
        const gCalUrl = new URL('https://www.google.com/calendar/render');
        gCalUrl.searchParams.append('action', 'TEMPLATE');
        gCalUrl.searchParams.append('text', event.title);
        gCalUrl.searchParams.append('dates', `${formatDate(startDate)}/${formatDate(endDate)}`);
        gCalUrl.searchParams.append('details', event.description);
        
        window.open(gCalUrl.toString(), '_blank');
    };
    
    const sortedSchedule = schedule.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-24 md:pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center space-y-4 pt-4 md:pt-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                    {t.schedulerTitle}
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-light px-4">
                    {t.schedulerDesc}
                </p>
            </div>

            {/* Input Card */}
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl mx-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="w-full space-y-2">
                         <label htmlFor="studyDate" className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Calendar size={18} />
                            {t.studyDate}
                         </label>
                        <input
                            id="studyDate"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white shadow-inner focus:border-primary-500 focus:ring-0 transition-all text-center font-bold text-lg"
                        />
                    </div>
                     <div className="w-full space-y-2">
                         <label htmlFor="topic" className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <BookOpen size={18} />
                            {t.topicStudied}
                         </label>
                        <input
                            id="topic"
                            type="text"
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            placeholder={t.topicPlaceholder}
                            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white shadow-inner focus:border-primary-500 focus:ring-0 transition-all text-lg"
                        />
                    </div>
                </div>
                <button
                    onClick={handleCalculate}
                    disabled={isLoading}
                    className="group relative w-full py-4 px-8 rounded-xl flex items-center justify-center space-x-3 space-x-reverse text-white text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-2xl overflow-hidden active:scale-[0.98] bg-gradient-to-r from-primary-600 to-secondary-600 hover:scale-[1.01] disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                     <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                     {isLoading ? (
                        <Loader2 className="animate-spin" size={24} />
                     ) : (
                        <Brain size={24} />
                     )}
                     <span className="relative">{isLoading ? t.calculating : t.createPlan}</span>
                </button>
            </div>

            {/* Results Section */}
            {isLoading && (
                 <div className="text-center py-10 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400">{t.generating}</p>
                 </div>
            )}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-2xl flex items-center gap-3">
                    <AlertTriangle size={24} />
                    <div>
                        <h3 className="font-bold">{t.error}</h3>
                        <p>{error}</p>
                    </div>
                </div>
            )}
            {schedule.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="flex flex-col md:flex-row justify-center items-center gap-4 py-4">
                        <button 
                            onClick={handleDirectSync}
                            disabled={isSyncing}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                            <span>{t.syncGoogle}</span>
                        </button>
                        
                        <button 
                            onClick={() => downloadICS(schedule)}
                            className="bg-white dark:bg-slate-800 border-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 font-bold px-6 py-3 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/50 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={20} />
                            <span>{t.downloadIcs}</span>
                        </button>
                    </div>
                    
                    {/* Vertical Timeline */}
                    <div className="relative border-r-2 border-slate-200 dark:border-slate-700 mr-8 pt-4">
                        {sortedSchedule.map((event, index) => (
                            <div key={index} className="mb-8 flex items-start w-full">
                                <div className="absolute -right-5 z-10">
                                    <div 
                                      style={{ backgroundColor: event.color || '#8b5cf6' }}
                                      className="h-10 w-10 rounded-full text-white flex items-center justify-center font-bold ring-4 ring-slate-50 dark:ring-slate-950 flex-col leading-none"
                                    >
                                        <span className="text-xs">{new Date(event.start).toLocaleString(language, { month: 'short' })}</span>
                                        <span className="text-lg">{new Date(event.start).getDate()}</span>
                                    </div>
                                </div>
                                <div className="pr-12 w-full">
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 space-y-3 relative group">
                                       <div className="absolute top-4 left-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button 
                                              onClick={() => openGoogleCalendar(event)}
                                              className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 flex items-center gap-1 text-xs font-bold"
                                              title={t.manualAdd}
                                           >
                                              <CalendarPlus size={14} />
                                              <span>{t.manualAdd}</span>
                                           </button>
                                       </div>
                                       <h4 className="font-bold text-slate-800 dark:text-white text-lg">{event.title}</h4>
                                       <p className="text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                         <div className="mb-8 flex items-center w-full">
                                <div className="absolute -right-4 z-10">
                                    <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold ring-4 ring-slate-50 dark:ring-slate-950">
                                        <Zap size={18} />
                                    </div>
                                </div>
                                <div className="pr-12 w-full">
                                     <p className="text-green-700 dark:text-green-300 font-bold">{t.consolidated}</p>
                                </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
