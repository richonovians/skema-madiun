'use client';

import React, { useRef } from 'react';
import { Paperclip, CheckCircle, X } from 'lucide-react';

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
        <div className="w-full space-y-2 mt-4">
          {files.map((file, idx) => (
            <div key={idx} className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-emerald-100 p-2 rounded-md text-emerald-600 shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-800">File berhasil diunggah</p>
                  <p className="text-xs text-emerald-600 truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => removeFile(idx)}
                className="text-emerald-600 hover:text-emerald-800 p-1.5 hover:bg-emerald-100 rounded-md transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
