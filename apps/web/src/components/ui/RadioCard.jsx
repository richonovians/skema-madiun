import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function RadioCard({
  name,
  value,
  label,
  checked,
  onChange,
  numberIcon, // Optional: e.g., '1', '2', '3', '4'
}) {
  return (
    <label className="group cursor-pointer">
      <input 
        type="radio" 
        name={name} 
        value={value} 
        checked={checked}
        onChange={onChange}
        className="hidden peer" 
      />
      
      <div 
        className={twMerge(
          "flex items-center min-h-[64px] px-6 py-4 rounded-lg border-2 transition-all shadow-sm",
          // Default unselected state
          "border-outline-variant/50 text-text-secondary bg-surface",
          // Hover state for unselected
          "group-hover:border-primary/30 group-hover:bg-surface-container-low",
          // Checked state (using peer-checked)
          "peer-checked:border-primary peer-checked:bg-blue-50 peer-checked:text-primary"
        )}
      >
        {numberIcon && (
          <span className="w-8 h-8 flex shrink-0 items-center justify-center rounded-full border-2 border-current mr-4 font-bold">
            {numberIcon}
          </span>
        )}
        <span className="font-medium">{label}</span>
      </div>
    </label>
  );
}
