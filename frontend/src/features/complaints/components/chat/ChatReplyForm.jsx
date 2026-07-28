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
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
        <div className="flex-grow relative">
          <Textarea 
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="w-full !border-border rounded-xl focus:ring-primary focus:border-primary px-md py-md pr-12 min-h-[56px] max-h-32 text-body-md resize-none" 
            placeholder="Tulis tanggapan Anda di sini..."
            rows={1}
            // we override some padding and styling for custom chat input look if needed
          />
          <IconButton 
            className="absolute right-3 bottom-3 text-text-secondary hover:text-primary transition-colors p-1" 
            type="button"
          >
            <Paperclip size={20} />
          </IconButton>
        </div>
        <Button 
          type="submit" 
          variant="primary"
          className="h-[56px] px-6 rounded-xl font-bold flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto min-h-[48px]"
          disabled={!reply.trim()}
        >
          Kirim Tanggapan
          <Send size={20} />
        </Button>
      </form>
      <p className="mt-sm text-[11px] text-text-secondary italic">
        Pastikan informasi yang Anda berikan sopan dan jelas.
      </p>
    </div>
  );
}
