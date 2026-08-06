import React from 'react';
import StarRating from '@/components/ui/StarRating';
import EmptyState from '@/components/ui/EmptyState';
import { MessageSquare } from 'lucide-react';

/**
 * D4 (2026-08-05): TIDAK menampilkan nama/identitas pengisi -- respons survei
 * anonim by design, backend (`GET /dashboard/opd`) sengaja tak mengirimkannya
 * sama sekali. SEBELUMNYA (dummy) menampilkan Avatar+nama responden per baris
 * -- dihapus total, bukan diganti placeholder.
 */
export default function RecentFeedback({ feedbacks }) {
  return (
    <div className="bg-surface p-lg rounded-xl shadow-sm border border-outline-variant flex flex-col h-full">
      <h3 className="font-headline-md text-headline-md text-primary mb-lg">Umpan Balik Terbaru</h3>

      {!feedbacks || feedbacks.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center">
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="Belum Ada Umpan Balik"
            description="Umpan balik dari responden akan muncul di sini."
          />
        </div>
      ) : (
        <div className="space-y-lg flex-1">
          {feedbacks.map((item, index) => (
            <div key={item.id || index} className="flex gap-md group">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary">
                <MessageSquare size={14} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-secondary">{item.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2">&quot;{item.comment}&quot;</p>
                {item.rating != null && (
                  <div className="mt-2">
                    <StarRating score={item.rating} max={4} size={12} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
