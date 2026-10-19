'use client';

import React, { useState } from 'react';
import ChatHeader from './chat/ChatHeader';
import ChatMessageList from './chat/ChatMessageList';
import ChatReplyForm from './chat/ChatReplyForm';

/**
 * @param {Function} [onSendReply] async (text, file?) => newMessage -- panggilan
 * API sungguhan (lihat app/(respondent)/complaints/[id]/page.jsx). Bila tak
 * disediakan, form balasan tetap tampil tapi tak melakukan apa pun (jangan
 * dibiarkan begini di produksi -- murni fallback aman).
 */
export default function ComplaintChatSection({
  initialMessages = [],
  participants = [],
  nomorTiket,
  judulPengaduan,
  onSendReply,
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState(null);

  const handleReplySubmit = async (replyText, file) => {
    setError(null);
    if (!onSendReply) return;
    try {
      const newMessage = await onSendReply(replyText, file);
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      setError(err.message || 'Gagal mengirim tanggapan');
      throw err; // ChatReplyForm perlu tahu gagal supaya tak menghapus teks yg diketik
    }
  };

  return (
    /* TINGGINYA MENGIKUTI JENDELA (22 September 2026, laporan pengguna).
       `min-h-[600px]` yang lama membuat panel ini terukur 809px di SEMUA lebar,
       termasuk ponsel setinggi 720px -- kolom balasannya karena itu selalu
       berada di bawah garis pandang. `svh` dipakai, bukan `vh`: di ponsel
       satuan `vh` mengabaikan bilah peramban yang muncul-hilang, sehingga
       panelnya melompat tinggi saat halaman digulir. */
    <section className="md:col-span-8 flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden h-[85svh] max-h-[750px] min-h-[420px]">
      <ChatHeader participants={participants} judulPengaduan={judulPengaduan} />
      <ChatMessageList messages={messages} />
      {error && <p className="px-4 sm:px-6 pb-2 text-error text-sm font-semibold">{error}</p>}
      <ChatReplyForm onSubmit={handleReplySubmit} nomorTiket={nomorTiket} />
    </section>
  );
}
