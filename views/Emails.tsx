
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  X, 
  Loader2, 
  Search, 
  Mail, 
  Inbox, 
  SendHorizontal, 
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  ChevronRight,
  AlertCircle,
  Clock,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  User as UserIcon
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';
import { Email, EmailAttachment } from '../types';

const Emails: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'inbox' | 'outbox'>('inbox');
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmails = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get the current user's email from their profile for filtering
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      
      const userEmail = profile?.email || user.email;
      setCurrentUserEmail(userEmail || null);

      // 2. Fetch emails with Sender Identity Join
      // Profiles join is aliased to 'sender' for clear UI mapping
      const { data, error } = await supabase
        .from('emails')
        .select(`
          *,
          sender:profiles!user_id(full_name, avatar_url, email)
        `)
        .or(`user_id.eq.${user.id},recipient_email.eq.${userEmail}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmails(data || []);
    } catch (e) { 
      console.error("Communication log error:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchEmails(); }, []);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
      if (validFiles.length < files.length) {
        alert("Skipped files exceeding 5MB limit.");
      }
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failure.");

      const { data: recipientProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', to.trim().toLowerCase())
        .maybeSingle();

      if (verifyError) throw verifyError;

      const status = recipientProfile ? 'sent' : 'failed';
      const uploadedAttachments: EmailAttachment[] = [];
      
      if (recipientProfile && attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('email_attachments')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('email_attachments')
            .getPublicUrl(filePath);
            
          uploadedAttachments.push({
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size
          });
        }
      }

      const { error } = await supabase.from('emails').insert([{
        user_id: user.id,
        recipient_email: to.trim().toLowerCase(),
        subject,
        body,
        attachments: uploadedAttachments,
        status: status
      }]);

      if (error) throw error;

      if (status === 'failed') {
        alert(`TRANSMISSION ABORTED: Recipient "${to}" is not registered in the system.`);
      }
      
      setShowCompose(false);
      setTo('');
      setSubject('');
      setBody('');
      setAttachments([]);
      fetchEmails();
      setViewTab('outbox');
    } catch (e: any) {
      alert("Comms Deployment Failed: " + (e.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={18} className="text-blue-500" />;
    if (type.includes('pdf')) return <FileText size={18} className="text-rose-500" />;
    return <FileIcon size={18} className="text-slate-400" />;
  };

  const filteredEmails = emails.filter(e => {
    const matchesSearch = e.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.sender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isOutbox = e.recipient_email !== currentUserEmail;
    return matchesSearch && (viewTab === 'outbox' ? isOutbox : !isOutbox);
  });

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Communications Registry</h1>
          <div className="flex items-center space-x-2 mt-1">
             <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Live Node: {currentUserEmail || 'Identifying...'}</p>
          </div>
        </div>
        {!selectedEmail && (
          <div className="flex items-center space-x-3">
             <button 
              onClick={fetchEmails}
              disabled={loading}
              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all hover:border-blue-200 shadow-sm"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setShowCompose(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Send size={16} />
              <span>Deploy Broadcast</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Navigation Sidebar */}
        {!selectedEmail && (
          <div className="lg:w-72 flex flex-col space-y-3">
            <button 
              onClick={() => setViewTab('inbox')}
              className={`flex items-center justify-between p-6 rounded-[1.8rem] border transition-all ${
                viewTab === 'inbox' ? 'bg-blue-600 text-white border-blue-700 shadow-xl shadow-blue-500/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
               <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl ${viewTab === 'inbox' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                    <Inbox size={20} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">Inbox Logs</span>
               </div>
               <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${viewTab === 'inbox' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                 {emails.filter(e => e.recipient_email === currentUserEmail).length}
               </span>
            </button>
            <button 
              onClick={() => setViewTab('outbox')}
              className={`flex items-center justify-between p-6 rounded-[1.8rem] border transition-all ${
                viewTab === 'outbox' ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
               <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl ${viewTab === 'outbox' ? 'bg-white/10' : 'bg-slate-100 text-slate-400'}`}>
                    <SendHorizontal size={20} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">Outbox Logs</span>
               </div>
               <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${viewTab === 'outbox' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
                 {emails.filter(e => e.recipient_email !== currentUserEmail).length}
               </span>
            </button>
          </div>
        )}

        {/* Dynamic Content Area */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {selectedEmail ? (
            // DETAIL VIEW
            <div className="flex flex-col h-full animate-in slide-in-from-right duration-400">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <button 
                  onClick={() => setSelectedEmail(null)}
                  className="flex items-center space-x-2 text-slate-400 hover:text-slate-900 transition-colors group"
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Registry List</span>
                </button>
                <div className={`flex items-center space-x-2 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest border ${
                   selectedEmail.status === 'failed' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                }`}>
                   {selectedEmail.status === 'failed' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                   <span>{selectedEmail.status === 'failed' ? 'Registry Rejection' : `Verified Broadcast`}</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-12 space-y-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                     <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{selectedEmail.subject || '(Operational Briefing)'}</h2>
                     <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
                           <div className="w-8 h-8 rounded-lg bg-white overflow-hidden border border-slate-200 flex items-center justify-center">
                              {selectedEmail.sender?.avatar_url ? <img src={selectedEmail.sender.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={14} className="text-slate-300" />}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From Node</span>
                              <span className="text-[11px] font-black text-slate-900 uppercase">{selectedEmail.sender?.full_name || 'Registry Sender'}</span>
                           </div>
                        </div>
                        <div className="flex items-center space-x-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
                           <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                              <Mail size={14} />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Node</span>
                              <span className="text-[11px] font-black text-slate-900 uppercase">{selectedEmail.recipient_email}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transmission Date</p>
                    <p className="text-sm font-black text-slate-900">{new Date(selectedEmail.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 text-slate-700 leading-relaxed text-base whitespace-pre-wrap font-medium shadow-inner min-h-[400px]">
                  {selectedEmail.body}
                </div>

                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                       <Paperclip size={18} className="text-slate-400" />
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Assets ({selectedEmail.attachments.length})</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {selectedEmail.attachments.map((at, idx) => (
                        <div key={idx} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl group hover:border-blue-500 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                              {getFileIcon(at.type)}
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-900 truncate max-w-[150px] uppercase tracking-tight">{at.name}</p>
                               <p className="text-[9px] text-slate-400 font-black uppercase">{formatFileSize(at.size)}</p>
                            </div>
                          </div>
                          <a href={at.url} target="_blank" rel="noreferrer" className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><ExternalLink size={18} /></a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // MASTER LIST VIEW
            <>
              <div className="p-6 border-b border-slate-50 bg-slate-50/20">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input 
                    type="text" 
                    placeholder={`Search logs for ${viewTab === 'inbox' ? 'sender' : 'recipient'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {loading ? (
                   <div className="p-40 flex flex-col items-center justify-center space-y-6">
                      <Loader2 className="animate-spin text-blue-600" size={48} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Registry Nodes...</p>
                   </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-40 text-center">
                    <Mail size={80} className="text-slate-100 mx-auto mb-8" />
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Node Log Empty</h3>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-3">No operational communications found in this sector.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredEmails.map(email => {
                      const isInbox = email.recipient_email === currentUserEmail;
                      return (
                        <div 
                          key={email.id} 
                          onClick={() => setSelectedEmail(email)}
                          className="p-10 hover:bg-blue-50/30 transition-all group cursor-pointer flex items-center space-x-10"
                        >
                          <div className={`w-16 h-16 rounded-[1.8rem] border flex items-center justify-center transition-all shadow-sm ${
                            email.status === 'failed' ? 'bg-rose-50 text-rose-500 border-rose-200' : 
                            isInbox ? 'bg-blue-600 text-white border-blue-700' :
                            'bg-slate-900 text-white border-slate-900'
                          }`}>
                             {email.status === 'failed' ? <AlertTriangle size={28} /> : 
                              isInbox ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                   <div className="w-7 h-7 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                                      {isInbox && email.sender?.avatar_url ? (
                                        <img src={email.sender.avatar_url} className="w-full h-full object-cover" />
                                      ) : (
                                        <UserIcon size={12} className="text-slate-400" />
                                      )}
                                   </div>
                                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                     {isInbox ? 'From:' : 'Target:'} <span className="text-slate-900 ml-1">{isInbox ? (email.sender?.full_name || 'Registry Node') : email.recipient_email}</span>
                                   </h4>
                                </div>
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">{new Date(email.created_at).toLocaleDateString()}</span>
                             </div>
                             <p className={`text-lg font-black truncate mb-1 tracking-tight ${email.status === 'failed' ? 'text-rose-600' : 'text-slate-800'}`}>
                               {email.status === 'failed' && '[SECURITY REJECTION] '}{email.subject || '(Operational Protocol)'}
                             </p>
                             <p className="text-sm text-slate-500 font-medium truncate max-w-3xl leading-relaxed">{email.body}</p>
                             
                             <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-50">
                                <div className="flex items-center space-x-4">
                                   {email.attachments && email.attachments.length > 0 && (
                                     <div className="flex items-center space-x-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                                        <Paperclip size={12} className="text-slate-400" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{email.attachments.length} Assets Linked</span>
                                     </div>
                                   )}
                                   {isInbox && (
                                     <div className="flex items-center space-x-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{email.sender?.email || 'verified_origin'}</span>
                                     </div>
                                   )}
                                </div>
                                <div className={`text-[8px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border shadow-sm ${
                                   email.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                   email.status === 'sent' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                   'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                   {email.status === 'failed' ? 'Registry Rejection' : email.status}
                                </div>
                             </div>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl text-slate-200 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                             <ChevronRight size={24} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Broadcast Composer */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-400">
            <div className="bg-slate-900 p-10 flex items-center justify-between text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 opacity-10">
                 <Send size={150} />
              </div>
              <div className="relative z-10">
                <h3 className="font-black text-3xl tracking-tighter uppercase">Deploy Transmission</h3>
                <p className="text-slate-500 text-[10px] font-black mt-2 uppercase tracking-[0.3em]">Secure Sector Channel Deployment</p>
              </div>
              <button onClick={() => setShowCompose(false)} className="p-4 bg-white/5 rounded-3xl hover:bg-rose-500 transition-all text-slate-400 hover:text-white relative z-10">
                <X size={32} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-12 space-y-8 bg-white">
              <div className="space-y-6">
                <div className="flex flex-col space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Recipient Key (Email)</label>
                   <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input required type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="Target node identifier..." className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                   </div>
                </div>
                <div className="flex flex-col space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Subject Protocol</label>
                   <input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="Operation Designation..." className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Briefing Payload</label>
                   <textarea 
                     required
                     rows={8}
                     value={body}
                     onChange={e => setBody(e.target.value)}
                     placeholder="Compose operational briefing details..."
                     className="w-full bg-slate-50 p-10 rounded-[3rem] text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all border border-slate-200 resize-none shadow-inner"
                   />
                   <div className="flex items-center space-x-4 p-5 bg-amber-50 border border-amber-100 rounded-3xl text-amber-700">
                      <AlertTriangle size={24} className="flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Discovery Check Active</p>
                        <p className="text-[11px] font-medium opacity-80 leading-relaxed">System will verify target email in the global registry. Unverified nodes will trigger an automated deployment abort.</p>
                      </div>
                   </div>
                </div>
              </div>

              {attachments.length > 0 && (
                 <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    {attachments.map((file, idx) => (
                       <div key={idx} className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                          {getFileIcon(file.type)}
                          <span className="text-[10px] font-black text-slate-600 truncate max-w-[150px] uppercase tracking-tight">{file.name}</span>
                          <button type="button" onClick={() => removeAttachment(idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={16} /></button>
                       </div>
                    ))}
                 </div>
              )}

              <div className="flex items-center justify-between pt-6">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-5 bg-slate-50 text-slate-900 rounded-[2rem] hover:bg-slate-100 transition-all border border-slate-200 flex items-center space-x-3 shadow-sm hover:shadow-lg"
                >
                  <Paperclip size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Linked Assets</span>
                </button>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileAttach} className="hidden" />

                <div className="flex space-x-6">
                  <button type="button" onClick={() => setShowCompose(false)} className="px-10 py-5 text-slate-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">Abort</button>
                  <button 
                    type="submit" 
                    disabled={isSending}
                    className="px-14 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 shadow-2xl hover:shadow-blue-500/20 flex items-center space-x-4 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    <span>Deploy</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Emails;
