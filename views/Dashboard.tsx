
import React from 'react';
import { TrendingUp, Package, Users, DollarSign, Activity } from 'lucide-react';
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

const data = [
  { name: 'Mon', sales: 4000, stock: 2400 },
  { name: 'Tue', sales: 3000, stock: 1398 },
  { name: 'Wed', sales: 2000, stock: 9800 },
  { name: 'Thu', sales: 2780, stock: 3908 },
  { name: 'Fri', sales: 1890, stock: 4800 },
  { name: 'Sat', sales: 2390, stock: 3800 },
  { name: 'Sun', sales: 3490, stock: 4300 },
];

const StatCard: React.FC<{
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}> = ({ label, value, change, trend, icon }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0 overflow-hidden">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
        {icon}
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
        trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
      }`}>
        {change}
      </span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
          <p className="text-slate-500 text-sm">Real-time enterprise metrics across all departments.</p>
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
          Live Updates Enabled
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue" 
          value="$128,430" 
          change="+12.5%" 
          trend="up" 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          label="Active Inventory" 
          value="4,293" 
          change="+3.1%" 
          trend="up" 
          icon={<Package size={20} />} 
        />
        <StatCard 
          label="New Leads" 
          value="156" 
          change="-2.4%" 
          trend="down" 
          icon={<Users size={20} />} 
        />
        <StatCard 
          label="Operating Efficiency" 
          value="94.2%" 
          change="+0.8%" 
          trend="up" 
          icon={<Activity size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900">Revenue Trends</h3>
            <select className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          {/* 
              Fixing Recharts Warning:
              1. Direct parent has relative position and min-w-0.
              2. ResponsiveContainer uses aspect ratio (optional but helps stability).
              3. Using height as a number or a very specific tailwind class.
          */}
          <div className="w-full min-w-0 relative h-[280px]">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#2563eb" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900">Stock Velocity</h3>
             <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                   <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                   <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Inventory</span>
                </div>
             </div>
          </div>
          
          <div className="w-full min-w-0 relative h-[280px]">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#64748b', fontSize: 12}}
                />
                <Tooltip 
                   cursor={{fill: '#f8fafc'}}
                   contentStyle={{ 
                     borderRadius: '12px', 
                     border: 'none', 
                     boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                     fontSize: '12px',
                     fontWeight: 'bold'
                   }}
                />
                <Bar dataKey="stock" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
