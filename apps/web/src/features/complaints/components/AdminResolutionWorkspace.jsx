'use client';
import React, { useState, useEffect, useRef } from 'react';
import { User, Headset, Paperclip, CheckCircle, X } from 'lucide-react';

export default function AdminResolutionWorkspace({ chatHistory = [], onSendUpdate, onCloseTicket }) {
  const [replyText, setReplyText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (replyText.trim() || attachedFile) {
      onSendUpdate(replyText);
      setReplyText('');
      removeFile();
    }
  };

  return (
    <div className="bg-surface rounded-xl shadow-2xl border border-border flex flex-col h-[750px]">
      
      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 p-lg overflow-y-auto space-y-lg scrollbar-hide bg-slate-50/50">
        {chatHistory.map((msg, idx) => (
          msg.role === 'admin' ? (
            <div key={idx} className="flex items-start gap-md max-w-[85%] ml-auto flex-row-reverse">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
                <Headset size={20} className="text-white" />
              </div>
              <div className="space-y-xs text-right">
                <div className="bg-primary-container text-on-primary-container p-md rounded-2xl rounded-tr-none shadow-sm text-left">
                  <p className="font-body-md text-body-md leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[11px] text-text-secondary pr-1">{msg.timestamp}</span>
              </div>
            </div>
          ) : (
            <div key={idx} className="flex items-start gap-md max-w-[85%]">
              <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center flex-shrink-0 border border-outline-variant">
                <User size={20} className="text-on-surface-variant" />
              </div>
              <div className="space-y-xs">
                <div className="bg-white border border-border p-md rounded-2xl rounded-tl-none shadow-sm">
                  <p className="font-body-md text-body-md text-text-primary leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[11px] text-text-secondary pl-1">{msg.timestamp}</span>
              </div>
            </div>
          )
        ))}

        <div className="flex items-center gap-md py-md">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[3px]">Ruang Solusi Aktif</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>
      </div>

      {/* Response Editor */}
      <div className="p-lg border-t border-border bg-white rounded-b-xl">
        {/* File Attachment Preview */}
        {attachedFile && (
          <div className="mb-3">
            <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-2 sm:pr-4 rounded-lg">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                <Paperclip size={18} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-emerald-800 truncate max-w-[200px]">{attachedFile.name}</span>
                <span className="text-xs text-emerald-600">{(attachedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button 
                type="button"
                onClick={removeFile}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-200 text-emerald-600 transition-colors ml-2 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="relative mb-lg">
          <textarea 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full min-h-[160px] p-lg border border-outline-variant rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none font-body-md text-body-md" 
            placeholder="Tulis jawaban solusi atau update status di sini..."
          />
          <div className="absolute bottom-md left-md flex items-center gap-sm">
            <label className="p-sm text-on-surface-variant hover:bg-surface-variant/50 rounded-lg transition-colors flex items-center gap-xs cursor-pointer">
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Paperclip size={20} />
              <span className="text-label-md hidden sm:inline">Lampirkan Dokumen/Foto</span>
            </label>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-md">
          <button 
            onClick={handleSend}
            className="w-full sm:w-auto px-lg py-3 rounded-lg border border-outline text-text-primary font-bold hover:bg-surface-variant/20 transition-all active:scale-95"
          >
            Kirim pesan
          </button>
          <button 
            onClick={onCloseTicket}
            className="w-full sm:w-auto px-lg py-3 rounded-lg bg-green-600 text-white font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-sm"
          >
            <CheckCircle size={20} />
            Simpan & Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
