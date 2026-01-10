
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Download,
  BrainCircuit,
  Loader2,
  PackageCheck,
  Camera,
  X,
  Package,
  Save,
  User as UserIcon,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';
import { InventoryItem } from '../types';
import { getInventoryInsights } from '../services/geminiService';

interface InventoryProps {
  isConnected?: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ isConnected }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [insights, setInsights] = useState<{insight: string, action: string, priority: string}[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    sku: '',
    category: 'Electronics',
    quantity: 0,
    price: 0
  });
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUser(userData.user?.id || null);

      // Join profile as 'owner' - explicitly fetch 'email' column from the registry (profiles table)
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          owner:profiles!user_id(full_name, avatar_url, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Fetch items error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5MB");
        return;
      }
      setItemImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
      setImagePreview(item.image_url || null);
    } else {
      setEditingItem(null);
      setFormData({ name: '', sku: '', category: 'Electronics', quantity: 0, price: 0 });
      setImagePreview(null);
      setItemImage(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication session expired.");

      let finalImageUrl = formData.image_url || '';

      if (itemImage) {
        const fileExt = itemImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('inventory')
          .upload(filePath, itemImage, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inventory')
          .getPublicUrl(filePath);
        
        finalImageUrl = publicUrl;
      }

      const payload = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        image_url: finalImageUrl,
        user_id: user.id
      };

      if (editingItem) {
        const { error: updateError } = await supabase.from('inventory').update(payload).eq('id', editingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('inventory').insert([payload]);
        if (insertError) throw insertError;
      }

      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      alert("Operation failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (item.user_id !== currentUser) {
      alert("Unauthorized: Only the asset owner can delete this record.");
      return;
    }
    if (!confirm("Permanently delete this asset?")) return;
    setIsDeleting(item.id);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('inventory').delete().eq('id', item.id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== item.id));
    } catch (err: any) {
      alert("Purge failed: " + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAnalyze = async () => {
    if (items.length === 0) return;
    setIsAnalyzing(true);
    const results = await getInventoryInsights(items);
    setInsights(results);
    setIsAnalyzing(false);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Asset Ledger</h1>
            <div className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] flex items-center space-x-2 shadow-lg shadow-blue-500/20">
              <ShieldCheck size={12} />
              <span>Registry Synced</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-bold mt-2 uppercase tracking-widest text-[10px]">Cross-Departmental Physical Resource Synchronization</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleAnalyze}
            disabled={items.length === 0 || isAnalyzing}
            className="flex items-center space-x-3 px-6 py-3 border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 shadow-sm"
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
            <span>Gemini Insights</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-3 px-8 py-4 bg-slate-900 text-white rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-300"
          >
            <Plus size={20} />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in duration-500">
          {insights.map((ins, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><BrainCircuit size={48} className="text-blue-500" /></div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 inline-block shadow-sm ${
                ins.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {ins.priority} Priority
              </span>
              <p className="text-sm font-black text-slate-900 mb-3 tracking-tight">{ins.insight}</p>
              <div className="pt-4 border-t border-slate-50">
                 <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Recommended Action:</p>
                 <p className="text-[11px] text-slate-500 font-bold mt-1 italic">{ins.action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden group">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input
              type="text"
              placeholder="Search registry by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl outline-none text-sm font-black transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm"
            />
          </div>
          <button className="p-4 text-slate-400 hover:bg-white hover:text-blue-600 rounded-2xl border border-slate-100 transition-all hover:shadow-lg shadow-sm">
            <Download size={20} />
          </button>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          {loading ? (
            <div className="p-40 flex flex-col items-center justify-center space-y-6">
              <Loader2 className="animate-spin text-blue-500" size={56} />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Querying Global Ledger...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-40 flex flex-col items-center justify-center text-center">
              <PackageCheck size={80} className="text-slate-100 mb-6" />
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Registry Node Empty</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">No physical assets detected in this sector.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-200">
                  <th className="px-10 py-6">Physical Asset</th>
                  <th className="px-10 py-6">Sector</th>
                  <th className="px-10 py-6">Inventory</th>
                  <th className="px-10 py-6">Valuation</th>
                  <th className="px-10 py-6">Registry Owner</th>
                  <th className="px-10 py-6 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 border-2 border-white overflow-hidden flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          {item.image_url ? (
                            <img src={item.image_url} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={28} className="text-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-900 tracking-tight">{item.name}</p>
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-0.5">#{item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[10px] px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-full font-black uppercase tracking-widest shadow-sm">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${item.quantity < 10 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          <span className="text-sm font-black text-slate-900">{item.quantity} Units</span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-sm text-slate-600 font-black tracking-tight">${item.price.toLocaleString()}</td>
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-200">
                          {item.owner?.avatar_url ? (
                            <img src={item.owner.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={14} className="text-slate-300" />
                          )}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">
                             {item.owner?.full_name || 'System'}
                           </span>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                              <Mail size={8} className="mr-1" />
                              {item.owner?.email?.split('@')[0] || 'internal'}
                           </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button 
                          onClick={() => handleOpenModal(item)} 
                          className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item)} 
                          disabled={isDeleting === item.id} 
                          className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
                        >
                          {isDeleting === item.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
            <div className="bg-slate-900 p-10 flex items-center justify-between text-white relative overflow-hidden">
               <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Package size={120} /></div>
               <div className="relative z-10">
                 <h3 className="font-black text-3xl tracking-tighter">{editingItem ? 'Asset Revision' : 'Register New Asset'}</h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Node Deployment Portal</p>
               </div>
               <button onClick={() => setShowModal(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-rose-500 transition-all text-slate-400 hover:text-white relative z-10"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all overflow-hidden group shadow-inner relative"
                >
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera size={32} className="text-slate-300 group-hover:text-blue-500 mx-auto mb-2" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Add Asset Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                     <Camera size={24} className="text-white" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Common Asset Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-base font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-200" placeholder="e.g. Precision Cutting Blade" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Unique SKU Identifier</label>
                    <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-black uppercase placeholder:text-slate-200 focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="SKU-XXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Industry Sector</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer">
                      <option>Electronics</option><option>Infrastructure</option><option>Supplies</option><option>Raw Assets</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Current Unit Stock</label>
                    <input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Quantity" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Unit Market Value ($)</label>
                    <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="Value" />
                  </div>
                </div>
              </div>

              <div className="flex space-x-6 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 border border-slate-200 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all text-slate-500">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-600 shadow-2xl hover:shadow-blue-500/20 flex items-center justify-center space-x-3 disabled:opacity-50 transition-all active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  <span>Commit Registry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
