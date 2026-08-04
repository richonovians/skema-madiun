import React from 'react';
import { MessageSquare, User } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

export default function ComplaintResponseHistory({ complaint }) {
  const responses = complaint.responseHistory || [];

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <MessageSquare size={18} className="text-slate-500" />
        <h3 className="text-title-md font-bold text-slate-800">
          Riwayat Komunikasi
        </h3>
      </div>
      
      <div className="p-lg space-y-6 max-h-[500px] overflow-y-auto">
        {responses.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
            <p>Belum ada riwayat komunikasi untuk tiket ini.</p>
          </div>
        ) : (
          responses.map((msg, index) => {
            const isOPD = msg.role === 'Admin OPD';
            return (
              <div key={msg.id || index} className={`flex gap-4 ${isOPD ? 'flex-row-reverse' : ''}`}>
                <div className="shrink-0">
                  {isOPD ? (
                    <Avatar name={msg.sender} className="bg-blue-100 text-blue-700" size="md" />
                  ) : (
                    <Avatar name={msg.sender} className="bg-slate-200 text-slate-700" size="md" />
                  )}
                </div>
                
                <div className={`flex flex-col max-w-[80%] ${isOPD ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-700">{msg.sender}</span>
                    <span className="text-xs text-slate-400">{formatDate(msg.timestamp)}</span>
                  </div>
                  
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isOPD 
                      ? 'bg-blue-50 text-blue-900 rounded-tr-none border border-blue-100' 
                      : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Read-only notice */}
      <div className="bg-slate-50 p-sm text-center border-t border-slate-200">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <User size={14} /> Mode pengawasan eksekutif (Read-Only)
        </p>
      </div>
    </div>
  );
}
