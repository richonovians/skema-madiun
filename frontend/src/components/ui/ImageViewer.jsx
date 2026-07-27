'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';
import IconButton from './IconButton';

/**
 * ImageViewer displays an image thumbnail and opens it in a full-screen modal on click.
 */
export default function ImageViewer({ src, alt, className }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        className={twMerge(clsx(
          'aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 cursor-pointer transition-opacity group relative', 
          className
        ))}
        onClick={() => setIsOpen(true)}
      >
        <img className="w-full h-full object-cover" alt={alt} src={src} />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-8">
          <IconButton 
            className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/20 p-2"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </IconButton>
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
