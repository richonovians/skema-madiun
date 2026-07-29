import React from 'react';
import DashboardNavbar from '@/components/layouts/DashboardNavbar';
import Footer from '@/components/layouts/Footer';

export default function RespondentLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardNavbar />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
}
