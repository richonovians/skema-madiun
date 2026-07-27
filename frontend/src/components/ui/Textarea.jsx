import React from 'react';

export default function Textarea({ 
  label, 
  id, 
  className = '', 
  ...props 
}) {
  return (
    <div className={`space-y-xs ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-text-primary">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className="w-full p-md border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary outline-none resize-none transition-all"
        {...props}
      />
    </div>
  );
}
