'use client';

import React, { use } from 'react';
import ComplaintInfoCard from '@/features/complaints/components/ComplaintInfoCard';
import ComplaintProgressStepper from '@/features/complaints/components/ComplaintProgressStepper';
import ComplaintAttachments from '@/features/complaints/components/ComplaintAttachments';
import ComplaintChatSection from '@/features/complaints/components/ComplaintChatSection';

export default function ComplaintDetailPage({ params }) {
  // Unwrap params using React.use() for Next.js 15+ App Router
  const unwrappedParams = use(params);
  const ticketId = unwrappedParams?.id || 'CMP-2026-894';

  // Dummy Data
  const dummyComplaint = {
    ticketId: `#${ticketId}`,
    date: '19 Juli 2026',
    target: 'Dinas Kesehatan',
    status: 'diproses',
    attachments: [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDofvS3J3wNCVXf6mYqZJCN-Maj37JGMtKNEXJmwRA8zRR_6F1FCO5893k9dd9o71liAb3mJT0lpFsLVipGs18biaN1C6M2riIpNWqWvj98zT-Tr3MUWEN34bp05sgg-cszhYtjb9UsWS7HK0R8LfrO9IQjurVkbVh8rzvwSAzioQKvJZ1iW8wfr6HNciruKZWk_ExvXqIKq0rhLtS2EiTh3S6cqtuPrLTTv5P-XXAJx49cP9_TmH4zUw',
        alt: 'Bukti 1'
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlYA1_PsxbyUFwVw93YRWHZnB_5WekCYgdHt3yPM_pft6w7LmJKvj10Eyk5yhkOihi8u3_aFSWq-KsV7YYtZdB1Cl-2NDpu483KziV7JzF3qCWz-WcuY4tN1FfT6fLkDsnFGrOf7ybu-tRJvj5BWKy0VEteGY35vzm5qV_EfosLnrgMhUcsb0e1duEStDxbxtKiqvlnsRLBkscFiL5A5UriCLYZ1Bry45FHt6MugTwEe55Xn4b9wAGoA',
        alt: 'Bukti 2'
      }
    ],
    participants: [
      { initials: 'OPD', variant: 'primary' },
      { initials: 'AD', variant: 'secondary' }
    ],
    chatHistory: [
      {
        type: 'chat',
        role: 'user',
        text: 'Selamat pagi, antrean di Puskesmas X masih menumpuk hingga jalan raya. Mohon bantuannya untuk pengaturan lalu lintas dan penambahan loket.',
        timestamp: '08:30 WIB',
        status: 'Terkirim'
      },
      {
        type: 'chat',
        role: 'admin',
        senderName: 'ADMIN OPD',
        text: 'Halo Pak, terima kasih laporannya. Tim pengawas internal kami sedang menuju lokasi untuk mengurai kepadatan dan berkoordinasi dengan petugas keamanan setempat.',
        timestamp: '09:15 WIB'
      },
      {
        type: 'system',
        text: 'Petugas sedang menangani aduan Anda'
      }
    ]
  };

  return (
    <main className="max-w-container-max w-full mx-auto px-lg py-xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg h-full">
        {/* LEFT COLUMN (1/3) */}
        <aside className="md:col-span-4 space-y-lg">
          <ComplaintInfoCard 
            ticketId={dummyComplaint.ticketId}
            date={dummyComplaint.date}
            target={dummyComplaint.target}
            status={dummyComplaint.status}
          />
          <ComplaintProgressStepper 
            currentStatus={dummyComplaint.status}
          />
          <ComplaintAttachments 
            attachments={dummyComplaint.attachments}
          />
        </aside>

        {/* RIGHT COLUMN (2/3) */}
        <ComplaintChatSection 
          initialMessages={dummyComplaint.chatHistory}
          participants={dummyComplaint.participants}
        />
      </div>
    </main>
  );
}
