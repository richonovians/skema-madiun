'use client';

import React, { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Textarea from '@/components/ui/Textarea';

export default function ChatReplyForm({ onSubmit }) {
  const [reply, setReply] = useState('');

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
        <div className="flex flex-row items-center gap-2 sm:gap-4">
          <div className="flex-grow relative">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="w-full py-3 pl-4 pr-10 md:p-4 border border-border rounded-2xl sm:rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none resize-none transition-all text-body-md leading-relaxed"
              placeholder="Tulis pesan..."
              rows={1}
              style={{ minHeight: '52px', maxHeight: '120px' }}
            />
            <IconButton 
              className="absolute right-2 bottom-[6px] text-text-secondary hover:text-primary transition-colors p-2 sm:hidden shrink-0" 
              type="button"
            >
              <Paperclip size={20} />
            </IconButton>
          </div>
          
          <IconButton 
            className="hidden sm:flex text-text-secondary hover:text-primary transition-colors p-2 shrink-0 self-center" 
            type="button"
          >
            <Paperclip size={24} />
          </IconButton>
          
          <Button 
            type="submit" 
            variant="primary"
            className="h-[52px] w-[52px] sm:w-auto !p-0 sm:!px-6 rounded-full sm:rounded-xl font-bold flex items-center justify-center sm:gap-2 whitespace-nowrap shrink-0 shadow-md"
            disabled={!reply.trim()}
          >
            <span className="hidden sm:inline">Kirim Pesan</span>
            <Send size={20} className="shrink-0 -ml-0.5 sm:ml-0" />
          </Button>
        </div>
        <p className="text-[11px] text-text-secondary italic pl-1">
          Pastikan informasi yang Anda berikan sopan dan jelas.
        </p>
      </form>
    </div>
  );
}
