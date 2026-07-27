import React from 'react';

export default function Select({ 
  label, 
  id, 
  options = [], 
  placeholder,
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
      <select
        id={id}
        className="w-full p-md border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
        {...props}
      >
        {placeholder && (
          <option disabled value="">
            {placeholder}
          </option>
        )}
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
    </div>
  );
}
