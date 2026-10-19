'use client';
import React from 'react';
import Link from 'next/link';
import {
  History,
  ChevronRight,
  ShieldAlert,
  Building2,
  HelpCircle,
  IdCard,
  GraduationCap,
  FileText
} from 'lucide-react';

/**
 * INT-24 (2026-08-05): dulu ikon per-domain fiktif (medical_services/park dkk,
 * dipasangkan dgn nama OPD karangan spt RSUD/DLH). Sumber data nyata (GET
 * /audit-logs) tak punya konsep OPD publisher per entri -- ikon di sini
 * kini per JENIS ENTITAS audit (complaint/opd/question/survey/user), lihat
 * recentActivities.adapter.js.
 */
const IconMapper = ({ iconName }) => {
  const iconMap = {
    report: <ShieldAlert size={24} />,
    foundation: <Building2 size={24} />,
    quiz: <HelpCircle size={24} />,
    school: <GraduationCap size={24} />,
    badge: <IdCard size={24} />
  };

  return iconMap[iconName] || <FileText size={24} />;
};

export default function RecentActivities({ data = [] }) {
  return (
    <section className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-lg border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-md">
          <History className="text-primary" size={24} />
          <h4 className="font-headline-md text-headline-md font-bold text-text-primary">
            Aktivitas Sistem Terbaru
          </h4>
        </div>
        <Link
          href="/admin-kab/audit-logs"
          className="bg-surface-container-low hover:bg-surface-container-high text-text-secondary text-xs font-bold px-md py-sm rounded-lg transition-all"
        >
          Arsip Lengkap
        </Link>
      </div>

      {/* `min-w-[500px]` dulu berlaku di semua ukuran, sehingga di Android
          360px seluruh kolom kanan baris ini -- cap waktu DAN tautan "Buka
          Detail" -- berada di luar layar. Tautan itu satu-satunya jalan ke
          detail aktivitas, dan tak ada apa pun yang memberi tahu pengguna
          bahwa daftarnya bisa digeser ke samping.
          Sekarang lebar minimum hanya berlaku dari `md` ke atas, dan barisnya
          diizinkan MEMBUNGKUS di ponsel (`flex-wrap`) sehingga kolom kanan
          turun ke bawah alih-alih terdorong keluar. */}
      <div className="w-full overflow-x-auto">
        <div className="divide-y divide-border min-w-0 md:min-w-[500px]">
        {data.map((item) => (
          <div key={item.id} className="p-lg hover:bg-background transition-colors flex flex-wrap gap-y-3 items-center justify-between group">
            <div className="flex min-w-0 items-center gap-lg">
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <IconMapper iconName={item.icon} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-text-primary" title={item.title}>
                  {item.title}
                </p>
                <p className="truncate text-sm text-text-secondary">
                  Oleh <span className="font-semibold text-text-primary">{item.publisher}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-surface-container border border-border text-[10px] font-bold px-sm py-xs rounded uppercase text-text-secondary">
                {item.timeLabel}
              </span>
              <div className="mt-xs flex items-center gap-xs justify-end text-primary text-xs font-bold">
                {/* Terukur 88x16 di ponsel; lihat catatan yang sama di
                    IkmLeaderboard. */}
                <Link
                  href={item.link}
                  className="flex items-center gap-xs min-h-[44px] hover:underline"
                >
                  <span>Buka Detail</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <div className="p-lg text-center text-text-secondary text-sm">
            Tidak ada aktivitas terbaru.
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
