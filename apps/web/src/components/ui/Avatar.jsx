import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function Avatar({
  initials,
  src,
  alt = 'Avatar',
  size = 'md',
  className,
  variant = 'primary'
}) {
  const sizes = {
    sm: 'w-6 h-6 text-[8px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-12 h-12 text-sm',
  };

  const variants = {
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    outline: 'bg-surface text-text-secondary border border-border',
  };

  const baseClasses = 'rounded-full flex items-center justify-center font-bold overflow-hidden border-2 border-surface shrink-0';

  return (
    <div className={twMerge(clsx(baseClasses, sizes[size], variants[variant], className))}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
