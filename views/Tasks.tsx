
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  User, 
  CheckCircle2, 
  Loader2,
  X,
  Package,
  Layers,
  Scissors,
  Zap,
  Droplets,
  Star,
  Users
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';
import { Task, InventoryItem, Profile } from '../types';

const DEPARTMENTS = [
  { id: 'planning', label: 'Planning', color: 'bg-slate-100 text-slate-700', icon: <Layers size={14} /> },
  { id: 'cutting', label: 'Pattern Cutting', color: 'bg-blue-50 text-blue-700', icon: <Scissors size={14} /> },
  { id: 'stitching', label: 'Stitching', color: 'bg-indigo-50 text-indigo-700', icon: <Zap size={14} /> },
  { id: 'washing', label: 'Washing', color: 'bg-cyan-50 text-cyan-700', icon: <Droplets size={14} /> },
  { id: 'finishing', label: 'Finishing', color: 'bg-emerald-50 text-emerald-700', icon: <Star size={14} /> }
] as const;

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    department: 'planning',
    priority: 'medium',
    sku_ref: '',
    assigned_to: ''
  });

  const fetchTasks = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUser(userData.user?.id || null);

      // Join profiles via explicit relationship aliases
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!user_id(full_name, avatar_url),
          assignee:profiles!assigned_to(full_name, avatar_url)
        `)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (e) {
      console.error("Fetch tasks failed:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await Promise.all([
        fetchTasks(),
        (async () => {
          const { data } = await supabase.from('inventory').select('sku, name');
          setInventory(data || []);
        })(),
        (async () => {
          const { data } = await supabase.from('profiles').select('*');
          setTeamMembers(data || []);
        })()
      ]);
    } catch (e) {
      console.error("Critical data fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel('tasks-live')
      .on('postgres_changes', { event: '*', table: 'tasks', schema: 'public' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const payload = {
        title: newTask.title,
        description: newTask.description,
        department: newTask.department,
        priority: newTask.priority,
        sku_ref: newTask.sku_ref || null,
        assigned_to: newTask.assigned_to || null,
        user_id: user.id,
        status: 'todo'
      };

      const { error } = await supabase.from('tasks').insert([payload]);
      if (error) throw error;
      setShowAddModal(false);
      setNewTask({ title: '', description: '', department: 'planning', priority: 'medium', sku_ref: '', assigned_to: '' });
      fetchTasks();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (taskId: string) => { setDraggingTaskId(taskId); };

  const handleDrop = async (e: React.DragEvent, targetDept: typeof DEPARTMENTS[number]['id']) => {
    e.preventDefault();
    if (!draggingTaskId) return;

    const taskToMove = tasks.find(t => t.id === draggingTaskId);
    if (taskToMove?.department === targetDept) return;

    setTasks(prev => prev.map(t => t.id === draggingTaskId ? { ...t, department: targetDept } : t));

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('tasks').update({ department: targetDept }).eq('id', draggingTaskId);
    }
    setDraggingTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const deleteTask = async (task: Task) => {
    if (task.user_id !== currentUser) {
      alert("Only the operation initiator can purge this task.");
      return;
    }
    if (!confirm("Permanently delete this operation?")) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.from('tasks').delete().eq('id', task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Team Pipeline</h1>
            <div className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Real-time</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-black mt-1 uppercase tracking-[0.2em]">Operational Coordination Hub</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <Plus size={16} />
          <span>New Operation</span>
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 scrollbar-hide">
        <div className="flex space-x-6 h-full min-w-max px-1">
          {DEPARTMENTS.map((dept) => (
            <div 
              key={dept.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dept.id)}
              className="w-80 flex flex-col space-y-4"
            >
              <div className={`px-5 py-4 rounded-[1.5rem] ${dept.color} flex items-center justify-between border border-transparent shadow-sm`}>
                <div className="flex items-center space-x-3">
                  {dept.icon}
                  <span className="text-xs font-black uppercase tracking-[0.15em]">{dept.label}</span>
                </div>
                <span className="text-[10px] font-black opacity-40 bg-black/5 px-2 py-0.5 rounded-full">
                  {tasks.filter(t => t.department === dept.id).length}
                </span>
              </div>

              <div className="flex-1 bg-slate-200/30 rounded-[2rem] p-3 border-2 border-dashed border-slate-200/50 space-y-3 min-h-[500px] transition-colors hover:border-blue-200/50">
                {loading ? (
                  <div className="flex items-center justify-center h-20"><Loader2 className="animate-spin text-slate-300" /></div>
                ) : tasks.filter(t => t.department === dept.id).length === 0 ? (
                  <div className="h-full flex items-center justify-center p-10 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Zone Idle</p>
                  </div>
                ) : (
                  tasks.filter(t => t.department === dept.id).map((task) => (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing hover:shadow-xl hover:shadow-blue-500/5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${
                             task.priority === 'high' ? 'bg-rose-500' : 
                             task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                           }`}></div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                             {task.priority}
                           </span>
                        </div>
                        {task.user_id === currentUser && (
                          <button onClick={() => deleteTask(task)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      
                      <h4 className="text-sm font-black text-slate-900 mb-1 leading-tight tracking-tight">{task.title}</h4>
                      {task.description && <p className="text-[11px] text-slate-500 font-medium mb-4 line-clamp-2 leading-relaxed">{task.description}</p>}
                      
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center space-x-2">
                          <div className="flex -space-x-1">
                            <div className="w-6 h-6 rounded-lg bg-slate-100 overflow-hidden border border-white flex items-center justify-center ring-1 ring-slate-200">
                              {task.creator?.avatar_url ? (
                                <img src={task.creator.avatar_url} className="w-full h-full object-cover" />
                              ) : (
                                <User size={10} className="text-slate-400" />
                              )}
                            </div>
                            {task.assignee && (
                              <div className="w-6 h-6 rounded-lg bg-blue-100 overflow-hidden border border-white flex items-center justify-center ring-1 ring-blue-200">
                                {task.assignee.avatar_url ? (
                                  <img src={task.assignee.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                  <User size={10} className="text-blue-400" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[60px]">
                              {task.assignee?.full_name || task.creator?.full_name || 'System'}
                            </span>
                            <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
                              {task.assignee ? 'Operator' : 'Owner'}
                            </span>
                          </div>
                        </div>
                        {task.sku_ref && (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                             <Package size={10} className="text-slate-400" />
                             <span className="text-[9px] font-mono font-black text-slate-500">{task.sku_ref}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
            <div className="bg-slate-900 p-8 flex items-center justify-between text-white">
              <div>
                <h3 className="font-black text-xl tracking-tight">System Operation Entry</h3>
                <p className="text-slate-400 text-[10px] font-black mt-1 uppercase tracking-[0.2em]">Deployment Node</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors p-2 bg-white/5 rounded-xl">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="p-8 space-y-6 bg-white max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Objective Title</label>
                <input
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-black transition-all"
                  placeholder="Task designation..."
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Initial Sector</label>
                  <select
                    value={newTask.department}
                    onChange={(e) => setNewTask({...newTask, department: e.target.value as any})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black"
                  >
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Priority Core</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black"
                  >
                    <option value="low">Low Impact</option>
                    <option value="medium">Standard</option>
                    <option value="high">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Operator</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Asset Sync (SKU)</label>
                  <select
                    value={newTask.sku_ref}
                    onChange={(e) => setNewTask({...newTask, sku_ref: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-black cursor-pointer"
                  >
                    <option value="">None</option>
                    {inventory.map(inv => <option key={inv.sku} value={inv.sku}>{inv.sku} - {inv.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Briefing Notes</label>
                <textarea
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                  placeholder="Technical instructions..."
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  <span>Commit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
