
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
  ShieldCheck
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

      // Join profile as 'owner'
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          owner:profiles!user_id(full_name, avatar_url)
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Team Registry</h1>
            <div className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center space-x-1">
              <ShieldCheck size={10} />
              <span>Synced</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Cross-departmental asset synchronization.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleAnalyze}
            disabled={items.length === 0 || isAnalyzing}
            className="flex items-center space-x-2 px-5 py-2.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
            <span>Analyze</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus size={18} />
            <span>New Asset</span>
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((ins, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block ${
                ins.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {ins.priority} Priority
              </span>
              <p className="text-sm font-bold text-slate-900 mb-2">{ins.insight}</p>
              <p className="text-xs text-slate-500 italic">Action: {ins.action}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search registry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium transition-all"
            />
          </div>
          <button className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all">
            <Download size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-32 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Querying...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-32 flex flex-col items-center justify-center text-center">
              <PackageCheck size={64} className="text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-900">Registry Empty</h3>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] border-b border-slate-200">
                  <th className="px-8 py-5">Asset</th>
                  <th className="px-8 py-5">Category</th>
                  <th className="px-8 py-5">Qty</th>
                  <th className="px-8 py-5">Unit Price</th>
                  <th className="px-8 py-5">Owner</th>
                  <th className="px-8 py-5 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                          {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">#{item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] px-2 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg font-black uppercase tracking-widest">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-black tracking-tight">{item.quantity}</td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-bold">${item.price.toFixed(2)}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 ring-1 ring-slate-200">
                          {item.owner?.avatar_url ? <img src={item.owner.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={12} className="text-slate-400" />}
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{item.owner?.full_name?.split(' ')[0] || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(item)} disabled={isDeleting === item.id} className="p-2 text-slate-400 hover:text-rose-600 transition-all disabled:opacity-30">
                          {isDeleting === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-8 flex items-center justify-between text-white">
              <h3 className="font-black text-xl tracking-tight">{editingItem ? 'Modify Asset' : 'New Registry Entry'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 rounded-xl hover:text-white transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex flex-col items-center">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all overflow-hidden group shadow-inner">
                  {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera size={24} className="text-slate-300 group-hover:text-blue-500" />}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
              <div className="space-y-4">
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Asset Name" />
                <div className="grid grid-cols-2 gap-4">
                  <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black uppercase" placeholder="SKU" />
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black">
                    <option>Electronics</option><option>Infrastructure</option><option>Supplies</option><option>Raw Assets</option>
                  </select>
                  <input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black" placeholder="Qty" />
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black" placeholder="Price" />
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 flex items-center justify-center space-x-2 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>Save Node</span>
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
