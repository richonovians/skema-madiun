import React from 'react';
import Card from '@/components/ui/Card';
import ImageViewer from '@/components/ui/ImageViewer';

export default function ComplaintAttachments({ attachments = [] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <Card className="p-lg">
      <h3 className="font-h3 text-h3 mb-md text-text-primary">Lampiran Anda</h3>
      <div className="grid grid-cols-2 gap-sm">
        {attachments.map((attachment, idx) => (
          <ImageViewer 
            key={idx}
            src={attachment.url} 
            alt={attachment.alt || `Lampiran ${idx + 1}`} 
          />
        ))}
      </div>
    </Card>
  );
}
