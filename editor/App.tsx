
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogType, ActivityLog, Draft, DraftData, Post, Toast } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Toolbar from './components/Toolbar.tsx';
import Preview from './components/Preview.tsx';
import Modals from './components/Modals.tsx';
import * as Icons from './components/Icons.tsx';

const LOCAL_STORAGE_DRAFTS = 'roots-editor-drafts';
const LOCAL_STORAGE_LOGS = 'roots-editor-logs';
const LOCAL_STORAGE_TOKEN = 'roots-editor-token';
const LOCAL_STORAGE_REPO = 'roots-editor-repo';

const App: React.FC = () => {
  // --- Core State ---
  const [token, setToken] = useState(() => localStorage.getItem(LOCAL_STORAGE_TOKEN) || '');
  const [repoPath, setRepoPath] = useState(() => localStorage.getItem(LOCAL_STORAGE_REPO) || 'username/repo');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [imageOption, setImageOption] = useState<'upload' | 'url' | 'none'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [croppedImageData, setCroppedImageData] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  
  // --- Meta State ---
  const [isEditing, setIsEditing] = useState(false);
  const [currentPostSha, setCurrentPostSha] = useState<string | null>(null);
  const [currentImageSha, setCurrentImageSha] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Collections ---
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // --- Modal Visibility ---
  const [modalOpen, setModalOpen] = useState<'image' | 'posts' | 'save-draft' | 'load-draft' | 'logs' | null>(null);

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Initialize ---
  useEffect(() => {
    const savedDrafts = localStorage.getItem(LOCAL_STORAGE_DRAFTS);
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts));

    const savedLogs = localStorage.getItem(LOCAL_STORAGE_LOGS);
    if (savedLogs) setLogs(JSON.parse(savedLogs));

    addLog('Editor initialized', 'info');
  }, []);

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_TOKEN, token); }, [token]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_REPO, repoPath); }, [repoPath]);

  const addLog = useCallback((message: string, type: LogType = 'info') => {
    const newLog: ActivityLog = { id: Date.now(), timestamp: new Date().toISOString(), message, type };
    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100);
      localStorage.setItem(LOCAL_STORAGE_LOGS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const showToast = useCallback((message: string, type: LogType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    addLog(`Notification: ${message}`, type);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
  }, [addLog]);

  const saveDraftsToStorage = (updatedDrafts: Draft[]) => {
    setDrafts(updatedDrafts);
    localStorage.setItem(LOCAL_STORAGE_DRAFTS, JSON.stringify(updatedDrafts));
  };

  const getEditorData = (): DraftData => ({
    title, date, content, imageOption, imageUrl,
    croppedImageData, filename, isEditing,
    postSha: currentPostSha, imageSha: currentImageSha
  });

  const handleSaveDraft = (name: string) => {
    const data = getEditorData();
    if (currentDraftId) {
      const updated = drafts.map(d => d.id === currentDraftId ? { ...d, name, data, updatedAt: new Date().toISOString() } : d);
      saveDraftsToStorage(updated);
      showToast(`Draft "${name}" updated`, 'success');
    } else {
      const newDraft: Draft = { id: `draft-${Date.now()}`, name, data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      saveDraftsToStorage([newDraft, ...drafts]);
      setCurrentDraftId(newDraft.id);
      showToast(`Draft "${name}" saved`, 'success');
    }
    setModalOpen(null);
  };

  const loadDraft = (draft: Draft) => {
    const { data } = draft;
    setTitle(data.title); setDate(data.date); setContent(data.content); setImageOption(data.imageOption);
    setImageUrl(data.imageUrl); setCroppedImageData(data.croppedImageData); setFilename(data.filename);
    setIsEditing(data.isEditing); setCurrentPostSha(data.postSha); setCurrentImageSha(data.imageSha);
    setCurrentDraftId(draft.id); setModalOpen(null);
    showToast(`Draft "${draft.name}" loaded`, 'success');
  };

  const clearForm = () => {
    setTitle(''); setDate(new Date().toISOString().split('T')[0]); setContent('');
    setImageOption('upload'); setImageUrl(''); setCroppedImageData(null); setFilename('');
    setIsEditing(false); setCurrentPostSha(null); setCurrentImageSha(null); setCurrentDraftId(null);
    showToast('Form cleared', 'info');
  };

  const updateFilenameFromTitle = (val: string) => {
    setTitle(val);
    if (!isEditing) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '.md';
      setFilename(slug);
    }
  };

  const publishPost = async () => {
    if (!token) return showToast('GitHub Token is required', 'error');
    if (!repoPath || !repoPath.includes('/')) return showToast('Valid Repository Path required', 'error');
    if (!title) return showToast('Title is required', 'error');

    showToast(isEditing ? 'Updating...' : 'Publishing...', 'info');

    try {
      const repo = repoPath.trim();
      let finalImageUrl = imageUrl;
      let finalImageSha = currentImageSha;

      if (imageOption === 'upload' && croppedImageData) {
        const imageFilename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.jpg';
        const imagePath = `images/${imageFilename}`;
        const base64Data = croppedImageData.split(',')[1];
        const imgRes = await fetch(`https://api.github.com/repos/${repo}/contents/${imagePath}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Update image for ${title}`, content: base64Data, sha: finalImageSha || undefined })
        });
        if (imgRes.ok) {
          const imgResult = await imgRes.json();
          finalImageUrl = `https://raw.githubusercontent.com/${repo}/main/${imagePath}`;
          finalImageSha = imgResult.content.sha;
          setCurrentImageSha(finalImageSha);
        }
      }

      const frontmatter = ['---', `title: "${title.replace(/"/g, '\\"')}"`, `date: "${date}"`, finalImageUrl && `image: "${finalImageUrl}"`, '---', ''].filter(Boolean).join('\n');
      const fullContent = frontmatter + content;
      const filePath = `posts/${filename}`;
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${isEditing ? 'Update' : 'Add'} post: ${title}`, content: btoa(unescape(encodeURIComponent(fullContent))), sha: currentPostSha || undefined })
      });

      if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'GitHub API error'); }
      const result = await response.json();
      setCurrentPostSha(result.content.sha);
      showToast(`✨ Success! "${title}" ${isEditing ? 'updated' : 'published'}`, 'success');
    } catch (err: any) { showToast(`Error: ${err.message}`, 'error'); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`p-4 rounded-xl border shadow-2xl flex justify-between items-center pointer-events-auto backdrop-blur-md animate-in slide-in-from-right duration-300 ${t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : t.type === 'error' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : t.type === 'warning' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-blue-500/10 border-blue-500 text-blue-400'}`}>
            <span className="font-medium">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-4 opacity-70 hover:opacity-100"><Icons.Close size={18} /></button>
          </div>
        ))}
      </div>

      <nav className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 z-50 flex items-center px-6">
        <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-white cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Icons.Feather size={20} /></div>
          <span>The Roots</span>
        </div>
        <div className="flex-1 flex justify-center gap-8 text-sm font-medium text-zinc-400">
          <span className="text-white">Dashboard</span>
          <span className="opacity-50">Writings</span>
          <span className="opacity-50">Analytics</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 relative">
            <Icons.Bell size={20} />
            {logs.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>}
          </button>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=roots" alt="Avatar" />
          </div>
        </div>
      </nav>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} logs={logs} onClear={() => { setLogs([]); localStorage.removeItem(LOCAL_STORAGE_LOGS); }} />

      <main className="mt-16 flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full">
        <div className={`flex-1 flex flex-col gap-6 transition-all duration-300 ${isPreviewVisible ? 'md:w-1/2' : 'w-full'}`}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-blue-400 shadow-inner"><Icons.Edit size={22} /></div>
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">Post Editor</h1>
                  <p className="text-xs text-zinc-500">{isEditing ? `Editing: ${filename}` : 'Drafting new story'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setModalOpen('save-draft')} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-2"><Icons.Save size={14} /> Save Draft</button>
                <button onClick={() => setModalOpen('load-draft')} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-2"><Icons.Folder size={14} /> Load Draft</button>
                <button onClick={() => setIsPreviewVisible(!isPreviewVisible)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${isPreviewVisible ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-800 text-zinc-400'}`}>
                  {isPreviewVisible ? <Icons.Eye size={14} /> : <Icons.EyeOff size={14} />} Preview
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 mb-2"><Icons.Activity size={14} className="text-blue-500" /><h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connection Setup</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest">GitHub Token</label>
                    <div className="relative group">
                      <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_..." className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500/50 outline-none transition-all font-mono" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600"><Icons.Lock size={14} /></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Repository Path</label>
                    <div className="relative group">
                      <input type="text" value={repoPath} onChange={(e) => setRepoPath(e.target.value)} placeholder="username/repo" className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500/50 outline-none transition-all font-mono" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600"><Icons.CloudUpload size={14} /></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Post Title</label>
                  <input type="text" value={title} onChange={(e) => updateFilenameFromTitle(e.target.value)} placeholder="Enter post title..." className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Publication Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all [color-scheme:dark]" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Featured Image</label>
                  <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    {(['upload', 'url', 'none'] as const).map(opt => (
                      <button key={opt} onClick={() => setImageOption(opt)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${imageOption === opt ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
                {imageOption === 'upload' && (
                  <div className="space-y-4">
                    {!croppedImageData ? (
                      <div onClick={() => setModalOpen('image')} className="w-full h-40 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/50 hover:bg-zinc-800/20 transition-all group">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-blue-500 transition-colors"><Icons.Upload size={24} /></div>
                        <p className="text-sm font-medium text-zinc-400">Click to upload & crop featured image</p>
                      </div>
                    ) : (
                      <div className="relative group rounded-2xl overflow-hidden border border-zinc-800 shadow-lg">
                        <img src={croppedImageData} className="w-full h-48 object-cover" />
                        <div className="absolute inset-0 bg-zinc-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <button onClick={() => setModalOpen('image')} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"><Icons.Edit size={20}/></button>
                          <button onClick={() => setCroppedImageData(null)} className="p-3 bg-rose-600 text-white rounded-full hover:scale-110 transition-transform"><Icons.Trash size={20}/></button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {imageOption === 'url' && ( <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all" /> )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Content</label>
                <Toolbar onFormat={(type) => {
                  if (!textareaRef.current) return;
                  const ta = textareaRef.current;
                  const start = ta.selectionStart; const end = ta.selectionEnd;
                  const selected = content.substring(start, end);
                  let prefix = '', suffix = '';
                  switch(type) {
                    case 'bold': prefix = suffix = '**'; break; case 'italic': prefix = suffix = '*'; break;
                    case 'h1': prefix = '# '; break; case 'h2': prefix = '## '; break; case 'h3': prefix = '### '; break;
                    case 'link': prefix = '['; suffix = '](url)'; break; case 'quote': prefix = '> '; break; case 'code': prefix = suffix = '`'; break;
                  }
                  setContent(content.substring(0, start) + prefix + selected + suffix + content.substring(end));
                  setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, end + prefix.length); }, 0);
                }} />
                <textarea ref={textareaRef} value={content} onChange={(e) => setContent(e.target.value)} placeholder="# Begin your story..." className="w-full h-[500px] bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-5 py-5 text-sm font-mono focus:border-blue-500/30 outline-none transition-all resize-none custom-scrollbar leading-relaxed" />
              </div>
            </div>

            <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-between items-center">
               <div className="flex gap-3 text-xs text-zinc-500 font-medium"><span>{content.split(/\s+/).filter(Boolean).length} words</span><span>•</span><span>{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)} min read</span></div>
               <div className="flex gap-3">
                 <button onClick={clearForm} className="px-4 py-2 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-bold uppercase tracking-wider">Clear</button>
                 <button onClick={publishPost} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2 uppercase tracking-wider"><Icons.CloudUpload size={16} /> Deploy to Website</button>
               </div>
            </div>
          </div>
        </div>
        {isPreviewVisible && ( <div className="flex-1 min-w-0 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500"><Preview content={content} title={title} date={date} image={imageOption === 'upload' ? croppedImageData : imageUrl} /></div> )}
      </main>
      <Modals type={modalOpen} onClose={() => setModalOpen(null)} onSaveDraft={handleSaveDraft} onLoadDraft={loadDraft} drafts={drafts} onDeleteDraft={(id) => saveDraftsToStorage(drafts.filter(d => d.id !== id))} onSetImage={(data) => { setCroppedImageData(data); setModalOpen(null); }} logs={logs} onClearLogs={() => { setLogs([]); localStorage.removeItem(LOCAL_STORAGE_LOGS); }} />
    </div>
  );
};
export default App;
