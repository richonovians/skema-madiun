import React from 'react';
import { cn } from '@/utils/cn';

export default function AvatarGroup({ children, className }) {
  return (
    <div className={cn('flex -space-x-2', className)}>
      {children}
    </div>
  );
}
