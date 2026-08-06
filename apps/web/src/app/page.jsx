"use client";

import React, { useState } from 'react';
import Navbar from '@/components/layouts/Navbar';
import Footer from '@/components/layouts/Footer';
import HeroSection from '@/components/sections/HeroSection';
import ServiceSelector from '@/components/sections/ServiceSelector';
import HelpBox from '@/components/sections/HelpBox';
import ServiceFlow from '@/features/about/components/ServiceFlow';
import CreateComplaintForm from '@/features/complaints/components/CreateComplaintForm';
import SurveyForm from '@/features/surveys/components/SurveyForm';

/**
 * Tab "pengaduan" SEBELUMNYA pakai `ComplaintForm.jsx` -- prototipe dummy yang
 * TAK PERNAH memanggil API sama sekali (`console.log` + navigasi ke halaman
 * sukses seolah berhasil, OPD tujuan di-hardcode 19 entri lama yang tak
 * cocok lagi dgn data OPD nyata hasil sync Helpdesk). Bug ditemukan user
 * (2026-08-06): pengaduan lewat beranda "sukses" tapi tak pernah masuk DB.
 * Kini reuse `CreateComplaintForm` yang sama dgn /complaints/new (sudah
 * benar-benar tersambung ke `POST /complaints`) -- satu sumber kebenaran,
 * bukan dua form yang bisa diam-diam tak sinkron lagi. File dummy lama
 * (`ComplaintForm.jsx`) dihapus, sudah tak dipakai di mana pun.
 */
export default function Home() {
  const [activeTab, setActiveTab] = useState('pengaduan');

  return (
    <>
      <Navbar />
      
      <HeroSection />

      <main className="max-w-[1280px] mx-auto -mt-16 sm:-mt-24 md:-mt-32 relative z-30 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start px-4 sm:px-6 mb-16">
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
            <CreateComplaintForm />
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
