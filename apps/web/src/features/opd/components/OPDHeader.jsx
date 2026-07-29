import React from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function OPDHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-xl gap-4">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-text-primary">Manajemen Master Data OPD</h2>
        <p className="text-text-secondary font-body-md text-body-md">Kelola entitas Organisasi Perangkat Daerah untuk integrasi sistem layanan publik.</p>
      </div>
      <Button variant="primary-box" className="shadow-primary-container/20 px-6 py-3">
        <Plus size={20} />
        <span>Tambah Instansi OPD Baru</span>
      </Button>
    </div>
  );
}
