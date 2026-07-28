import React from 'react';
import StarRating from '@/components/ui/StarRating';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { MessageSquare } from 'lucide-react';

export default function RecentFeedback({ feedbacks }) {
  return (
    <div className="bg-surface p-lg rounded-xl shadow-sm border border-outline-variant flex flex-col h-full">
      <h3 className="font-headline-md text-headline-md text-primary mb-lg">Umpan Balik Terbaru</h3>
      
      {!feedbacks || feedbacks.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center">
          <EmptyState 
            icon={MessageSquare}
            title="Belum Ada Umpan Balik"
            description="Umpan balik dari responden akan muncul di sini."
          />
        </div>
      ) : (
        <>
          <div className="space-y-lg flex-1">
            {feedbacks.map((item, index) => (
              <div key={item.id || index} className="flex gap-md group">
                <div className="flex-shrink-0">
                  <Avatar name={item.name} size="sm" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-on-surface">{item.name}</span>
                    <span className="text-[10px] text-secondary">{item.time}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2">&quot;{item.comment}&quot;</p>
                  <div className="mt-2">
                    <StarRating score={item.rating} size={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-lg w-full py-2 border border-primary text-primary text-xs font-bold rounded-lg hover:bg-primary-container transition-colors">
            Lihat Semua Feedback
          </button>
        </>
      )}
    </div>
  );
}
