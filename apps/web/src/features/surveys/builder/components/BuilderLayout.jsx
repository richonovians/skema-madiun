import React from 'react';
import BuilderToolbar from './BuilderToolbar';
import BuilderGlobalSidebar from './BuilderGlobalSidebar';
import BuilderSidebar from './BuilderSidebar';

export default function BuilderLayout({ children, onAddBaku, onAddCustom }) {
  return (
    <div className="fixed inset-0 md:left-64 z-50 flex flex-col bg-background overflow-hidden">
      <BuilderToolbar />
      <div className="flex flex-col md:flex-row flex-1 pt-16 md:pt-[72px] h-full overflow-hidden">
        <BuilderSidebar onAddBaku={onAddBaku} onAddCustom={onAddCustom} />
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
