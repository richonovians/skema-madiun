import React from 'react';
import { Paperclip, Image as ImageIcon, FileText, Download, Maximize2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ComplaintAttachmentGallery({ complaint }) {
  const attachments = complaint.attachments || [];

  if (attachments.length === 0) return null; // Don't show if no attachments

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-slate-500" />
          <h3 className="text-title-md font-bold text-slate-800">
            Lampiran ({attachments.length})
          </h3>
        </div>
      </div>
      
      <div className="p-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
        {attachments.map((file) => (
          <div key={file.id} className="group relative flex flex-col border border-slate-200 rounded-xl overflow-hidden hover:border-primary/50 transition-colors bg-white">
            
            {/* Preview Area */}
            <div className="h-32 bg-slate-100 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-200 transition-colors">
              {file.type === 'image' ? (
                <>
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors">
                      <Maximize2 size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <FileText size={40} className="text-slate-400" />
              )}
            </div>

            {/* File Info */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                {file.type === 'image' ? (
                  <ImageIcon size={16} className="text-blue-500 shrink-0" />
                ) : (
                  <FileText size={16} className="text-orange-500 shrink-0" />
                )}
                <div className="truncate">
                  <p className="text-sm font-semibold text-slate-700 truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-slate-400">{file.size}</p>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 text-slate-400 hover:text-primary">
                <Download size={16} />
              </Button>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}
