import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
