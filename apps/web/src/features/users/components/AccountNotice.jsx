import React from 'react';
import { Info, KeyRound, Shield } from 'lucide-react';
import Card from '@/components/ui/Card';

// "Kata sandi awal dikirim via email" (versi lama) DIHAPUS -- sistem ini
// TIDAK PERNAH mengelola kata sandi sama sekali (login lewat SSO Helpdesk,
// keputusan arsitektur terkunci; dev-login jadi jalur sementara sebelum SSO
// aktif). Klaim lama menjanjikan alur yang tak pernah ada.
const NOTICE_ITEMS = [
  {
    icon: KeyRound,
    title: 'Mekanisme Login',
    description:
      'Akun administrator login melalui SSO Helpdesk Diskominfo menggunakan email yang didaftarkan -- sistem ini tidak mengelola kata sandi terpisah.',
  },
  {
    icon: Shield,
    title: 'Keamanan Akses',
    description:
      'Setiap sesi administrator diverifikasi melalui token sesi (JWT). Token akan kedaluwarsa secara otomatis sesuai kebijakan sistem.',
  },
];

export default function AccountNotice() {
  return (
    <Card className="p-lg bg-blue-50/50 border-blue-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-md">
        <Info size={16} className="text-primary flex-shrink-0" />
        <h2 className="font-bold text-primary text-sm">Informasi Sistem</h2>
      </div>

      {/* Notice items */}
      <ul className="space-y-sm">
        {NOTICE_ITEMS.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <item.icon size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
