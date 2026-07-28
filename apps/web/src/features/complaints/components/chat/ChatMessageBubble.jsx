import React from 'react';
import clsx from 'clsx';
import { BadgeCheck } from 'lucide-react';

export default function ChatMessageBubble({ 
  message, 
  timestamp, 
  senderRole = 'user', // 'user' or 'admin'
  senderName = 'ADMIN OPD',
  status = 'Terkirim'
}) {
  const isUser = senderRole === 'user';

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
        <p className="font-body text-body-md whitespace-pre-wrap">{message}</p>
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
