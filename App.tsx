
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
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { ViewType, Profile } from './types';
import { getSupabaseClient } from './lib/supabase';
import Setup from './views/Setup';
import Inventory from './views/Inventory';
import Dashboard from './views/Dashboard';
import Auth from './views/Auth';
import Tasks from './views/Tasks';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('auth');
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
        .maybeSingle();
      
      if (error) {
        if (retryCount < 3) setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
        return;
      }
      if (data) setProfile(data);
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
      const filePath = `${session.user.id}/avatar-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', session.user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
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
          if (session) fetchProfile(session.user.id);
          else setCurrentView('auth');
        });
      } catch (err) { setIsConnected(false); }
    } else { setIsConnected(false); setCurrentView('setup'); }
    setLoading(false);
  };

  useEffect(() => { checkConnection(); }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setCurrentView('auth');
  };

  const SidebarItem: React.FC<{ id: ViewType; icon: React.ReactNode; label: string; active: boolean; }> = ({ id, icon, label, active }) => (
    <button
      onClick={() => setCurrentView(id)}
      disabled={!session && id !== 'auth' && id !== 'setup'}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Authenticating Hub...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {isConnected && session && (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4">
          <div className="flex items-center space-x-3 px-2 mb-10 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="bg-slate-900 p-2.5 rounded-xl text-white shadow-lg">
              <Database size={20} />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tighter">TzK.SoL</span>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarItem id="dashboard" icon={<LayoutDashboard size={18} />} label="System Command" active={currentView === 'dashboard'} />
            <SidebarItem id="tasks" icon={<ClipboardList size={18} />} label="Production Flow" active={currentView === 'tasks'} />
            <SidebarItem id="inventory" icon={<Package size={18} />} label="Registry" active={currentView === 'inventory'} />
            <SidebarItem id="settings" icon={<Settings size={18} />} label="Configuration" active={currentView === 'settings'} />
          </nav>
          <div className="mt-auto pt-4 border-t border-slate-100">
             <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl mb-4 group cursor-pointer" onClick={() => setCurrentView('settings')}>
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 shadow-inner">
                   {profile?.avatar_url ? <img src={getImageUrl(profile.avatar_url)!} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-slate-400 mx-auto mt-2" />}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-xs font-black text-slate-900 truncate">{profile?.full_name || 'System User'}</p>
                   <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-widest">Operator</p>
                </div>
             </div>
            <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors">
              <LogOut size={18} />
              <span className="font-bold text-sm">Deauthorize</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-auto">
        {(isConnected && session) && (
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="cursor-pointer hover:text-blue-600" onClick={() => setCurrentView('dashboard')}>CORE</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-black">{currentView}</span>
            </div>
            <div className="flex items-center space-x-6">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative">
                 <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-2 right-2 border-2 border-white animate-pulse"></div>
                 <Bell size={20} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm cursor-pointer" onClick={() => setCurrentView('settings')}>
                {profile?.avatar_url ? <img src={getImageUrl(profile.avatar_url)!} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-slate-400" />}
              </div>
            </div>
          </header>
        )}

        <div className="p-8 max-w-full w-full flex-1">
          {!isConnected && <Setup onConnected={checkConnection} />}
          {isConnected && currentView === 'auth' && !session && <Auth onAuthenticated={checkConnection} />}
          {isConnected && session && currentView === 'dashboard' && <Dashboard />}
          {isConnected && session && currentView === 'inventory' && <Inventory isConnected={isConnected} />}
          {isConnected && session && currentView === 'tasks' && <Tasks />}
          {isConnected && session && currentView === 'settings' && (
             <div className="max-w-4xl mx-auto py-10">
                <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">System Configuration</h1>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                   <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] mb-4">Identity Profile</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="w-24 h-24 rounded-3xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden mb-4 relative group">
                           {profile?.avatar_url ? <img src={getImageUrl(profile.avatar_url)!} className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-slate-300 mx-auto mt-6" />}
                           {isUploadingAvatar && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
                           <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"><Camera size={20} /></button>
                           <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">{profile?.full_name || 'System Operator'}</h2>
                        <p className="text-sm font-medium text-slate-500">{session?.user?.email}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Infrastructure Stats</h3>
                         <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200">
                               <span className="text-xs font-bold text-slate-500">Node Status</span>
                               <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ACTIVE</span>
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
