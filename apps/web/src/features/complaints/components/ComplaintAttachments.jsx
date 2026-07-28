import React from 'react';
import Card from '@/components/ui/Card';
import ImageViewer from '@/components/ui/ImageViewer';

export default function ComplaintAttachments({ attachments = [] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <Card className="p-5 sm:p-6 md:p-8">
      <h3 className="font-h3 text-h3 mb-4 text-text-primary">Lampiran Anda</h3>
      <div className="grid grid-cols-2 gap-3">
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
