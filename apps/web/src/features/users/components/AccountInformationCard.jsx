import React from 'react';
import { User, Mail } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

/**
 * `emailReadOnly` (2026-08-05, edit akun): UpdateUserDto backend tak punya
 * field email sama sekali (hanya nama/opdId/role) -- email ditampilkan tapi
 * dikunci di halaman edit supaya tak menyesatkan (mengetik ubahan yg tak
 * pernah tersimpan).
 */
export default function AccountInformationCard({ formData, onChange, errors, emailReadOnly = false }) {
  return (
    <Card className="p-lg">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-md pb-md border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-text-primary text-sm">Informasi Akun</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Data identitas administrator yang akan didaftarkan
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-md">
        {/* Nama Lengkap */}
        <div className="space-y-xs">
          <Input
            id="fullName"
            label="NAMA LENGKAP"
            placeholder="Contoh: Budi Santoso"
            leftIcon={<User size={16} />}
            value={formData.fullName}
            onChange={onChange}
          />
          {errors.fullName && (
            <p className="text-xs text-error flex items-center gap-1 mt-1">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-error/10 text-error flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</span>
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-xs">
          <Input
            id="email"
            type="email"
            label="ALAMAT EMAIL"
            placeholder="Contoh: budi@madiunkab.go.id"
            leftIcon={<Mail size={16} />}
            value={formData.email}
            onChange={onChange}
            disabled={emailReadOnly}
            className={emailReadOnly ? 'opacity-70' : ''}
          />
          {emailReadOnly && (
            <p className="text-xs text-text-secondary">
              Email tidak dapat diubah dari halaman ini.
            </p>
          )}
          {errors.email && (
            <p className="text-xs text-error flex items-center gap-1 mt-1">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-error/10 text-error flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</span>
              {errors.email}
            </p>
          )}
        </div>
        {/* Nomor Telepon DIHAPUS -- skema User backend tak punya kolom ini
            sama sekali (CreateUserDto: nama/email/role/opdId saja), mengisinya
            hanya menyesatkan admin krn nilainya tak pernah tersimpan. */}
      </div>
    </Card>
  );
}
