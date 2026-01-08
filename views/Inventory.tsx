import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
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
  Check
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [insights, setInsights] = useState<{insight: string, action: string, priority: string}[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Modal form state
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
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

      if (error) {
         console.warn('Table check:', error.message);
         setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error(err);
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
      setItemImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      let finalImageUrl = '';

      // 1. Upload image if provided
      if (itemImage) {
        const fileExt = itemImage.name.split('.').pop();
        const filePath = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('inventory')
          .upload(filePath, itemImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inventory')
          .getPublicUrl(filePath);
        
        finalImageUrl = publicUrl;
      }

      // 2. Insert into DB
      const { error: insertError } = await supabase
        .from('inventory')
        .insert([{
          ...newItem,
          image_url: finalImageUrl
        }]);

      if (insertError) throw insertError;

      alert("Item added successfully!");
      setShowAddModal(false);
      setNewItem({ name: '', sku: '', category: 'Electronics', quantity: 0, price: 0 });
      setItemImage(null);
      setImagePreview(null);
      fetchItems();
    } catch (err: any) {
      alert("Error adding item: " + err.message);
    } finally {
      setIsSaving(false);
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
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Assets</h1>
          <p className="text-slate-500 text-sm font-medium">Global enterprise tracking across multiple nodes.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleAnalyze}
            disabled={items.length === 0 || isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
            <span>Compute Insights</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            <Plus size={18} />
            <span>New Registry</span>
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-500">
          {insights.map((ins, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <BrainCircuit size={80} />
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  ins.priority === 'High' ? 'bg-rose-50 text-rose-600' : 
                  ins.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {ins.priority} Priority
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 mb-2 leading-snug">{ins.insight}</p>
              <p className="text-xs text-slate-500 font-medium italic">Command: {ins.action}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors">
              <Filter size={18} />
            </button>
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors">
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-32 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Querying Cloud Registry...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-32 flex flex-col items-center justify-center text-center space-y-6">
              <div className="bg-slate-50 p-8 rounded-[2.5rem] shadow-inner">
                <PackageCheck size={64} className="text-slate-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Database Empty</h3>
                <p className="text-slate-400 text-sm max-w-sm font-medium mt-1">
                  Start building your enterprise catalog by adding your first asset.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] border-b border-slate-200">
                  <th className="px-6 py-4">Asset Details</th>
                  <th className="px-6 py-4">Node Category</th>
                  <th className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <span>Quantity</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4">Unit Val ($)</th>
                  <th className="px-6 py-4">Total Value</th>
                  <th className="px-6 py-4 text-right">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                          {item.image_url ? (
                            <img src={`${item.image_url}?t=${Date.now()}`} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={24} className="text-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ID: {item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${item.quantity < 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.quantity}
                        </span>
                        {item.quantity < 10 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-bold">${item.price.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      ${(item.quantity * item.price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-blue-100 transition-all">
                          <Edit size={16} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-rose-100 transition-all">
                          <Trash2 size={16} />
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

      {/* Polish Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <Package size={20} />
                </div>
                <h3 className="font-bold text-xl">New Asset Registry</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-8 space-y-6">
              <div className="flex flex-col items-center mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all overflow-hidden"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Camera size={24} className="mx-auto mb-1" />
                      <span className="text-[10px] font-bold uppercase">Photo</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Product Name</label>
                  <input
                    required
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                    placeholder="Enter item name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">SKU / ID</label>
                  <input
                    required
                    value={newItem.sku}
                    onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all"
                    placeholder="E.G. TRX-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  >
                    <option>Electronics</option>
                    <option>Office Supplies</option>
                    <option>Furniture</option>
                    <option>Infrastructure</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Quantity</label>
                  <input
                    type="number"
                    required
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                  <span>Save Record</span>
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