import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function IconButton({
  children,
  className,
  variant = 'ghost',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center transition-colors rounded-full focus:outline-none';
  
  const variants = {
    ghost: 'text-text-secondary hover:text-primary hover:bg-surface-variant',
    primary: 'bg-primary text-white hover:bg-primary-hover',
    outline: 'border border-border text-text-secondary hover:text-primary hover:bg-surface-variant',
  };

  return (
    <button
      className={twMerge(clsx(baseClasses, variants[variant], className))}
      {...props}
    >
      {children}
    </button>
  );
}
