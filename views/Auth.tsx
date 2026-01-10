
import React, { useState, useRef } from 'react';
import { Mail, Lock, User, Camera, Loader2, ArrowRight, ShieldCheck, X, Globe, Database } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface AuthProps {
  onAuthenticated: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size must be less than 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      setError("Infrastructure core not found. Verify project deployment.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuthenticated();
      } else {
        // Core Registry Onboarding
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              email: email.trim().toLowerCase(), // Meta sync
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data?.user) {
          // Explicitly update the profiles table to ensure email discovery works for RLS
          const { error: profileError } = await supabase.from('profiles').upsert({ 
            id: data.user.id, 
            full_name: fullName || 'System Operator', 
            email: email.trim().toLowerCase(),
            updated_at: new Date().toISOString()
          });

          if (profileError) console.error("Registry Sync Delay:", profileError);

          if (avatarFile) {
             try {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${data.user.id}/initial-avatar.${fileExt}`;
                
                await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                
                await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', data.user.id);
             } catch (upErr) {
                console.warn("Media sync deferred.");
             }
          }

          if (data.session) {
            onAuthenticated();
          } else {
            alert("Security challenge deployed! Verify your registry email to continue.");
            setIsLogin(true);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication layer rejection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-20 px-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden relative">
        <div className="bg-slate-900 p-12 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-10">
             <Database size={180} />
          </div>
          <div className="inline-flex p-5 bg-blue-600 rounded-[2rem] mb-8 shadow-2xl shadow-blue-500/40 relative z-10 animate-pulse">
            <ShieldCheck size={48} />
          </div>
          <h2 className="text-4xl font-black tracking-tighter relative z-10">TzK.SoL</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4 relative z-10">
            {isLogin ? 'Secure Node Access' : 'Core Registry Onboarding'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="p-12 space-y-8">
          {!isLogin && (
            <div className="flex flex-col items-center space-y-6 mb-10">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 rounded-[3.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group overflow-hidden shadow-inner"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Camera size={32} className="text-slate-300 group-hover:text-blue-500 mx-auto mb-2" />
                    <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">Operator ID Photo</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
              />
              <div className="w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2 tracking-[0.2em]">Full Registry Name</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-black text-sm"
                    placeholder="e.g. Alexander Sol"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2 tracking-[0.2em]">Email Identifier</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-black text-sm"
                  placeholder="operator@tzk-sol.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2 tracking-[0.2em]">Security Protocol (Pass)</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-black text-sm"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-black flex items-center space-x-3 animate-in fade-in zoom-in shadow-sm">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse flex-shrink-0"></div>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-blue-600 transition-all shadow-2xl hover:shadow-blue-500/20 flex items-center justify-center space-x-4 disabled:opacity-50 group active:scale-[0.98]"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : (
              <>
                <span className="text-sm">{isLogin ? 'Request Access' : 'Create Registry'}</span>
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[10px] text-slate-400 hover:text-blue-600 font-black uppercase tracking-widest transition-colors"
            >
              {isLogin ? "Deploy New Node Request" : "Return to Access Gateway"}
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-12 flex items-center justify-center space-x-6">
         <div className="h-[1px] w-12 bg-slate-200"></div>
         <p className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-300">Isolated Network Hub</p>
         <div className="h-[1px] w-12 bg-slate-200"></div>
      </div>
    </div>
  );
};

export default Auth;
