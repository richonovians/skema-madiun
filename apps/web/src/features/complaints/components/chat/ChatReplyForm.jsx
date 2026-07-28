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
            className="text-text-secondary hover:text-primary transition-colors p-2 shrink-0" 
            type="button"
          >
            <Paperclip size={24} />
          </IconButton>
          <Button 
            type="submit" 
            variant="primary"
            className="h-[52px] px-5 sm:px-6 rounded-xl font-bold flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            disabled={!reply.trim()}
          >
            Kirim Pesan
            <Send size={20} />
          </Button>
        </div>
        <p className="text-[11px] text-text-secondary italic pl-1">
          Pastikan informasi yang Anda berikan sopan dan jelas.
        </p>
      </form>
    </div>
  );
}
