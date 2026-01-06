
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { sendChatMessage } from '../services/geminiService';
import { ChatMessage, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface ChatBotProps {
  language: AppLanguage;
}

// Safe ID Generator
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const ChatBot: React.FC<ChatBotProps> = ({ language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendChatMessage(messages, input);
      const botMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: language === 'ar' ? "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى." : "Sorry, an error occurred connecting to AI. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 transition-colors">
      {/* Header */}
      <div className="bg-primary-600 dark:bg-primary-700 p-3 md:p-4 flex items-center justify-between text-white flex-shrink-0">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot size={20} className="md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base md:text-lg">{t.chatAssistant}</h2>
            <p className="text-primary-100 text-[10px] md:text-xs">Gemini 3 Pro</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([])} 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
          title={t.clearChat}
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 bg-slate-50 dark:bg-slate-900 transition-colors">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-4">
            <Sparkles size={40} className="md:w-12 md:h-12 text-primary-300 dark:text-primary-700" />
            <p className="text-base md:text-lg font-medium">{t.howToHelp}</p>
            <div className="flex flex-wrap justify-center gap-2 text-xs md:text-sm">
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => setInput(t.summarize)}>{t.summarize}</span>
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => setInput(t.explainTheory)}>{t.explainTheory}</span>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'} items-end gap-2`}>
              <div 
                className={`p-3 md:p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user' 
                    ? 'bg-primary-600 dark:bg-primary-700 text-white rounded-bl-2xl rounded-br-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-br-2xl rounded-bl-none'
                  }`}
              >
                {msg.text}
              </div>
              <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary-100 dark:bg-primary-900' : 'bg-green-100 dark:bg-green-900'}`}>
                {msg.role === 'user' ? <User size={14} className="md:w-4 md:h-4 text-primary-600 dark:text-primary-400" /> : <Bot size={14} className="md:w-4 md:h-4 text-green-600 dark:text-green-400" />}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex flex-row-reverse items-end gap-2">
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 md:p-4 rounded-2xl rounded-bl-none shadow-sm">
                 <Loader2 size={18} className="md:w-5 md:h-5 animate-spin text-primary-600 dark:text-primary-400" />
               </div>
               <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                 <Bot size={14} className="md:w-4 md:h-4 text-green-600 dark:text-green-400" />
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 transition-colors flex-shrink-0">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.writeMessage}
            className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none max-h-32 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm md:text-base"
            rows={1}
            style={{ minHeight: '50px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute left-2 p-1.5 md:p-2 rounded-lg transition-colors
              ${!input.trim() || isLoading 
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
              }`}
          >
            {isLoading ? <Loader2 size={18} className="md:w-5 md:h-5 animate-spin" /> : <Send size={18} className={`md:w-5 md:h-5 ${document.dir === 'rtl' ? 'rotate-180' : ''}`} />}
          </button>
        </div>
      </div>
    </div>
  );
};
