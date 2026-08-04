import React from 'react';
import ProfileContent from '@/features/profile/components/ProfileContent';

export const metadata = {
  title: 'Profil Saya - SKEMA Madiun',
  description: 'Informasi identitas akun yang terhubung melalui SSO Helpdesk Kabupaten Madiun.',
};

export default function ProfilePage() {
  return (
    <main className="max-w-[1280px] mx-auto py-8 px-4 sm:px-6 space-y-6 sm:space-y-8 w-full animate-in fade-in duration-300">
      {/* Page Title & Brief Description (Without Breadcrumb) */}
      <section className="space-y-1.5 border-b border-border/60 pb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
          Profil Saya
        </h1>
        <p className="text-text-secondary text-sm md:text-base leading-relaxed">
          Informasi identitas akun yang terhubung melalui SSO Helpdesk Kabupaten Madiun. Halaman ini bersifat read-only dan tidak menampilkan riwayat aktivitas pengaduan maupun survei.
        </p>
      </section>

      <ProfileContent />
    </main>
  );
}
