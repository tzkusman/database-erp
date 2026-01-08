
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  Database, 
  ChevronRight, 
  LogOut,
  User as UserIcon,
  Bell,
  Globe,
  AtSign,
  Loader2,
  Camera,
  Check,
  ShieldCheck
} from 'lucide-react';
import { ViewType, Profile } from './types';
import { getSupabaseClient } from './lib/supabase';
import Setup from './views/Setup';
import Inventory from './views/Inventory';
import Dashboard from './views/Dashboard';
import Auth from './views/Auth';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('auth');
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Cache buster helper
  const getImageUrl = (url?: string) => {
    if (!url) return null;
    return `${url}?t=${new Date().getTime()}`;
  };

  const fetchProfile = async (userId: string, retryCount = 0) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Better than single() if it might not exist yet
      
      if (error) {
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
        }
        return;
      }
      
      if (data) {
        setProfile(data);
      } else if (retryCount < 3) {
        // If profile doesn't exist yet, retry (trigger might be slow)
        setTimeout(() => fetchProfile(userId, retryCount + 1), 1500);
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !session) return;
    
    setIsUploadingAvatar(true);
    const file = e.target.files[0];
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const fileExt = file.name.split('.').pop();
      // Use unique name to avoid cache issues
      const filePath = `${session.user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload to 'avatars' bucket (Ensure it is PUBLIC in Supabase dashboard)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      alert("Profile photo updated!");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Upload failed: " + (err.message || "Check bucket permissions"));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const updateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session || !profile) return;
    setUpdatingProfile(true);
    
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      id: session.user.id,
      full_name: formData.get('full_name') as string,
      username: formData.get('username') as string,
      website: formData.get('website') as string,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    if (!error) {
      setProfile({ ...profile, ...updates });
      alert("Profile saved!");
    } else {
      alert("Error: " + error.message);
    }
    setUpdatingProfile(false);
  };

  const checkConnection = async () => {
    setLoading(true);
    const client = getSupabaseClient();
    if (client) {
      setIsConnected(true);
      try {
        const { data: { session: currentSession } } = await client.auth.getSession();
        setSession(currentSession);
        
        if (currentSession) {
          await fetchProfile(currentSession.user.id);
          setCurrentView('dashboard');
        } else {
          setCurrentView('auth');
        }

        client.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          if (session) {
            fetchProfile(session.user.id);
          } else {
            setCurrentView('auth');
            setProfile(null);
          }
        });
      } catch (err) {
        setIsConnected(false);
      }
    } else {
      setIsConnected(false);
      setCurrentView('setup');
    }
    setLoading(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setCurrentView('auth');
  };

  const SidebarItem: React.FC<{ 
    id: ViewType; 
    icon: React.ReactNode; 
    label: string; 
    active: boolean; 
  }> = ({ id, icon, label, active }) => (
    <button
      onClick={() => setCurrentView(id)}
      disabled={!session && id !== 'auth' && id !== 'setup'}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Authenticating System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {isConnected && session && (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4">
          <div className="flex items-center space-x-2 px-2 mb-10 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Database size={24} />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">TzK.SoL</span>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem id="dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={currentView === 'dashboard'} />
            <SidebarItem id="inventory" icon={<Package size={20} />} label="Inventory" active={currentView === 'inventory'} />
            <SidebarItem id="settings" icon={<Settings size={20} />} label="Settings" active={currentView === 'settings'} />
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-100">
             <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl mb-4 group cursor-pointer" onClick={() => setCurrentView('settings')}>
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 flex items-center justify-center shadow-inner">
                   {profile?.avatar_url ? (
                     <img src={getImageUrl(profile.avatar_url)!} alt="User" className="w-full h-full object-cover" />
                   ) : (
                     <UserIcon size={18} className="text-slate-400" />
                   )}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name || 'Enterprise User'}</p>
                   <p className="text-[10px] text-slate-500 truncate">@{profile?.username || 'profile'}</p>
                </div>
             </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-auto">
        {(isConnected && session) && (
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <span className="cursor-pointer hover:text-blue-600" onClick={() => setCurrentView('dashboard')}>Home</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium capitalize">{currentView}</span>
            </div>
            <div className="flex items-center space-x-6">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
                 <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-2.5 right-2.5 border-2 border-white"></div>
                 <Bell size={20} />
              </button>
              <div 
                className="flex items-center space-x-3 border-l pl-6 border-slate-200 cursor-pointer group"
                onClick={() => setCurrentView('settings')}
              >
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{profile?.full_name || 'User'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">@{profile?.username || 'user'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm group-hover:border-blue-300 transition-all">
                  {profile?.avatar_url ? (
                    <img src={getImageUrl(profile.avatar_url)!} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={20} className="text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
          {!isConnected && <Setup onConnected={checkConnection} />}
          {isConnected && currentView === 'auth' && !session && <Auth onAuthenticated={checkConnection} />}
          {isConnected && session && currentView === 'dashboard' && <Dashboard />}
          {isConnected && session && currentView === 'inventory' && <Inventory isConnected={isConnected} />}
          {isConnected && session && currentView === 'settings' && (
            <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h1 className="text-3xl font-bold text-slate-900 mb-8">System Profile</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                       <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                       <span className="text-xs text-slate-400 font-medium italic">Managed by Enterprise Controller</span>
                    </div>
                    
                    <form onSubmit={updateProfile} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Full Display Name</label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input name="full_name" defaultValue={profile?.full_name || ''} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Public Username</label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input name="username" defaultValue={profile?.username || ''} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                          </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Professional Website</label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input name="website" defaultValue={profile?.website || ''} placeholder="https://example.com" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button 
                          disabled={updatingProfile}
                          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center space-x-2 disabled:opacity-50"
                        >
                          {updatingProfile ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                      <div className="relative inline-block mb-6 group">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-4 border-white shadow-xl overflow-hidden mx-auto flex items-center justify-center transition-transform group-hover:scale-105">
                          {profile?.avatar_url ? (
                            <img src={getImageUrl(profile.avatar_url)!} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={56} className="text-slate-300" />
                          )}
                          {isUploadingAvatar && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
                               <Loader2 className="animate-spin text-blue-600" size={32} />
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
                        >
                          <Camera size={20} />
                        </button>
                        <input 
                          type="file" 
                          ref={avatarInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleAvatarUpload}
                        />
                      </div>
                      <h3 className="font-bold text-xl text-slate-900">{profile?.full_name || 'Enterprise User'}</h3>
                      <p className="text-sm text-slate-500 mb-6 font-medium tracking-tight">{session?.user?.email}</p>
                      
                      <div className="space-y-3">
                         <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-[11px] font-mono text-slate-500">
                            <span className="uppercase opacity-60">Authentication</span>
                            <span className="text-emerald-600 font-bold flex items-center">
                               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
                               VERIFIED
                            </span>
                         </div>
                      </div>
                   </div>

                   <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl shadow-blue-900/10 relative overflow-hidden">
                      <div className="absolute -right-8 -bottom-8 opacity-10">
                         <Database size={160} />
                      </div>
                      <h3 className="font-bold mb-4 flex items-center text-lg">
                        <ShieldCheck size={20} className="mr-2 text-blue-400" />
                        Infrastructure
                      </h3>
                      <div className="space-y-4 relative z-10">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Project ID</p>
                          <div className="p-3 bg-white/5 rounded-xl font-mono text-[11px] text-blue-300 border border-white/10 truncate">
                             dbppxzkkgdtnmikkviyt
                          </div>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
