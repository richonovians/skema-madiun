import React from 'react';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function SurveyPageHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-xl">
      <div>
        <h1 className="font-h1 text-h1 text-text-primary tracking-tight">Paket Survei Kepuasan Masyarakat</h1>
        <p className="text-text-secondary font-body mt-2">Kelola seluruh instrumen survei unit layanan di bawah naungan OPD Anda.</p>
      </div>
      <Link href="/admin-opd/surveys/builder/new">
        <Button 
          variant="primary" 
          className="px-xl py-md rounded-lg flex items-center gap-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={20} />
          <span>Buat Paket Survei Baru</span>
        </Button>
      </Link>
    </div>
  );
}
