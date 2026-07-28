import React from 'react';
import Link from 'next/link';
import { Lightbulb, Info, ArrowRight, Cog } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function RecentComplaintWidget() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-text-primary">Pengaduan Terakhir</h2>
      <Card className="p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Cog size={120} />
        </div>
        <div className="flex-shrink-0 bg-primary-fixed-dim/20 p-4 sm:p-6 rounded-full">
          <Lightbulb className="text-primary" size={36} />
        </div>
        <div className="flex-grow space-y-2 relative z-10 w-full">
          <div className="flex items-center gap-4">
            <span className="text-primary font-bold text-sm tracking-wider">#CMP-2026-894</span>
            <Badge variant="secondary">Dalam Proses</Badge>
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-text-primary">Keluhan Lampu Jalan Mati</h3>
          <p className="text-text-secondary font-body flex items-center gap-2 text-sm sm:text-base">
            <Info size={18} className="text-primary shrink-0" />
            <span>Sedang ditindaklanjuti oleh Dinas Perhubungan</span>
          </p>
        </div>
        <div className="flex-shrink-0 relative z-10 w-full md:w-auto mt-2 md:mt-0">
          <Link href="#" className="text-primary font-bold inline-flex items-center min-h-[44px] gap-2 hover:gap-3 transition-all group">
            Lihat Detail
            <ArrowRight size={20} />
          </Link>
        </div>
      </Card>
    </section>
  );
}
