'use client';

import React, { useState } from 'react';
import ChatHeader from './chat/ChatHeader';
import ChatMessageList from './chat/ChatMessageList';
import ChatReplyForm from './chat/ChatReplyForm';

export default function ComplaintChatSection({ initialMessages = [], participants = [] }) {
  const [messages, setMessages] = useState(initialMessages);

  const handleReplySubmit = (replyText) => {
    // Add dummy timestamp based on current time
    const now = new Date();
    const timestamp = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newMessage = {
      type: 'chat',
      role: 'user',
      text: replyText,
      timestamp,
      status: 'Terkirim'
    };

    setMessages([...messages, newMessage]);
  };

  return (
    <section className="md:col-span-8 flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden min-h-[600px] md:max-h-[800px]">
      <ChatHeader participants={participants} />
      <ChatMessageList messages={messages} />
      <ChatReplyForm onSubmit={handleReplySubmit} />
    </section>
  );
}
