'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function Dropdown({ 
  label,
  id,
  options = [], 
  value, 
  onChange, 
  variant = 'default',
  className = '',
  error
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Menutup dropdown jika user mengklik area luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const getVariantStyles = () => {
    if (error) {
      return {
        button: "bg-red-50 border border-red-300 text-red-700 hover:bg-red-100",
        icon: "text-red-500 group-hover:text-red-700",
      };
    }
    if (variant === 'primary') {
      return {
        button: "bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100",
        icon: "text-blue-500 group-hover:text-blue-700",
      };
    }
    return {
      button: "bg-surface border border-border text-text-primary hover:bg-surface-container",
      icon: "text-text-secondary group-hover:text-primary",
    };
  };

  const styles = getVariantStyles();

  return (
    <div className={`relative group space-y-1 ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className={`block text-sm font-bold ${error ? 'text-red-600' : 'text-text-primary'}`}>
          {label}
        </label>
      )}
      <button 
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 min-w-[140px] min-h-[44px] p-md rounded-lg font-medium text-body-md transition-all focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-primary'} shadow-sm ${styles.button}`}
      >
        <span className="truncate">{selectedOption?.label || 'Pilih...'}</span>
        <ChevronDown 
          size={20} 
          className={`flex-shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180' : ''} ${styles.icon}`} 
        />
      </button>

      {error && (
        <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {error}
        </p>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <ul className="py-1 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                    ${option.value === value 
                      ? 'bg-blue-50/50 text-blue-700 font-bold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Check size={14} className="text-blue-600 flex-shrink-0 ml-2" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
