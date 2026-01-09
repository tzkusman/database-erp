
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Edit, 
  Trash2, 
  Download,
  BrainCircuit,
  Loader2,
  PackageCheck,
  Camera,
  X,
  Package,
  Check,
  AlertCircle,
  Save
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
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
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

      // Upload new image if provided
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
        const { error: updateError } = await supabase
          .from('inventory')
          .update(payload)
          .eq('id', editingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('inventory')
          .insert([payload]);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This asset will be permanently purged from the system registry.")) return;
    setIsDeleting(id);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      setItems(items.filter(item => item.id !== id));
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory Registry</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Enterprise asset node tracking and SKU management.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleAnalyze}
            disabled={items.length === 0 || isAnalyzing}
            className="group flex items-center space-x-2 px-5 py-2.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} className="group-hover:scale-110 transition-transform" />}
            <span>Analyze Fleet</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus size={18} />
            <span>New Asset</span>
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-500">
          {insights.map((ins, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <BrainCircuit size={100} />
               </div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                  ins.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                  ins.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  {ins.priority} Priority
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 mb-2 leading-snug">{ins.insight}</p>
              <p className="text-xs text-slate-500 font-medium italic">Action: {ins.action}</p>
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
              placeholder="Search assets (name, SKU)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all font-medium"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors">
              <Filter size={18} />
            </button>
            <button 
              onClick={fetchItems}
              className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-32 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Querying Infrastructure...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-32 flex flex-col items-center justify-center text-center">
              <div className="bg-slate-50 p-10 rounded-[3rem] mb-6 shadow-inner">
                <PackageCheck size={64} className="text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No Assets Registered</h3>
              <p className="text-slate-500 text-sm max-w-xs mt-2 font-medium">The system vault is empty for current parameters.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] border-b border-slate-200">
                  <th className="px-8 py-5">Product Identity</th>
                  <th className="px-8 py-5">Category</th>
                  <th className="px-8 py-5 text-center">Qty</th>
                  <th className="px-8 py-5">Unit Val</th>
                  <th className="px-8 py-5">Total Valuation</th>
                  <th className="px-8 py-5 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                          {item.image_url ? (
                            <img src={`${item.image_url}?t=${Date.now()}`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={24} className="text-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">#{item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg font-bold uppercase tracking-widest">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-black ${item.quantity < 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.quantity}
                        </span>
                        {item.quantity < 10 && (
                          <span className="text-[8px] font-bold text-rose-500 uppercase tracking-widest mt-0.5 animate-pulse">Low Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-600 font-bold">${item.price.toFixed(2)}</td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-900">
                      ${(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleOpenModal(item)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting === item.id}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-100 disabled:opacity-30"
                        >
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
              <div>
                <h3 className="font-bold text-xl tracking-tight">{editingItem ? 'Modify Asset Node' : 'Initialize Asset Node'}</h3>
                <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">System Registry Portal</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors p-2 bg-white/5 rounded-xl">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all overflow-hidden shadow-inner group relative"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-300 group-hover:text-blue-400 transition-colors">
                      <Camera size={32} className="mx-auto mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Upload Profile</span>
                    </div>
                  )}
                  {imagePreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Camera size={24} className="text-white" />
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Product Descriptor</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold transition-all"
                  placeholder="Asset Designation Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">SKU Core</label>
                  <input
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-bold uppercase"
                    placeholder="SKU-XXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Segment</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  >
                    <option>Electronics</option>
                    <option>Infrastructure</option>
                    <option>Supplies</option>
                    <option>Raw Assets</option>
                    <option>Capital Goods</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Value (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-2xl shadow-blue-500/20 flex items-center justify-center space-x-3 disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  <span>{editingItem ? 'Update Node' : 'Initialize'}</span>
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
