
import React, { useState, useEffect } from 'react';
import { Shield, Lock, Trash2, LogOut, Database, Calendar, FileText, WifiOff, AlertTriangle, Key, Plus, CreditCard, BarChart, Settings, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { getAdminQuizzes, deleteAdminQuiz, getAdminCodes, generateAdminCodes, deleteAdminCode, getAdminConfig, updateAdminConfig, loginAdmin } from '../services/geminiService';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'quizzes' | 'codes' | 'settings'>('codes');
  
  // Generation State
  const [genCount, setGenCount] = useState(5);
  const [genPlan, setGenPlan] = useState<'Free' | 'Pro' | 'Gold' | 'Unlimited'>('Free');
  
  // Settings State
  const [config, setConfig] = useState<any>({ planLimits: { Free: 3, Pro: 20, Gold: 100, Unlimited: 99999 } });
  const [configSaved, setConfigSaved] = useState(false);

  // Data State
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Secure Login Call to Backend
    const result = await loginAdmin(password);
    
    if (result.success) {
      setIsAuthenticated(true);
      // Fetch initial data after auth
      await fetchCodes();
      await fetchQuizzes();
      await fetchConfig();
    } else {
      setError(result.error || 'Incorrect password or server error');
    }
    setLoading(false);
  };

  const fetchQuizzes = async () => {
    const data = await getAdminQuizzes();
    if (data === null) setConnectionError(true);
    else setQuizzes(data);
  };
  
  const fetchCodes = async () => {
      setLoading(true);
      const data = await getAdminCodes();
      setCodes(data || []);
      setLoading(false);
  };

  const fetchConfig = async () => {
      const data = await getAdminConfig();
      if (data) setConfig(data);
  };

  const handleSaveConfig = async () => {
      setLoading(true);
      await updateAdminConfig(config.planLimits);
      setConfigSaved(true);
      setLoading(false);
      setTimeout(() => setConfigSaved(false), 2000);
  };

  const handleGenerateCodes = async () => {
      setLoading(true);
      await generateAdminCodes(genCount, genPlan);
      await fetchCodes();
      setLoading(false);
      alert(`Generated ${genCount} ${genPlan} codes successfully!`);
  };

  const handleDeleteCode = async (id: string) => {
      if (confirm('Delete Code?')) {
          await deleteAdminCode(id);
          setCodes(codes.filter(c => c._id !== id));
      }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz permanently?')) {
      const success = await deleteAdminQuiz(id);
      if (success) {
        setQuizzes(quizzes.filter(q => q._id !== id));
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full">
              <Lock size={32} className="text-slate-600 dark:text-slate-300" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-6">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter Password"
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:border-primary-500 focus:outline-none transition-colors"
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              Login
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-colors text-sm"
            >
              Back to App
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">System Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onExit} className="px-4 py-2 text-slate-600 hover:text-primary-600">Back</button>
            <button onClick={() => { setIsAuthenticated(false); setPassword(''); }} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg">
                <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-4">
            <button 
                onClick={() => setView('codes')} 
                className={`flex-1 p-4 rounded-2xl font-bold text-lg transition-all ${view === 'codes' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-slate-600'}`}
            >
                Activation Codes ({codes.length})
            </button>
            <button 
                onClick={() => setView('quizzes')} 
                className={`flex-1 p-4 rounded-2xl font-bold text-lg transition-all ${view === 'quizzes' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-slate-600'}`}
            >
                Cached Quizzes ({quizzes.length})
            </button>
            <button 
                onClick={() => setView('settings')} 
                className={`flex-1 p-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${view === 'settings' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-slate-600'}`}
            >
                <Settings size={20} /> Settings
            </button>
        </div>

        {connectionError && (
             <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border border-red-200 dark:border-red-800 flex items-start gap-4">
                 <WifiOff className="text-red-500" size={24} />
                 <div><h3 className="font-bold text-red-800">Backend Offline</h3><p className="text-sm text-red-600">Ensure server.js is running.</p></div>
             </div>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden p-8">
                 <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <CreditCard className="text-primary-600" />
                    Manage Plan Quotas (Daily Limits)
                 </h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                     <div className="space-y-4">
                         <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                             <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Free Plan Limit</label>
                             <input 
                                type="number" 
                                value={config.planLimits?.Free}
                                onChange={(e) => setConfig({...config, planLimits: {...config.planLimits, Free: parseInt(e.target.value)}})}
                                className="w-full text-3xl font-black bg-transparent border-b-2 border-slate-300 focus:border-primary-500 outline-none pb-2"
                             />
                             <p className="text-xs text-slate-400 mt-2">Quizzes allowed per day</p>
                         </div>
                         <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800/30">
                             <label className="block text-sm font-bold text-purple-500 uppercase mb-2">Pro Plan Limit</label>
                             <input 
                                type="number" 
                                value={config.planLimits?.Pro}
                                onChange={(e) => setConfig({...config, planLimits: {...config.planLimits, Pro: parseInt(e.target.value)}})}
                                className="w-full text-3xl font-black bg-transparent border-b-2 border-purple-300 focus:border-purple-500 outline-none pb-2 text-purple-900 dark:text-purple-100"
                             />
                             <p className="text-xs text-purple-400 mt-2">Quizzes allowed per day</p>
                         </div>
                     </div>
                     <div className="space-y-4">
                        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                             <label className="block text-sm font-bold text-amber-500 uppercase mb-2">Gold Plan Limit</label>
                             <input 
                                type="number" 
                                value={config.planLimits?.Gold}
                                onChange={(e) => setConfig({...config, planLimits: {...config.planLimits, Gold: parseInt(e.target.value)}})}
                                className="w-full text-3xl font-black bg-transparent border-b-2 border-amber-300 focus:border-amber-500 outline-none pb-2 text-amber-900 dark:text-amber-100"
                             />
                             <p className="text-xs text-amber-400 mt-2">Quizzes allowed per day</p>
                         </div>
                         <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 opacity-75">
                             <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Unlimited Plan Limit</label>
                             <input 
                                type="number" 
                                value={config.planLimits?.Unlimited}
                                onChange={(e) => setConfig({...config, planLimits: {...config.planLimits, Unlimited: parseInt(e.target.value)}})}
                                className="w-full text-3xl font-black bg-transparent border-b-2 border-slate-300 focus:border-slate-500 outline-none pb-2"
                             />
                             <p className="text-xs text-slate-400 mt-2">Safety cap (high number)</p>
                         </div>
                     </div>
                 </div>

                 <div className="mt-8 flex justify-end">
                     <button 
                        onClick={handleSaveConfig}
                        disabled={loading}
                        className={`px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${configSaved ? 'bg-green-500' : 'bg-primary-600 hover:bg-primary-700 shadow-xl'}`}
                     >
                         {loading ? 'Saving...' : configSaved ? <><CheckCircle2 /> Saved!</> : <><Save /> Save Configuration</>}
                     </button>
                 </div>
             </div>
        )}

        {/* CODES VIEW */}
        {view === 'codes' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Generator Section */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20} /> Generate New Codes</h2>
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                             <input 
                                type="number" min="1" max="100" 
                                value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value))}
                                className="px-4 py-2 rounded-xl border border-slate-300 w-32"
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plan Type</label>
                             <select 
                                value={genPlan} onChange={(e) => setGenPlan(e.target.value as any)}
                                className="px-4 py-2 rounded-xl border border-slate-300 w-48"
                             >
                                 <option value="Free">Free</option>
                                 <option value="Pro">Pro</option>
                                 <option value="Gold">Gold</option>
                                 <option value="Unlimited">Unlimited</option>
                             </select>
                        </div>
                        <button 
                            onClick={handleGenerateCodes} 
                            disabled={loading}
                            className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 h-[42px]"
                        >
                            {loading ? 'Generating...' : 'Generate Codes'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Daily Usage</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {codes.map(code => (
                                <tr key={code._id}>
                                    <td className="px-6 py-4 font-mono font-bold text-lg select-all">{code.code}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <CreditCard size={14} className="text-slate-400" />
                                            <span className={`font-bold ${code.planType === 'Pro' ? 'text-purple-600' : code.planType === 'Gold' ? 'text-amber-600' : code.planType === 'Unlimited' ? 'text-blue-600' : 'text-slate-600'}`}>
                                                {code.planType || 'Free'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <BarChart size={14} />
                                            <span>{code.dailyUsage || 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${code.isUsed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {code.isUsed ? 'Used' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(code.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDeleteCode(code._id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* QUIZZES VIEW */}
        {view === 'quizzes' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold">Database Cache</h2>
                    <button onClick={fetchQuizzes} className="text-primary-600 hover:underline">Refresh</button>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                             <tr>
                                 <th className="px-6 py-4">Title</th>
                                 <th className="px-6 py-4">Qs</th>
                                 <th className="px-6 py-4">Date</th>
                                 <th className="px-6 py-4 text-right">Action</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                             {quizzes.map((quiz) => (
                                 <tr key={quiz._id}>
                                     <td className="px-6 py-4 font-bold max-w-xs truncate" title={quiz.title}>{quiz.title}</td>
                                     <td className="px-6 py-4">{quiz.questionCount}</td>
                                     <td className="px-6 py-4 text-sm text-slate-500">{new Date(quiz.date).toLocaleDateString()}</td>
                                     <td className="px-6 py-4 text-right">
                                         <button onClick={() => handleDeleteQuiz(quiz._id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};
