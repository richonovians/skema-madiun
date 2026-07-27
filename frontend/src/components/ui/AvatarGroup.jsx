import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function AvatarGroup({ children, className }) {
  return (
    <div className={twMerge(clsx('flex -space-x-2', className))}>
      {children}
    </div>
  );
}
