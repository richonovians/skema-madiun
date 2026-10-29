import React from 'react';
import { twMerge } from 'tailwind-merge';

export default function RadioCard({
  name,
  value,
  label,
  checked,
  onChange,
  numberIcon, // Optional: e.g., '1', '2', '3', '4'
  icon,       // Optional: ReactNode (e.g. Frown, Meh, Smile, Laugh)
}) {
  return (
    <label className="group cursor-pointer block">
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
          "flex items-center min-h-[44px] px-4 py-2.5 rounded-xl border transition-all shadow-xs",
          // Default unselected state
          "border-outline-variant/40 text-text-secondary bg-surface",
          // Hover state for unselected
          "group-hover:border-primary/40 group-hover:bg-surface-container-low group-hover:shadow-sm",
          // Checked state (using peer-checked)
          "peer-checked:border-primary peer-checked:bg-blue-50/70 peer-checked:text-primary peer-checked:shadow-sm"
        )}
      >
        {icon ? (
          <span className="w-6 h-6 flex shrink-0 items-center justify-center mr-3">
            {icon}
          </span>
        ) : numberIcon ? (
          React.isValidElement(numberIcon) ? (
            <span className="w-6 h-6 flex shrink-0 items-center justify-center mr-3">
              {numberIcon}
            </span>
          ) : (
            <span className="w-5 h-5 flex shrink-0 items-center justify-center rounded-full border border-current mr-3 font-bold text-xs">
              {numberIcon}
            </span>
          )
        ) : null}
        <span className="font-medium text-sm text-text-primary group-hover:text-primary transition-colors leading-snug">{label}</span>
      </div>
    </label>
  );
}
