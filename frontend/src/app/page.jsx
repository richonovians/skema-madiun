"use client";

import React, { useState } from 'react';
import Navbar from '@/components/layouts/Navbar';
import Footer from '@/components/layouts/Footer';
import HeroSection from '@/components/sections/HeroSection';
import ServiceSelector from '@/components/sections/ServiceSelector';
import HelpBox from '@/components/sections/HelpBox';
import ServiceFlow from '@/features/about/components/ServiceFlow';
import ComplaintForm from '@/features/complaints/components/ComplaintForm';
import SurveyForm from '@/features/surveys/components/SurveyForm';

export default function Home() {
  const [activeTab, setActiveTab] = useState('pengaduan');

  return (
    <>
      <Navbar />
      
      <HeroSection />

      <main className="max-w-[1280px] mx-auto -mt-32 relative z-30 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-6 mb-16">
        <aside className="lg:col-span-4 flex flex-col gap-4">
          <ServiceSelector 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          <HelpBox />
        </aside>

        {/* Feature content conditionally rendered based on selected service tab */}
        <div className="lg:col-span-8 w-full">
          {activeTab === 'pengaduan' ? (
            <ComplaintForm />
          ) : (
            <SurveyForm />
          )}
        </div>
      </main>

      <ServiceFlow />

      <Footer />
    </>
  );
}
