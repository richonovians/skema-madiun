import React from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function UsersHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-xl gap-4">
      <div>
        <nav className="flex gap-2 text-label-md text-text-secondary mb-2">
          <span>Admin</span>
          <span>/</span>
          <span className="text-primary font-medium">Manajemen Pengguna</span>
        </nav>
        <h2 className="font-headline-lg text-headline-lg text-text-primary">Manajemen Pengguna (RBAC)</h2>
        <p className="text-body-md text-text-secondary mt-1">Kelola hak akses sistem, peran admin, dan otorisasi pengguna eksternal.</p>
      </div>
      <Button variant="primary" className="shadow-md px-6 py-3">
        <Plus size={20} />
        <span>Buat Akun Admin Baru</span>
      </Button>
    </div>
  );
}
