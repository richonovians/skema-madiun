'use client';

import React, { useState } from 'react';
import ChatHeader from './chat/ChatHeader';
import ChatMessageList from './chat/ChatMessageList';
import ChatReplyForm from './chat/ChatReplyForm';

/**
 * @param {Function} [onSendReply] async (text) => newMessage -- panggilan API
 * sungguhan (lihat app/(respondent)/complaints/[id]/page.jsx). Bila tak
 * disediakan, form balasan tetap tampil tapi tak melakukan apa pun (jangan
 * dibiarkan begini di produksi -- murni fallback aman).
 */
export default function ComplaintChatSection({ initialMessages = [], participants = [], onSendReply }) {
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState(null);

  const handleReplySubmit = async (replyText) => {
    setError(null);
    if (!onSendReply) return;
    try {
      const newMessage = await onSendReply(replyText);
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      setError(err.message || 'Gagal mengirim tanggapan');
      throw err; // ChatReplyForm perlu tahu gagal supaya tak menghapus teks yg diketik
    }
  };

  return (
    <section className="md:col-span-8 flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden min-h-[600px] md:max-h-[800px]">
      <ChatHeader participants={participants} />
      <ChatMessageList messages={messages} />
      {error && <p className="px-4 sm:px-6 pb-2 text-error text-sm font-semibold">{error}</p>}
      <ChatReplyForm onSubmit={handleReplySubmit} />
    </section>
  );
}
