'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ComplaintReporterProfile from '@/features/complaints/components/ComplaintReporterProfile';
import ComplaintStatusControl from '@/features/complaints/components/ComplaintStatusControl';
import ComplaintAttachments from '@/features/complaints/components/ComplaintAttachments';
import AdminResolutionWorkspace from '@/features/complaints/components/AdminResolutionWorkspace';
import { dummyComplaintDetail } from '@/features/complaints/constants/dummyComplaintDetail';

export default function AdminComplaintDetailPage({ params }) {
  // In a real app, you would fetch data using params.id
  // Here we use dummy data
  const data = dummyComplaintDetail;
  const [currentStatus, setCurrentStatus] = useState(data.status);
  const [chatHistory, setChatHistory] = useState(data.chatHistory);

  const handleStatusChange = (newStatus) => {
    setCurrentStatus(newStatus);
    console.log(`Status changed to ${newStatus}`);
    // In a real app, API call to update status
  };

  const handleSendUpdate = (text) => {
    const now = new Date();
    const timestamp = 'Hari ini, ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    setChatHistory([...chatHistory, {
      role: 'admin',
      text: text,
      timestamp: timestamp
    }]);
  };

  const handleCloseTicket = () => {
    setCurrentStatus('Selesai');
    handleSendUpdate('Tiket ini telah ditutup karena masalah sudah diselesaikan.');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Custom Page Header */}
      <div className="mb-lg mt-lg flex items-center gap-md">
        <Link 
          href="/admin-opd/complaints" 
          className="p-2 bg-surface text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-all border border-border"
        >
          <ArrowLeft size={20} />
        </Link>
        <h2 className="font-headline-md text-headline-md font-black text-on-surface tracking-tight">
          Detail Pengaduan #{data.id}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg container-max">
        {/* Left Pane (1/3 Width) */}
        <div className="lg:col-span-4 space-y-lg">
          <ComplaintReporterProfile reporter={data.reporter} />
          <ComplaintStatusControl 
            currentStatus={currentStatus} 
            onStatusChange={handleStatusChange} 
          />
          <ComplaintAttachments attachments={data.attachments} />
        </div>

        {/* Right Pane (2/3 Width) */}
        <div className="lg:col-span-8">
          <AdminResolutionWorkspace 
            chatHistory={chatHistory} 
            onSendUpdate={handleSendUpdate}
            onCloseTicket={handleCloseTicket}
          />
        </div>
      </div>
    </div>
  );
}
