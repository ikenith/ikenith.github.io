
import React from 'react';
import * as Icons from './Icons';

interface ToolbarProps {
  onFormat: (type: 'bold' | 'italic' | 'h1' | 'h2' | 'h3' | 'link' | 'quote' | 'code') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onFormat }) => {
  return (
    <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl mb-2">
      <ToolbarBtn onClick={() => onFormat('bold')} icon={<Icons.Bold size={16}/>} label="Bold" />
      <ToolbarBtn onClick={() => onFormat('italic')} icon={<Icons.Italic size={16}/>} label="Italic" />
      <div className="w-[1px] h-6 bg-zinc-800 mx-1" />
      <ToolbarBtn onClick={() => onFormat('h1')} icon={<span className="font-bold text-xs">H1</span>} label="H1" />
      <ToolbarBtn onClick={() => onFormat('h2')} icon={<span className="font-bold text-xs">H2</span>} label="H2" />
      <ToolbarBtn onClick={() => onFormat('h3')} icon={<span className="font-bold text-xs">H3</span>} label="H3" />
      <div className="w-[1px] h-6 bg-zinc-800 mx-1" />
      <ToolbarBtn onClick={() => onFormat('link')} icon={<Icons.Link size={16}/>} label="Link" />
      <ToolbarBtn onClick={() => onFormat('quote')} icon={<Icons.Quote size={16}/>} label="Quote" />
      <ToolbarBtn onClick={() => onFormat('code')} icon={<Icons.Code size={16}/>} label="Code" />
    </div>
  );
};

const ToolbarBtn = ({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    title={label}
    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
  >
    {icon}
  </button>
);

export default Toolbar;
