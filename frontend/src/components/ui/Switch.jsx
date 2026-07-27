import React from 'react';

export default function Switch({ checked, onChange, className = '', ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
        ${checked ? 'bg-emerald-500' : 'bg-outline-variant'}
        ${className}
      `}
      {...props}
    >
      <span
        className={`
          absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200
          ${checked ? 'right-1' : 'left-1'}
        `}
      />
    </button>
  );
}
