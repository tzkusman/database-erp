
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  Loader2, 
  AlertCircle, 
  PieChart as PieChartIcon,
  ClipboardCheck,
  Factory,
  ChevronRight,
  SendHorizontal,
  Globe,
  User as UserIcon,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Mail,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { getSupabaseClient } from '../lib/supabase';
import { Email } from '../types';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalValue: 0,
    itemCount: 0,
    lowStockCount: 0,
    topCategory: 'N/A',
    activeTasks: 0,
    inboxCount: 0,
    outboxCount: 0,
    loading: true
  });
  const [productionChart, setProductionChart] = useState<any[]>([]);
  const [recentComms, setRecentComms] = useState<Email[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchRealData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile to get the definitive registry email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle();
        
        const emailKey = profile?.email || user.email;
        setUserEmail(emailKey);

        const [invRes, taskRes, emailRes] = await Promise.all([
          supabase.from('inventory').select('*'),
          supabase.from('tasks').select('department, status'),
          supabase.from('emails')
            .select('*')
            .or(`user_id.eq.${user.id},recipient_email.eq.${emailKey}`)
            .order('created_at', { ascending: false })
        ]);

        if (invRes.error) throw invRes.error;
        if (taskRes.error) throw taskRes.error;

        const invData = invRes.data || [];
        const taskData = taskRes.data || [];
        const commsData = emailRes.data || [];

        const totalVal = invData.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const lowStock = invData.filter(item => item.quantity < 10).length;
        
        const categoryMap: Record<string, number> = {};
        invData.forEach(item => {
          categoryMap[item.category] = (categoryMap[item.category] || 0) + item.quantity;
        });
        const topCat = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        const deptMap: Record<string, number> = {
          'planning': 0, 'cutting': 0, 'stitching': 0, 'washing': 0, 'finishing': 0
        };
        taskData.forEach(t => {
          if (deptMap[t.department] !== undefined) deptMap[t.department]++;
        });

        const prodChartData = Object.entries(deptMap).map(([key, count]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
          count
        }));

        const inbox = commsData.filter(e => e.recipient_email === emailKey).length;
        const outbox = commsData.filter(e => e.recipient_email !== emailKey).length;

        setMetrics({
          totalValue: totalVal,
          itemCount: invData.length,
          lowStockCount: lowStock,
          topCategory: topCat,
          activeTasks: taskData.filter(t => t.status !== 'completed').length,
          inboxCount: inbox,
          outboxCount: outbox,
          loading: false
        });
        
        setProductionChart(prodChartData);
        setRecentComms(commsData.slice(0, 5));
      } catch (e) {
        console.error("Dashboard synchronization error:", e);
        setMetrics(m => ({ ...m, loading: false }));
      }
    };

    fetchRealData();
  }, []);

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Command</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Registry Node Activity & Performance Intelligence</p>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-5 py-2.5 rounded-full border border-blue-100 shadow-sm">
          <ShieldCheck size={14} className="text-blue-500" />
          Operator ID: {userEmail?.split('@')[0] || 'Identifying...'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Asset Value" value={`$${metrics.totalValue.toLocaleString()}`} trend="up" change="+4.2%" icon={<DollarSign size={20} />} loading={metrics.loading} />
        <StatCard label="Inbox Comms" value={metrics.inboxCount.toString()} trend="up" change="Live" icon={<Inbox size={20} />} loading={metrics.loading} />
        <StatCard label="Deployment Outbox" value={metrics.outboxCount.toString()} trend="up" change="Executed" icon={<SendHorizontal size={20} />} loading={metrics.loading} />
        <StatCard label="Pipeline Critical" value={metrics.lowStockCount.toString()} trend={metrics.lowStockCount > 0 ? "down" : "up"} change={metrics.lowStockCount > 0 ? "Alert" : "Stable"} icon={<AlertCircle size={20} />} loading={metrics.loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Production Flow Graph */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group hover:border-blue-300 transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Operational Load</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Cross-Departmental Synergy Matrix</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                 <Factory size={20} />
              </div>
            </div>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionChart} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 900}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'black', padding: '16px' }} 
                  />
                  <Bar dataKey="count" radius={[0, 12, 12, 0]} barSize={40}>
                    {productionChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secure Communications Registry */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:border-blue-300 transition-all duration-500">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">Recent Registry Logs</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Private Node Interaction History</p>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                   <Lock size={12} className="text-blue-500" />
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Isolated Flow</span>
                </div>
             </div>
             <div className="space-y-4">
                {recentComms.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                    <Mail size={48} className="text-slate-100" />
                    <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">No Log History Detected</p>
                  </div>
                ) : (
                  recentComms.map((email) => {
                    const isInbox = email.recipient_email === userEmail;
                    return (
                      <div key={email.id} className={`flex items-center justify-between p-6 rounded-[1.8rem] border group hover:scale-[1.01] transition-all cursor-pointer ${
                         email.status === 'failed' ? 'bg-rose-50/50 border-rose-100 hover:border-rose-300' : 'bg-slate-50 border-slate-100 hover:border-blue-200'
                      }`}>
                         <div className="flex items-center space-x-5">
                            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all shadow-sm ${
                               email.status === 'failed' ? 'bg-rose-100 border-rose-200 text-rose-500' : 
                               isInbox ? 'bg-blue-100 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400'
                            }`}>
                               {email.status === 'failed' ? <AlertTriangle size={24} /> : 
                                isInbox ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[10px] font-black text-slate-400 tracking-[0.1em] uppercase mb-1">
                                 {isInbox ? 'Sender Node Verified' : `Target: ${email.recipient_email}`}
                               </p>
                               <p className={`text-sm font-black truncate max-w-[280px] ${
                                 email.status === 'failed' ? 'text-rose-600' : 'text-slate-800'
                               }`}>{email.status === 'failed' ? '[ABORTED] ' : ''}{email.subject || '(Operational Protocol)'}</p>
                            </div>
                         </div>
                         <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(email.created_at).toLocaleDateString()}</span>
                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                               email.status === 'failed' ? 'bg-rose-100 text-rose-700 border-rose-200' : 
                               isInbox ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-200 text-slate-700 border-slate-300'
                            }`}>
                               {email.status}
                            </div>
                         </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl flex flex-col text-white h-fit sticky top-24 border border-white/10 group">
          <div className="flex items-center space-x-4 mb-10">
             <div className="p-4 bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform"><ShieldCheck size={24} /></div>
             <div>
               <h3 className="font-black text-xl tracking-tight leading-none">Security Node</h3>
               <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">Status: Operational</p>
             </div>
          </div>
          <div className="space-y-8 flex-1">
             <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>Privacy Sync</span><span>Active</span></div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-blue-500 w-[96%] shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div></div>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>Data Isolation</span><span>100%</span></div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-emerald-500 w-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div></div>
             </div>
             <div className="pt-10 border-t border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Core Registry Lead Sector</p>
                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 group hover:border-blue-500/50 transition-all shadow-inner text-center">
                   <p className="text-xl font-black truncate text-blue-400 tracking-tight">{metrics.topCategory}</p>
                   <p className="text-[10px] text-slate-500 font-black uppercase mt-3 tracking-widest">Active Demand Flow</p>
                </div>
             </div>
          </div>
          <button className="mt-12 py-5 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-50 transition-all shadow-2xl hover:shadow-blue-500/20 active:scale-95 flex items-center justify-center space-x-3">
             <Lock size={14} />
             <span>Authorized Audit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; change: string; trend: 'up' | 'down'; icon: React.ReactNode; loading?: boolean; }> = ({ label, value, change, trend, icon, loading }) => (
  <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative group hover:border-blue-400 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/5">
    {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-[2px] z-10 rounded-[3rem]"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
    <div className="flex items-center justify-between mb-8">
      <div className="p-4 bg-slate-50 group-hover:bg-blue-50 transition-colors rounded-2xl text-slate-600 group-hover:text-blue-600 border border-transparent group-hover:border-blue-100 shadow-inner">{icon}</div>
      <span className={`text-[9px] font-black px-4 py-2 rounded-full border shadow-sm uppercase tracking-widest ${trend === 'up' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{change}</span>
    </div>
    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-1">{label}</h3>
    <p className="text-4xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
  </div>
);

export default Dashboard;
