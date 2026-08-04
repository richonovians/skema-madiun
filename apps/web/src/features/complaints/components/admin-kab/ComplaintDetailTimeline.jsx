import React from 'react';
import { CheckCircle2, Clock, FileText, Send, Check } from 'lucide-react';

export default function ComplaintDetailTimeline({ complaint }) {
  
  const getIconForTitle = (title) => {
    if (title.toLowerCase().includes('dibuat')) return FileText;
    if (title.toLowerCase().includes('verifikasi')) return Check;
    if (title.toLowerCase().includes('diteruskan')) return Send;
    if (title.toLowerCase().includes('diproses')) return Clock;
    if (title.toLowerCase().includes('selesai')) return CheckCircle2;
    return Clock; // default
  };

  const getColorForTitle = (title, completed) => {
    if (!completed) return { bg: 'bg-slate-200', text: 'text-slate-500' };
    if (title.toLowerCase().includes('dibuat')) return { bg: 'bg-blue-500', text: 'text-blue-500' };
    if (title.toLowerCase().includes('verifikasi')) return { bg: 'bg-indigo-500', text: 'text-indigo-500' };
    if (title.toLowerCase().includes('diteruskan')) return { bg: 'bg-purple-500', text: 'text-purple-500' };
    if (title.toLowerCase().includes('diproses')) return { bg: 'bg-amber-500', text: 'text-amber-500' };
    if (title.toLowerCase().includes('selesai')) return { bg: 'bg-emerald-500', text: 'text-emerald-500' };
    return { bg: 'bg-blue-500', text: 'text-blue-500' };
  };

  const timelineEvents = complaint.timeline || [];

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
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50">
        <h3 className="text-title-md font-bold text-slate-800">
          Timeline Penyelesaian
        </h3>
      </div>
      
      <div className="p-lg">
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
          {timelineEvents.map((event, index) => {
            const Icon = getIconForTitle(event.title);
            const color = getColorForTitle(event.title, event.completed);
            
            // Determine active step (last completed step)
            const isActive = event.completed && (index === timelineEvents.length - 1 || !timelineEvents[index + 1]?.completed);
            
            return (
              <div key={event.id} className="relative pl-8">
                {/* Timeline dot/icon */}
                <div 
                  className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                    color.bg
                  } ${isActive ? 'ring-4 ring-blue-100' : ''}`}
                >
                  <Icon size={14} className={event.completed ? "text-white" : "text-slate-400"} />
                </div>
                
                {/* Content */}
                <div className={`flex flex-col ${!event.completed && 'opacity-50'}`}>
                  <h4 className={`text-label-lg font-bold ${event.completed ? color.text : 'text-slate-500'}`}>
                    {event.title}
                  </h4>
                  {event.date && (
                    <span className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                      <Clock size={12} />
                      {formatDate(event.date)}
                    </span>
                  )}
                  {!event.date && !event.completed && (
                    <span className="text-xs font-medium text-slate-400 mt-1">
                      Menunggu tahap sebelumnya
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
