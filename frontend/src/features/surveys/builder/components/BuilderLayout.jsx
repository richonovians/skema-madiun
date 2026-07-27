import React from 'react';
import BuilderToolbar from './BuilderToolbar';
import BuilderGlobalSidebar from './BuilderGlobalSidebar';
import BuilderSidebar from './BuilderSidebar';

export default function BuilderLayout({ children }) {
  return (
    <div className="fixed inset-0 left-64 z-50 flex flex-col bg-background overflow-hidden">
      <BuilderToolbar />
      <div className="flex flex-1 pt-[72px] h-full overflow-hidden">
        <BuilderSidebar />
        {children}
      </div>
    </div>
  );
}
