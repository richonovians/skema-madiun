import React from 'react';
import DashboardNavbar from '@/components/layouts/DashboardNavbar';
import DashboardFooter from '@/components/layouts/DashboardFooter';

export default function RespondentLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardNavbar />
      <div className="flex-grow">
        {children}
      </div>
      <DashboardFooter />
    </div>
  );
}
