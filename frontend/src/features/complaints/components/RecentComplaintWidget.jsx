import React from 'react';
import Link from 'next/link';
import { Lightbulb, Info, ArrowRight, Cog } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function RecentComplaintWidget() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-text-primary">Pengaduan Terakhir</h2>
      <Card className="p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Cog size={120} />
        </div>
        <div className="flex-shrink-0 bg-primary-fixed-dim/20 p-6 rounded-full">
          <Lightbulb className="text-primary" size={36} />
        </div>
        <div className="flex-grow space-y-2 relative z-10">
          <div className="flex items-center gap-4">
            <span className="text-primary font-bold text-sm tracking-wider">#CMP-2026-894</span>
            <Badge variant="secondary">Dalam Proses</Badge>
          </div>
          <h3 className="text-2xl font-semibold text-text-primary">Keluhan Lampu Jalan Mati</h3>
          <p className="text-text-secondary font-body flex items-center gap-2">
            <Info size={18} className="text-primary" />
            Sedang ditindaklanjuti oleh Dinas Perhubungan
          </p>
        </div>
        <div className="flex-shrink-0 relative z-10">
          <Link href="#" className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all group">
            Lihat Detail
            <ArrowRight size={20} />
          </Link>
        </div>
      </Card>
    </section>
  );
}
