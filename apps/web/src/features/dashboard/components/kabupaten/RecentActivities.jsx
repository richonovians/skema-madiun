'use client';
import React from 'react';
import Link from 'next/link';
import { 
  History, 
  ChevronRight, 
  Stethoscope, 
  Building2, 
  GraduationCap, 
  IdCard, 
  TreePine,
  FileText
} from 'lucide-react';

// Mapper to map API string icons to Lucide components
const IconMapper = ({ iconName }) => {
  const iconMap = {
    'medical_services': <Stethoscope size={24} />,
    'foundation': <Building2 size={24} />,
    'school': <GraduationCap size={24} />,
    'badge': <IdCard size={24} />,
    'park': <TreePine size={24} />
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
            Aktivitas Publikasi Terbaru
          </h4>
        </div>
        <button className="bg-surface-container-low hover:bg-surface-container-high text-text-secondary text-xs font-bold px-md py-sm rounded-lg transition-all">
          Arsip Lengkap
        </button>
      </div>

      <div className="divide-y divide-border">
        {data.map((item) => (
          <div key={item.id} className="p-lg hover:bg-background transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-lg">
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <IconMapper iconName={item.icon} />
              </div>
              <div>
                <p className="font-bold text-text-primary">{item.title}</p>
                <p className="text-sm text-text-secondary">
                  Diterbitkan oleh <span className="font-semibold text-text-primary">{item.publisher}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="bg-surface-container border border-border text-[10px] font-bold px-sm py-xs rounded uppercase text-text-secondary">
                {item.timeLabel}
              </span>
              <div className="mt-xs flex items-center gap-xs justify-end text-primary text-xs font-bold">
                <Link href={item.link} className="flex items-center gap-xs hover:underline">
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
    </section>
  );
}
