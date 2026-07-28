import React from 'react';

export default function ProgressBar({ progress }) {
  // Ensure progress is strictly between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden">
      <div 
        className="bg-primary h-full transition-all duration-700 ease-out" 
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}
