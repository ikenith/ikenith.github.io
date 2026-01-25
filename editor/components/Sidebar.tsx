
import React from 'react';
import * as Icons from './Icons';
import { ActivityLog } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  onClear: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, logs, onClear }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-zinc-900 border-l border-zinc-800 z-[70] shadow-2xl transition-transform duration-500 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icons.Activity size={18} className="text-blue-500" /> Notifications
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <Icons.Close size={20} />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar h-[calc(100%-8rem)]">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
              <Icons.Inbox size={48} />
              <p className="text-sm font-medium">No activity to show</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      log.type === 'success' ? 'text-emerald-500' :
                      log.type === 'error' ? 'text-rose-500' :
                      log.type === 'warning' ? 'text-amber-500' :
                      'text-blue-500'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="h-16 p-4 border-t border-zinc-800 flex items-center">
          <button 
            onClick={onClear}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          >
            Clear All
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
