'use client';

import React, { useEffect, useRef } from 'react';
import ChatMessageBubble from './ChatMessageBubble';
import ChatSystemInfo from './ChatSystemInfo';

export default function ChatMessageList({ messages = [] }) {
  const listRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div 
      ref={listRef}
      className="flex-grow p-lg space-y-lg overflow-y-auto custom-scrollbar bg-slate-50/50"
    >
      {messages.map((msg, idx) => {
        if (msg.type === 'system') {
          return <ChatSystemInfo key={idx} message={msg.text} />;
        }
        
        return (
          <ChatMessageBubble
            key={idx}
            message={msg.text}
            attachments={msg.attachments}
            timestamp={msg.timestamp}
            senderRole={msg.role}
            senderName={msg.senderName}
            status={msg.status}
          />
        );
      })}
    </div>
  );
}
