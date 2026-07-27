import React from 'react';
import Navbar from '@/components/layouts/Navbar';
import Footer from '@/components/layouts/Footer';
import AboutHero from '@/features/about/components/AboutHero';
import AboutPlatform from '@/features/about/components/AboutPlatform';
import VisionMission from '@/features/about/components/VisionMission';
import CoreValues from '@/features/about/components/CoreValues';
import AboutStatistics from '@/features/about/components/AboutStatistics';
import FeatureHighlights from '@/features/about/components/FeatureHighlights';
import CommitmentSection from '@/features/about/components/CommitmentSection';
import FAQSection from '@/features/about/components/FAQSection';

export const metadata = {
  title: 'Tentang Kami | SKEMA Madiun',
  description: 'Pelajari lebih lanjut tentang SKEMA Madiun (Sistem Keluhan, Evaluasi, dan Manajemen Aspirasi) Kabupaten Madiun.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <AboutHero />
        <AboutPlatform />
        <AboutStatistics />
        <VisionMission />
        <CoreValues />
        <FeatureHighlights />
        <CommitmentSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
