import React from 'react';
import Avatar from '@/components/ui/Avatar';
import AvatarGroup from '@/components/ui/AvatarGroup';

export default function ChatHeader({ title = 'Riwayat Interaksi', subtitle = 'Diskusi aktif dengan petugas lapangan', participants = [] }) {
  return (
    <div className="p-4 sm:p-6 border-b border-border bg-surface-container-low flex items-center justify-between">
      <div>
        <h2 className="font-headline-md text-headline-md text-text-primary">{title}</h2>
        <p className="text-text-secondary text-label-md">{subtitle}</p>
      </div>
      
      {participants.length > 0 && (
        <AvatarGroup>
          {participants.map((p, idx) => (
            <Avatar 
              key={idx} 
              initials={p.initials} 
              variant={p.variant || 'primary'} 
            />
          ))}
        </AvatarGroup>
      )}
    </div>
  );
}
