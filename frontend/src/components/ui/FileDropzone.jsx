'use client';

import React, { useRef } from 'react';
import { Paperclip, FileText, X } from 'lucide-react';

export default function FileDropzone({ 
  files = [], 
  onFilesChange, 
  maxSizeMB = 5, 
  accept = "image/*,.pdf" 
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (onFilesChange) onFilesChange([...files, ...selectedFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (onFilesChange) onFilesChange([...files, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (indexToRemove) => {
    if (onFilesChange) {
      onFilesChange(files.filter((_, idx) => idx !== indexToRemove));
    }
  };

  return (
    <div className="space-y-4">
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface-container hover:border-primary transition-colors cursor-pointer group"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept={accept} 
          onChange={handleFileSelect}
        />
        <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Paperclip className="text-primary w-8 h-8" />
        </div>
        <p className="font-semibold text-lg text-text-primary mb-1 text-center">
          Klik atau seret berkas untuk melampirkan foto bukti
        </p>
        <p className="text-sm font-medium text-text-secondary text-center">
          Maksimal ukuran file {maxSizeMB}MB per file. Format: JPG, PNG, PDF.
        </p>
      </div>

      {files.length > 0 && (
        <div className="w-full max-w-md space-y-2 mt-4">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-border shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="text-primary w-5 h-5 flex-shrink-0" />
                <span className="text-base truncate max-w-[200px]">{file.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button 
                  type="button" 
                  onClick={() => removeFile(idx)}
                  className="text-error hover:bg-error-container p-1 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
