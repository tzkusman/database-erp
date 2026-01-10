
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
  Loader2,
  Camera,
  ClipboardList,
  Mail,
  ShieldCheck,
  Lock,
  Globe,
  Activity
} from 'lucide-react';
import { ViewType, Profile } from './types';
import { getSupabaseClient } from './lib/supabase';
import Setup from './views/Setup';
import Inventory from './views/Inventory';
import Dashboard from './views/Dashboard';
import Auth from './views/Auth';
import Tasks from './views/Tasks';
import Emails from './views/Emails';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('auth');
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    return `${url}?t=${new Date().getTime()}`;
  };

  const fetchProfile = async (userId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      // Deep fetch including the new email column from profiles as per SQL update
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, updated_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setProfile(data);
      } else {
        // Fallback for new accounts if trigger hasn't finished
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           setProfile({
             id: user.id,
             email: user.email,
             full_name: user.user_metadata?.full_name || 'System Operator'
           });
        }
      }
    } catch (e) { 
      console.error("Registry Sync Failure:", e); 
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
      await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (err: any) { alert(err.message); } finally { setIsUploadingAvatar(false); }
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
          else {
            setProfile(null);
            setCurrentView('auth');
          }
        });
      } catch (err) { setIsConnected(false); }
    } else { 
      setIsConnected(false); 
      setCurrentView('setup'); 
    }
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
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active ? 'bg-blue-600 text-white shadow-xl translate-x-1' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>{icon}</div>
      <span className="font-black text-[11px] uppercase tracking-widest">{label}</span>
    </button>
  );

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-500" size={64} />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck size={24} className="text-white" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-2">Registry Authentication</p>
          <div className="flex items-center space-x-2 justify-center">
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {isConnected && session && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-6 shadow-2xl z-20">
          <div className="flex items-center space-x-4 px-2 mb-12 cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
            <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl group-hover:bg-blue-600 transition-all group-hover:scale-110"><Database size={24} /></div>
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tighter block">TzK.SoL</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Core Registry</span>
            </div>
          </div>
          
          <nav className="flex-1 space-y-3">
            <SidebarItem id="dashboard" icon={<LayoutDashboard size={20} />} label="Terminal" active={currentView === 'dashboard'} />
            <SidebarItem id="tasks" icon={<Activity size={20} />} label="Pipeline" active={currentView === 'tasks'} />
            <SidebarItem id="inventory" icon={<Package size={20} />} label="Asset Ledger" active={currentView === 'inventory'} />
            <SidebarItem id="emails" icon={<Mail size={20} />} label="Comms Node" active={currentView === 'emails'} />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
             <div 
               className="flex items-center space-x-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all" 
               onClick={() => setCurrentView('settings')}
             >
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white bg-slate-200 shadow-sm flex-shrink-0">
                   {profile?.avatar_url ? (
                     <img src={getImageUrl(profile.avatar_url)!} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center"><UserIcon size={20} className="text-slate-400" /></div>
                   )}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{profile?.full_name || 'Anonymous'}</p>
                   <p className="text-[8px] text-blue-600 font-black uppercase tracking-widest mt-0.5">Verified Node</p>
                </div>
             </div>
            <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-5 py-4 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all group">
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-black text-[10px] uppercase tracking-[0.2em]">Terminate Link</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {(isConnected && session) && (
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
            <div className="flex items-center space-x-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <span className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setCurrentView('dashboard')}>NETWORK</span>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{currentView}</span>
            </div>
            <div className="flex items-center space-x-8">
              <div className="hidden lg:flex flex-col items-end">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Operator Identity</p>
                <p className="text-[11px] font-black text-slate-900 flex items-center space-x-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                   <span>{profile?.email || 'UNIDENTIFIED_NODE'}</span>
                </p>
              </div>
              <div className="flex items-center space-x-4 border-l border-slate-100 pl-8">
                <button className="p-3 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-2xl transition-all relative group">
                   <div className="w-2.5 h-2.5 bg-blue-500 rounded-full absolute top-2 right-2 border-2 border-white shadow-sm"></div>
                   <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                </button>
                <div className="w-12 h-12 rounded-[1.2rem] bg-slate-100 border-2 border-white overflow-hidden flex items-center justify-center shadow-md cursor-pointer hover:border-blue-500 hover:scale-105 transition-all" onClick={() => setCurrentView('settings')}>
                  {profile?.avatar_url ? (
                    <img src={getImageUrl(profile.avatar_url)!} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={24} className="text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc]">
          {!isConnected && <Setup onConnected={checkConnection} />}
          {isConnected && currentView === 'auth' && !session && <Auth onAuthenticated={checkConnection} />}
          {isConnected && session && currentView === 'dashboard' && <Dashboard />}
          {isConnected && session && currentView === 'inventory' && <Inventory isConnected={isConnected} />}
          {isConnected && session && currentView === 'tasks' && <Tasks />}
          {isConnected && session && currentView === 'emails' && <Emails />}
          
          {isConnected && session && currentView === 'settings' && (
             <div className="max-w-5xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Registry Node Profile</h1>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2 flex items-center">
                       <ShieldCheck size={14} className="mr-2 text-emerald-500" />
                       Authorized Operator Session for {profile?.full_name}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xl flex items-center space-x-4">
                     <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Lock className="text-blue-600" size={20} />
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest block text-slate-400">Security Layer</span>
                        <span className="text-[11px] font-black uppercase text-blue-600">Encrypted E2E</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Left Column: ID Card */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8">
                         <Globe size={40} className="text-slate-50 opacity-10" />
                      </div>
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="relative w-40 h-40 mb-8 group">
                           <div className="w-full h-full rounded-[3.5rem] bg-slate-50 border-8 border-white shadow-2xl overflow-hidden relative group">
                              {profile?.avatar_url ? (
                                <img src={getImageUrl(profile.avatar_url)!} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><UserIcon size={56} className="text-slate-200" /></div>
                              )}
                              {isUploadingAvatar && (
                                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-md">
                                   <Loader2 className="animate-spin text-white" size={32} />
                                </div>
                              )}
                              <button 
                                onClick={() => avatarInputRef.current?.click()} 
                                className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all duration-300"
                              >
                                 <Camera size={28} className="mb-2" />
                                 <span className="text-[8px] font-black uppercase tracking-widest">Update Photo</span>
                              </button>
                           </div>
                           <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                           <div className="absolute -bottom-4 -right-4 bg-emerald-500 text-white p-4 rounded-3xl shadow-2xl border-4 border-white animate-pulse">
                              <ShieldCheck size={24} />
                           </div>
                        </div>
                        <div className="text-center">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{profile?.full_name || 'System Operator'}</h2>
                          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                             <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                             <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Level 4 Operator</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute -bottom-10 -right-10 opacity-5">
                          <Database size={160} />
                       </div>
                       <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-500 mb-8">System Access Tokens</h3>
                       <div className="space-y-6 relative z-10">
                          <div className="flex justify-between items-center group cursor-help">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry ID</span>
                             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-4 py-1.5 rounded-xl border border-emerald-400/20">Verified</span>
                          </div>
                          <div className="flex justify-between items-center group cursor-help">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Quota</span>
                             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-4 py-1.5 rounded-xl border border-blue-400/20">Enterprise</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Sync</span>
                             <span className="text-[10px] font-black text-white/60">{new Date().toLocaleTimeString()}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Right Column: Registry Details */}
                  <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-xl">
                       <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-slate-50">
                          <div className="p-4 bg-slate-50 rounded-2xl text-slate-400">
                            <Mail size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-2xl text-slate-900 tracking-tight">Identity Registry Info</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Global System Metadata</p>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Registered Full Name</label>
                             <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 shadow-inner group transition-all hover:bg-white hover:border-blue-200">
                                {profile?.full_name || 'System Identity Pending'}
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Primary Registry Key (Email)</label>
                             <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 truncate shadow-inner group transition-all hover:bg-white hover:border-blue-200">
                                {profile?.email || session?.user?.email}
                             </div>
                          </div>
                       </div>

                       <div className="mt-16 pt-10 border-t border-slate-50">
                          <div className="flex items-center justify-between mb-8">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Infrastructure Health Index</h4>
                            <div className="flex items-center space-x-2">
                               <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                               <span className="text-[9px] font-black text-emerald-600 uppercase">All Systems Nominal</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <HealthCard label="Global Registry" status="Active" icon={<Database size={16} />} color="emerald" />
                             <HealthCard label="Asset Storage" status="Optimized" icon={<Package size={16} />} color="blue" />
                             <HealthCard label="Comms Node" status="Secure" icon={<Lock size={16} />} color="purple" />
                          </div>
                       </div>
                    </div>

                    <div className="bg-rose-50 p-10 rounded-[3.5rem] border border-rose-100 flex items-center justify-between group cursor-pointer hover:bg-rose-100 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-rose-500/5">
                       <div className="flex items-center space-x-6">
                          <div className="p-5 bg-white rounded-3xl text-rose-600 shadow-xl group-hover:scale-110 transition-transform">
                             <LogOut size={32} />
                          </div>
                          <div>
                             <h4 className="font-black text-2xl text-rose-900 tracking-tighter">System Deauthorization</h4>
                             <p className="text-rose-600/70 text-sm font-bold uppercase tracking-widest mt-1">Purge Local Node Cache & End Session</p>
                          </div>
                       </div>
                       <button onClick={handleLogout} className="p-4 bg-white text-rose-600 rounded-2xl shadow-lg hover:shadow-rose-200 transition-all group-hover:translate-x-1">
                          <ChevronRight size={24} />
                       </button>
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

const HealthCard: React.FC<{ label: string; status: string; icon: React.ReactNode; color: string; }> = ({ label, status, icon, color }) => (
  <div className={`p-6 bg-white border border-slate-100 rounded-3xl flex items-center space-x-4 shadow-sm hover:shadow-md transition-all border-b-4 border-b-${color}-500`}>
     <div className={`p-3 bg-${color}-50 rounded-2xl text-${color}-600`}>{icon}</div>
     <div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
        <span className={`text-[10px] font-black text-${color}-600 uppercase tracking-widest`}>{status}</span>
     </div>
  </div>
);

export default App;
