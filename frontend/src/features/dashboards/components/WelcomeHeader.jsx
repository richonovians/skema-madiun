import React from 'react';
import { ShieldCheck, CalendarDays, BadgeCheck } from 'lucide-react';
import { DUMMY_CURRENT_USER } from '@/features/profile/constants/dummyCurrentUser';

export default function WelcomeHeader() {
  const user = DUMMY_CURRENT_USER;
  
  // Format tanggal saat ini (tanpa date-fns)
  const currentDate = new Intl.DateTimeFormat('id-ID', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date('2026-07-24')); // Menggunakan tanggal dummy yang sama

  return (
    <section className="bg-primary-container/20 border border-primary/10 rounded-3xl p-8 md:p-10 mb-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        {/* Avatar Section */}
        <div className="shrink-0 relative">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-md border-4 border-white">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-full h-full object-cover" alt={user.name} />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-3xl font-bold text-white">
                {user.initials}
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-sm border border-slate-100" title="Akun Terverifikasi SSO">
            <BadgeCheck size={24} className="text-primary" />
          </div>
        </div>
        
        {/* Greeting Section */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Selamat datang kembali, <span className="text-primary">{user.name.split(' ')[0]}</span>!
          </h1>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-5">
            <div className="flex items-center gap-2 text-text-secondary bg-surface px-4 py-2 rounded-full border border-border/60 shadow-sm">
              <CalendarDays size={18} className="text-primary" />
              <span className="text-sm font-medium">{currentDate}</span>
            </div>
            
            <div className="flex items-center gap-2 text-text-secondary bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Identitas Terproteksi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
