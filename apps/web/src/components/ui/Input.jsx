import React from 'react';

export default function Input({ 
  label, 
  id, 
  className = '', 
  leftIcon,
  ...props 
}) {
  return (
    <div className={`space-y-xs ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={`w-full min-h-[44px] p-md border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md ${
            leftIcon ? 'pl-10' : ''
          }`}
          {...props}
        />
      </div>
    </div>
  );
}
