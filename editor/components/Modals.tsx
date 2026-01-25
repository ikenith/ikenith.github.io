
import React, { useState, useRef, useEffect } from 'react';
import * as Icons from './Icons';
import { Draft, ActivityLog } from '../types';

interface ModalsProps {
  type: 'image' | 'posts' | 'save-draft' | 'load-draft' | 'logs' | null;
  onClose: () => void;
  onSaveDraft: (name: string) => void;
  onLoadDraft: (draft: Draft) => void;
  drafts: Draft[];
  onDeleteDraft: (id: string) => void;
  onSetImage: (data: string) => void;
  logs: ActivityLog[];
  onClearLogs: () => void;
}

declare const Cropper: any;

const Modals: React.FC<ModalsProps> = ({ 
  type, onClose, onSaveDraft, onLoadDraft, drafts, onDeleteDraft, onSetImage, logs, onClearLogs 
}) => {
  const [draftName, setDraftName] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);

  useEffect(() => {
    if (type === 'image' && tempImage && imgRef.current) {
      if (cropperRef.current) cropperRef.current.destroy();
      cropperRef.current = new Cropper(imgRef.current, {
        aspectRatio: 16 / 9,
        viewMode: 1,
        background: false,
      });
    }
    return () => {
      if (cropperRef.current) cropperRef.current.destroy();
    };
  }, [type, tempImage]);

  if (!type) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white capitalize">{type.replace('-', ' ')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500">
            <Icons.Close size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {type === 'save-draft' && (
            <div className="space-y-4">
              <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Draft Name</label>
              <input 
                type="text"
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Initial Thoughts..."
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-2xl px-5 py-4 text-lg focus:border-blue-500/50 outline-none transition-all"
              />
              <button 
                onClick={() => onSaveDraft(draftName)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20"
              >
                Confirm Save
              </button>
            </div>
          )}

          {type === 'load-draft' && (
            <div className="space-y-3">
              {drafts.length === 0 ? (
                <p className="text-center text-zinc-500 py-12 italic">No drafts found.</p>
              ) : (
                drafts.map(d => (
                  <div key={d.id} className="group p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex justify-between items-center hover:border-zinc-700 transition-all">
                    <div>
                      <h4 className="font-bold text-zinc-200">{d.name}</h4>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Updated {new Date(d.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onLoadDraft(d)} className="px-4 py-2 bg-zinc-800 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all">Load</button>
                      <button onClick={() => onDeleteDraft(d.id)} className="p-2 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all"><Icons.Trash size={16}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {type === 'image' && (
            <div className="space-y-6">
              {!tempImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-zinc-800/20 transition-all"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setTempImage(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="w-16 h-16 rounded-3xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                    <Icons.Image size={32} />
                  </div>
                  <p className="font-bold text-zinc-400">Choose an image from your device</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-black rounded-2xl overflow-hidden max-h-96">
                    <img ref={imgRef} src={tempImage} className="max-w-full block" />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setTempImage(null)}
                      className="flex-1 py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-bold uppercase tracking-widest"
                    >
                      Change File
                    </button>
                    <button 
                      onClick={() => {
                        const canvas = cropperRef.current?.getCroppedCanvas();
                        if (canvas) onSetImage(canvas.toDataURL());
                      }}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-blue-600/20"
                    >
                      Crop & Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{logs.length} Total Logs</span>
                <button onClick={onClearLogs} className="text-xs font-bold text-rose-500 hover:underline">Clear Logs</button>
              </div>
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs">
                    <span className="text-zinc-600 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-bold mr-2 ${log.type === 'error' ? 'text-rose-500' : 'text-zinc-400'}`}>[{log.type}]</span>
                    <span className="text-zinc-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modals;
