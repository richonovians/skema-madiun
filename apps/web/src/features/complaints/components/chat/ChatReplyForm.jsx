'use client';

import React, { useState, useRef } from 'react';
import { Paperclip, Send, CheckCircle, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Textarea from '@/components/ui/Textarea';

export default function ChatReplyForm({ onSubmit }) {
  const [reply, setReply] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reply.trim() && onSubmit) {
      onSubmit(reply);
      setReply('');
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-surface border-t border-border">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {file && (
          <div className="p-2.5 mb-1 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-600 shrink-0">
                <CheckCircle size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-800 truncate">{file.name}</p>
                <p className="text-[10px] text-emerald-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={removeFile}
              className="text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-100 rounded-md transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex flex-row items-center gap-3 sm:gap-4">
          <div className="flex-grow">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="w-full p-3 md:p-4 border border-border rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none resize-none transition-all text-body-md"
              placeholder="Tulis tanggapan Anda di sini..."
              rows={1}
              style={{ minHeight: '52px' }}
            />
          </div>
          <IconButton 
            className="text-text-secondary hover:text-primary transition-colors p-2 shrink-0 relative" 
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange} 
            />
            <Paperclip size={24} />
          </IconButton>
          <Button 
            type="submit" 
            variant="primary"
            className="w-[52px] h-[52px] !p-0 sm:w-auto sm:!px-6 rounded-full sm:!rounded-xl font-bold flex items-center justify-center sm:gap-2 whitespace-nowrap shrink-0 transition-all"
            disabled={!reply.trim()}
          >
            <span className="hidden sm:inline">Kirim Pesan</span>
            <Send size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
}
