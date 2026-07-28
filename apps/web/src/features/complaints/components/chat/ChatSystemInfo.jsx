import React from 'react';

export default function ChatSystemInfo({ message }) {
  return (
    <div className="flex justify-center">
      <span className="bg-surface border border-border px-md py-1 rounded-full text-[12px] text-text-secondary font-medium">
        {message}
      </span>
    </div>
  );
}
