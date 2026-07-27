import React from 'react';
import { CloudUpload } from 'lucide-react';

export default function FileUpload({ 
  label, 
  id,
  helperText = "Maksimal 5MB (JPG, PNG, PDF)",
  className = '', 
  ...props 
}) {
  return (
    <div className={`space-y-xs ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-text-primary">
          {label}
        </label>
      )}
      <label 
        htmlFor={id}
        className="border-2 border-dashed border-outline-variant rounded-lg p-xl flex flex-col items-center justify-center bg-background/50 hover:bg-surface-container-low transition-colors cursor-pointer group"
      >
        <CloudUpload className="w-10 h-10 text-outline mb-sm group-hover:text-primary transition-colors" />
        <span className="text-sm font-medium text-text-secondary">
          Tarik berkas atau klik untuk mengunggah
        </span>
        <span className="text-xs text-outline mt-xs">
          {helperText}
        </span>
        <input
          id={id}
          type="file"
          className="hidden"
          {...props}
        />
      </label>
    </div>
  );
}
