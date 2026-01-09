
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  Loader2, 
  AlertCircle, 
  PieChart as PieChartIcon,
  ClipboardCheck,
  Factory,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { getSupabaseClient } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalValue: 0,
    itemCount: 0,
    lowStockCount: 0,
    topCategory: 'N/A',
    activeTasks: 0,
    loading: true
  });
  const [inventoryChart, setInventoryChart] = useState<any[]>([]);
  const [productionChart, setProductionChart] = useState<any[]>([]);

  useEffect(() => {
    const fetchRealData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        // Parallel fetch for inventory and tasks
        const [invRes, taskRes] = await Promise.all([
          supabase.from('inventory').select('*'),
          supabase.from('tasks').select('department, status')
        ]);

        if (invRes.error) throw invRes.error;
        if (taskRes.error) throw taskRes.error;

        const invData = invRes.data || [];
        const taskData = taskRes.data || [];

        // Inventory metrics
        const totalVal = invData.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const lowStock = invData.filter(item => item.quantity < 10).length;
        
        const categoryMap: Record<string, number> = {};
        invData.forEach(item => {
          categoryMap[item.category] = (categoryMap[item.category] || 0) + item.quantity;
        });
        const topCat = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        // Production metrics
        const deptMap: Record<string, number> = {
          'planning': 0,
          'cutting': 0,
          'stitching': 0,
          'washing': 0,
          'finishing': 0
        };
        taskData.forEach(t => {
          if (deptMap[t.department] !== undefined) {
            deptMap[t.department]++;
          }
        });

        const prodChartData = Object.entries(deptMap).map(([key, count]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
          count
        }));

        setMetrics({
          totalValue: totalVal,
          itemCount: invData.length,
          lowStockCount: lowStock,
          topCategory: topCat,
          activeTasks: taskData.filter(t => t.status !== 'completed').length,
          loading: false
        });
        
        setInventoryChart(Object.entries(categoryMap).map(([name, stock]) => ({
          name: name.substring(0, 6),
          stock
        })).slice(0, 5));

        setProductionChart(prodChartData);
      } catch (e) {
        console.error("Dashboard engine error:", e);
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Command Center</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Holistic enterprise overview across inventory and production nodes.</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          Neural Link Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Asset Valuation" 
          value={`$${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          trend="up" 
          change="+12.5%"
          icon={<DollarSign size={20} />} 
          loading={metrics.loading}
        />
        <StatCard 
          label="Inventory Nodes" 
          value={metrics.itemCount.toString()} 
          trend="up" 
          change="Synced"
          icon={<Package size={20} />} 
          loading={metrics.loading}
        />
        <StatCard 
          label="Active Operations" 
          value={metrics.activeTasks.toString()} 
          trend="up" 
          change="Processing"
          icon={<Factory size={20} />} 
          loading={metrics.loading}
        />
        <StatCard 
          label="Low Stock Alerts" 
          value={metrics.lowStockCount.toString()} 
          trend={metrics.lowStockCount > 0 ? "down" : "up"} 
          change={metrics.lowStockCount > 0 ? "Critical" : "Optimal"}
          icon={<AlertCircle size={20} />} 
          loading={metrics.loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Production Pipeline</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Workflow distribution across departments</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
              <ClipboardCheck size={20} />
            </div>
          </div>
          
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionChart} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#475569', fontSize: 12, fontWeight: 700}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={32}>
                  {productionChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 flex flex-col text-white">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-xl tracking-tight">System Vitality</h3>
            <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest">Global</div>
          </div>
          
          <div className="space-y-6 flex-1">
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                   <span>Registry Load</span>
                   <span>{metrics.itemCount > 0 ? 'Optimal' : 'Idle'}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 w-2/3"></div>
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                   <span>Operational Flow</span>
                   <span>78% Capacity</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[78%]"></div>
                </div>
             </div>

             <div className="pt-8 border-t border-white/5">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Core Dominance</h4>
                <div className="flex items-center space-x-4">
                   <div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Top Sector</p>
                      <p className="text-sm font-black truncate">{metrics.topCategory}</p>
                   </div>
                </div>
             </div>
          </div>
          
          <button className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-slate-100 transition-colors">
             <span>System Logs</span>
             <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  loading?: boolean;
}> = ({ label, value, change, trend, icon, loading }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative group hover:border-blue-400 transition-all duration-300">
    {loading && (
      <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-[1px] z-10 rounded-[2rem]">
        <Loader2 className="animate-spin text-blue-500" size={20} />
      </div>
    )}
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-slate-50 group-hover:bg-blue-50 transition-colors rounded-2xl text-slate-600 group-hover:text-blue-600 border border-transparent group-hover:border-blue-100">
        {icon}
      </div>
      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
        trend === 'up' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
      }`}>
        {change}
      </span>
    </div>
    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</h3>
    <p className="text-2xl font-black text-slate-900 truncate tracking-tight">{value}</p>
  </div>
);

export default Dashboard;
