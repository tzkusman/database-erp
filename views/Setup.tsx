
import React, { useState } from 'react';
import { Database, Key, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { saveSupabaseCredentials, getSupabaseClient } from '../lib/supabase';

interface SetupProps {
  onConnected: () => void;
}

const Setup: React.FC<SetupProps> = ({ onConnected }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('testing');
    setErrorMsg('');

    try {
      const client = getSupabaseClient(url, key);
      if (!client) throw new Error("Invalid URL or Key format");

      // Verify connection by attempting to fetch something basic
      // Note: In a new project, tables might not exist yet. 
      // We check if the auth system is reachable.
      const { data, error } = await client.auth.getSession();
      
      if (error) throw error;

      saveSupabaseCredentials(url, key);
      setStatus('success');
      setTimeout(() => onConnected(), 1000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Connection failed. Please check your credentials.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-white/20 p-2 rounded-lg">
              <Database size={24} />
            </div>
            <h2 className="text-2xl font-bold">Initialize TzK.SoL</h2>
          </div>
          <p className="text-blue-100 leading-relaxed">
            Welcome to the first step of building your custom ERP. We'll start by establishing a permanent link to your Supabase backend.
          </p>
        </div>

        <form onSubmit={handleConnect} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <ArrowRight size={14} className="mr-2 text-blue-500" />
                Supabase Project URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="https://your-project.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center">
                <Key size={14} className="mr-2 text-blue-500" />
                Anon / Public API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {status === 'error' && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-start space-x-3 text-rose-700 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm">{errorMsg}</div>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center space-x-3 text-emerald-700">
              <CheckCircle2 size={18} />
              <div className="text-sm font-medium">Connection Established! Redirecting...</div>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'testing' || status === 'success'}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 focus:ring-4 focus:ring-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {status === 'testing' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Establishing Connection...</span>
              </>
            ) : (
              <span>Connect Supabase Backend</span>
            )}
          </button>
        </form>

        <div className="px-8 pb-8">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Setup Instructions</h4>
             <ol className="text-xs text-slate-500 space-y-1.5 list-decimal pl-4">
               <li>Log in to your <strong>Supabase Dashboard</strong>.</li>
               <li>Navigate to <strong>Project Settings</strong> &gt; <strong>API</strong>.</li>
               <li>Copy the <strong>Project URL</strong> and <strong>anon/public</strong> key.</li>
               <li>Paste them above and click connect.</li>
             </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
