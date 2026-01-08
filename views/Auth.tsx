
import React, { useState, useRef } from 'react';
import { Mail, Lock, User, Camera, Loader2, ArrowRight, ShieldCheck, X } from 'lucide-react';
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
      setError("Infrastructure not ready. Please check setup.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuthenticated();
      } else {
        // Signup logic:
        // Trigger on DB handles profile creation using raw_user_meta_data
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              // We'll upload the actual image AFTER the profile is created via settings 
              // for best performance during signup. 
              avatar_url: '', 
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data?.session) {
          // If a session exists (auto-login enabled in Supabase), 
          // we can try uploading the avatar now if the user selected one
          if (avatarFile && data.user) {
             try {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${data.user.id}/initial-avatar.${fileExt}`;
                
                await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                
                // Update profile with the avatar url
                await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', data.user.id);
             } catch (upErr) {
                console.warn("Post-signup avatar upload failed, user can set it in settings later.");
             }
          }
          onAuthenticated();
        } else {
          alert("Success! Please check your email for a confirmation link.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden relative">
        <div className="bg-slate-900 p-10 text-white text-center">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">TzK.SoL</h2>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            {isLogin ? 'Secure Gateway Login' : 'Enterprise Onboarding'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="p-10 space-y-6">
          {!isLogin && (
            <div className="flex flex-col items-center space-y-4 mb-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-28 h-28 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group overflow-hidden shadow-inner"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Camera size={32} className="text-slate-300 group-hover:text-blue-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Photo</span>
                  </div>
                )}
                {avatarPreview && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAvatarPreview(null); setAvatarFile(null); }}
                    className="absolute top-1 right-1 p-1 bg-white/80 rounded-lg text-rose-500 hover:bg-white shadow-sm"
                  >
                    <X size={14} />
                  </button>
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
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block ml-1 tracking-wider">Legal Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Full Name"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block ml-1 tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                  placeholder="corporate@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block ml-1 tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                  placeholder="Secret Key"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold flex items-center space-x-2 animate-in fade-in zoom-in">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3 disabled:opacity-50 group"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : (
              <>
                <span className="text-lg">{isLogin ? 'Authorize Access' : 'Initialize Account'}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-sm text-slate-500 hover:text-blue-600 font-bold transition-colors underline-offset-4 hover:underline"
            >
              {isLogin ? "Request New Account" : "Return to Login Portal"}
            </button>
          </div>
        </form>
      </div>
      
      <p className="text-center text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mt-8">
        System Secured by TzK Advanced Solutions
      </p>
    </div>
  );
};

export default Auth;
