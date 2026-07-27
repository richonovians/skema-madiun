import React from 'react';
import ProfileHero from '@/features/profile/components/ProfileHero';
import ProfileBiodataCard from '@/features/profile/components/ProfileBiodataCard';
import ProfileAccountCard from '@/features/profile/components/ProfileAccountCard';
import ProfileSSOCard from '@/features/profile/components/ProfileSSOCard';


export const metadata = {
  title: 'Profil Saya - SKEMA Madiun',
  description: 'Informasi identitas akun yang terhubung melalui SSO Helpdesk Kabupaten Madiun.',
};

export default function ProfilePage() {
  return (
    <main className="max-w-[1280px] mx-auto py-8 px-6 space-y-8 w-full animate-in fade-in duration-300">
      {/* Page Title & Brief Description (Without Breadcrumb) */}
      <section className="space-y-1.5 border-b border-border/60 pb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
          Profil Saya
        </h1>
        <p className="text-text-secondary text-sm md:text-base leading-relaxed">
          Informasi identitas akun yang terhubung melalui SSO Helpdesk Kabupaten Madiun. Halaman ini bersifat read-only dan tidak menampilkan riwayat aktivitas pengaduan maupun survei.
        </p>
      </section>

      {/* Hero Banner Section */}
      <ProfileHero />

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Biodata & Account Metadata (7 cols on large screen) */}
        <div className="lg:col-span-7 space-y-8 w-full">
          <ProfileBiodataCard />
          <ProfileAccountCard />
        </div>

        {/* Right Column: SSO Connection Info & Action Button (5 cols on large screen) */}
        <div className="lg:col-span-5 space-y-8 w-full lg:sticky lg:top-24">
          <ProfileSSOCard />
        </div>
      </div>
    </main>
  );
}
