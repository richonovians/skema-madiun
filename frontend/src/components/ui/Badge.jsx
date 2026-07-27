import React from 'react';

export default function Badge({ children, variant = 'default', className = '', ...props }) {
  const variants = {
    default: 'bg-surface-container-high text-on-surface-variant',
    primary: 'bg-primary-container text-on-primary-container',
    secondary: 'bg-secondary-container text-on-secondary-container',
    success: 'bg-green-100 text-green-800',
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-error-container text-on-error-container',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
