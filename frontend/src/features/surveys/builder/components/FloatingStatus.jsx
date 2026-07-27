import React from 'react';

export default function FloatingStatus({ questionCount }) {
  return (
    <div className="fixed bottom-lg right-lg bg-surface border border-border rounded-full shadow-xl px-lg py-sm flex items-center gap-md" style={{ animation: 'bounce-subtle 4s ease-in-out infinite' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
        }
      `}} />
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        <span className="text-xs font-bold text-text-secondary">Autosave Aktif</span>
      </div>
      <div className="h-4 w-px bg-border"></div>
      <div className="text-xs font-medium text-text-primary">
        <span className="text-primary font-bold">{questionCount}</span> Total Pertanyaan
      </div>
    </div>
  );
}
