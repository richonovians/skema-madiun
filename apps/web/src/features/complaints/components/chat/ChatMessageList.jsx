'use client';

import React, { useEffect, useRef } from 'react';
import ChatMessageBubble from './ChatMessageBubble';
import ChatSystemInfo from './ChatSystemInfo';
import ChatDateSeparator from './ChatDateSeparator';
import { kelompokkanPesanPerTanggal } from '@/features/complaints/adapters/pemisahTanggalChat';

export default function ChatMessageList({ messages = [] }) {
  const listRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Dikelompokkan DI SINI, bukan di dalam `messages` yang masuk. Larik yang
  // sama diteruskan ke ComplaintExportMenu untuk menyusun baris PDF & Excel;
  // menyisipkan pemisah ke dalamnya akan membuat tiap ekspor tiket memuat
  // baris hantu berbunyi "Kemarin" di tengah percakapan.
  const kelompok = kelompokkanPesanPerTanggal(messages);

  return (
    <div
      ref={listRef}
      className="flex-grow p-lg space-y-lg overflow-y-auto custom-scrollbar bg-slate-50/50"
    >
      {kelompok.map((grup) => (
        <div key={grup.kunci} className="space-y-lg">
          <ChatDateSeparator label={grup.label} />

          {grup.items.map((msg, idx) => {
            if (msg.type === 'system') {
              return <ChatSystemInfo key={`${grup.kunci}-${idx}`} message={msg.text} />;
            }

            return (
              <ChatMessageBubble
                key={`${grup.kunci}-${idx}`}
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
      ))}
    </div>
  );
}
