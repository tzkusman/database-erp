
import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, Users, DollarSign, Activity, Loader2, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { getSupabaseClient } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalValue: 0,
    itemCount: 0,
    lowStockCount: 0,
    topCategory: 'N/A',
    loading: true
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchRealData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        const { data, error } = await supabase.from('inventory').select('*');
        if (error) throw error;

        const rawData = data || [];
        const totalVal = rawData.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const lowStock = rawData.filter(item => item.quantity < 10).length;
        
        // Calculate categories
        const categoryMap: Record<string, number> = {};
        rawData.forEach(item => {
          categoryMap[item.category] = (categoryMap[item.category] || 0) + item.quantity;
        });
        
        const topCat = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        // Prepare chart data (dummy for velocity, real for distribution)
        const distributionData = Object.entries(categoryMap).map(([name, stock]) => ({
          name: name.substring(0, 5),
          stock
        }));

        setMetrics({
          totalValue: totalVal,
          itemCount: rawData.length,
          lowStockCount: lowStock,
          topCategory: topCat,
          loading: false
        });
        
        setChartData(distributionData.slice(0, 7));
      } catch (e) {
        console.error("Dashboard engine error:", e);
        setMetrics(m => ({ ...m, loading: false }));
      }
    };

    fetchRealData();
  }, []);

  const velocityData = [
    { name: 'Jan', sales: 4000 },
    { name: 'Feb', sales: 3000 },
    { name: 'Mar', sales: 2000 },
    { name: 'Apr', sales: 2780 },
    { name: 'May', sales: 1890 },
    { name: 'Jun', sales: 2390 },
    { name: 'Jul', sales: 3490 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Enterprise Overview</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Real-time aggregate data across all active business nodes.</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          Infrastructure Synchronized
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Inventory Valuation" 
          value={`$${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          trend="up" 
          change="+8.2%"
          icon={<DollarSign size={20} />} 
          loading={metrics.loading}
        />
        <StatCard 
          label="Active SKU Nodes" 
          value={metrics.itemCount.toString()} 
          trend="up" 
          change="+1"
          icon={<Package size={20} />} 
          loading={metrics.loading}
        />
        <StatCard 
          label="Critical Low Stock" 
          value={metrics.lowStockCount.toString()} 
          trend={metrics.lowStockCount > 0 ? "down" : "up"} 
          change={metrics.lowStockCount > 5 ? "Alert" : "Stable"}
          icon={<AlertCircle size={20} />} 
          loading={metrics.loading}
        />
        <StatCard 
          label="Dominant Sector" 
          value={metrics.topCategory} 
          trend="up" 
          change="Leader"
          icon={<PieChartIcon size={20} />} 
          loading={metrics.loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 text-lg">Sales Velocity</h3>
            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Performance Matrix
            </div>
          </div>
          
          <div className="w-full min-w-0 relative h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 text-lg">Category Distribution</h3>
             <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Stock</span>
             </div>
          </div>
          
          <div className="w-full min-w-0 relative h-[300px]">
            {chartData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase">Insufficient Data Points</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="stock" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
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
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm min-w-0 overflow-hidden relative group hover:border-blue-200 transition-colors">
    {loading && (
      <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-[1px] z-10">
        <Loader2 className="animate-spin text-blue-500" size={20} />
      </div>
    )}
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-slate-50 group-hover:bg-blue-50 transition-colors rounded-xl text-slate-600 group-hover:text-blue-600">
        {icon}
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        trend === 'up' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
      }`}>
        {change}
      </span>
    </div>
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</h3>
    <p className="text-2xl font-black text-slate-900 truncate">{value}</p>
  </div>
);

export default Dashboard;
