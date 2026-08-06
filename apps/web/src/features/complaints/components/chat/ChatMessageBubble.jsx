import React from 'react';
import clsx from 'clsx';
import { BadgeCheck, FileText } from 'lucide-react';
import ImageViewer from '@/components/ui/ImageViewer';

export default function ChatMessageBubble({
  message,
  attachments = [],
  timestamp,
  senderRole = 'user', // 'user' or 'admin'
  senderName = 'ADMIN OPD',
  status = 'Terkirim'
}) {
  const isUser = senderRole === 'user';
  const images = attachments.filter((a) => a.mimeType?.startsWith('image/'));
  const documents = attachments.filter((a) => !a.mimeType?.startsWith('image/'));

  return (
    <div className={clsx("flex flex-col", isUser ? "items-end" : "items-start")}>
      
      {/* Admin Name & Badge */}
      {!isUser && (
        <div className="flex items-center gap-xs mb-1">
          <span className="text-label-md font-bold text-primary">{senderName}</span>
          <BadgeCheck className="text-primary" size={14} />
        </div>
      )}

      {/* Bubble */}
      <div 
        className={clsx(
          "max-w-[80%] p-md shadow-sm",
          isUser 
            ? "bg-primary-container text-white rounded-2xl rounded-tr-none" 
            : "bg-surface-variant text-text-primary rounded-2xl rounded-tl-none border border-border"
        )}
      >
        {message && <p className="font-body text-body-md whitespace-pre-wrap">{message}</p>}

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2 max-w-[220px]">
            {images.map((img) => (
              <ImageViewer key={img.id} src={img.url} alt={img.alt} className="aspect-square" />
            ))}
          </div>
        )}

        {documents.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "flex items-center gap-2 text-xs font-semibold underline underline-offset-2",
                  isUser ? "text-white" : "text-primary",
                )}
              >
                <FileText size={14} className="flex-shrink-0" />
                <span className="truncate">{doc.alt}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp & Status */}
      <span className={clsx(
        "text-[11px] text-text-secondary mt-1", 
        isUser ? "mr-1" : "ml-1"
      )}>
        {timestamp} {isUser && `• ${status}`}
      </span>
    </div>
  );
}
