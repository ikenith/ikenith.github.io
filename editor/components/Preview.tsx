
import React, { useMemo } from 'react';

interface PreviewProps {
  content: string;
  title: string;
  date: string;
  image: string | null;
}

declare const marked: any;

const Preview: React.FC<PreviewProps> = ({ content, title, date, image }) => {
  const html = useMemo(() => {
    if (typeof marked === 'undefined') return '';
    return marked.parse(content || '*Draft content preview...*');
  }, [content]);

  return (
    <div className="bg-white text-zinc-900 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col border border-zinc-200">
      <div className="h-12 bg-zinc-50 border-b border-zinc-200 flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-400"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
        </div>
        <div className="flex-1 text-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Read Mode Preview</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <article className="max-w-3xl mx-auto px-8 py-12 md:px-16">
          {image && (
            <img src={image} className="w-full h-[300px] object-cover rounded-2xl mb-8 shadow-lg shadow-zinc-200" alt="Featured" />
          )}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-950 mb-4 tracking-tight leading-tight">
              {title || 'Untiteld Post'}
            </h1>
            <div className="flex items-center gap-3 text-zinc-500 font-medium">
              <span className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200"></span>
              <span className="text-sm">By The Roots</span>
              <span className="text-zinc-300">•</span>
              <span className="text-sm">{new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </header>
          <div 
            className="markdown-body prose prose-zinc max-w-none text-zinc-700 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </div>
    </div>
  );
};

export default Preview;
