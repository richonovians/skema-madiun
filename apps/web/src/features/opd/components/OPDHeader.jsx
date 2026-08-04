import React from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function OPDHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-end mb-xl gap-4">
      <Button variant="primary-box" className="shadow-primary-container/20 px-6 py-3">
        <Plus size={20} />
        <span>Tambah Instansi OPD Baru</span>
      </Button>
    </div>
  );
}
