import React from 'react';

/** State loading konsisten -- pasangan EmptyState.jsx & ErrorState.jsx. */
export default function LoadingState({ label = 'Memuat...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-body-md font-body-md text-text-secondary">{label}</p>
    </div>
  );
}
