import React from 'react';

export default function BuilderLayout({ children }) {
  return (
    <div className="bg-background font-body text-text-primary overflow-hidden min-h-screen">
      {children}
    </div>
  );
}
