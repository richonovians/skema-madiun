'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationDropdown({ className = '', hasIndicator = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 hover:bg-surface-container-low rounded-full transition-all flex items-center justify-center min-w-[44px] min-h-[44px] relative ${isOpen ? 'bg-surface-container-low text-primary' : 'text-outline'}`}
      >
        <Bell size={20} className={isOpen ? 'text-primary' : 'text-on-surface'} />
        {hasIndicator && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay for mobile to close when tapping outside the box but inside the overlay */}
          <div 
            className="fixed inset-0 z-40 sm:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute left-0 mt-3 w-[160px] sm:w-[200px] bg-white/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 origin-top-left transition-all duration-200">
            <div className="flex flex-col items-center justify-center p-4 sm:p-5 text-center">
              <div className="relative w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2.5">
                <div className="absolute inset-0 rounded-full border border-slate-300 animate-ping opacity-20"></div>
                <BellOff size={18} className="text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Pemberitahuan baru akan muncul di sini.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
