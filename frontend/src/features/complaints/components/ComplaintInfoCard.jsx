import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Ticket, CalendarDays, Building2 } from 'lucide-react';

export default function ComplaintInfoCard({ ticketId, date, target, status }) {
  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'diterima':
      case 'sedang diproses':
      case 'diproses':
        return 'secondary';
      case 'selesai':
        return 'success';
      case 'ditolak':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <Card className="overflow-hidden border-border/40 shadow-xl shadow-primary/5 transition-all hover:shadow-2xl hover:shadow-primary/10 relative">
      {/* Decorative blurred blobs for a premium glass/glow effect */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="p-xl relative z-10">
        
        {/* Header: Icon & Badge */}
        <div className="flex items-center justify-between mb-xl">
          <div className="flex items-center gap-md">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white shadow-lg shadow-primary/30 transform transition-transform hover:scale-105 hover:rotate-3">
              <Ticket size={24} strokeWidth={2} />
            </div>
            <span className="font-bold text-text-primary text-sm uppercase tracking-widest opacity-80">Tiket Laporan</span>
          </div>
          <Badge variant={getStatusVariant(status)} className="px-3 py-1.5 font-bold tracking-widest uppercase text-[10px] shadow-sm ring-1 ring-black/5">
            {status?.toUpperCase() || 'UNKNOWN'}
          </Badge>
        </div>

        {/* Hero Section: Ticket ID */}
        <div className="mb-xl pt-sm">
          <p className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-1">Nomor Registrasi</p>
          <h2 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-primary via-primary-hover to-secondary bg-clip-text text-transparent tracking-tight">
            {ticketId || '-'}
          </h2>
        </div>

        {/* Footer Data Grid */}
        <div className="grid grid-cols-2 gap-lg pt-lg border-t-2 border-dashed border-border/60">
          
          <div className="flex items-start gap-sm group">
            <div className="mt-0.5 p-2 bg-surface-container-highest/40 rounded-xl text-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <CalendarDays size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-0.5">Tanggal</p>
              <p className="text-sm font-bold text-text-primary">{date || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-sm group">
            <div className="mt-0.5 p-2 bg-surface-container-highest/40 rounded-xl text-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-0.5">Tujuan</p>
              <p className="text-sm font-bold text-text-primary leading-tight">{target || '-'}</p>
            </div>
          </div>

        </div>
      </div>
    </Card>
  );
}
