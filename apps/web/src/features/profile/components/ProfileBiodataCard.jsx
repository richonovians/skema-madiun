'use client';

import React from 'react';
import { User, IdCard, Mail, Phone, MapPin, Briefcase } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function ProfileBiodataCard({ user }) {
  const biodataItems = [
    {
      label: 'Nama Lengkap',
      value: user.name,
      icon: User,
    },
    {
      label: 'Nomor Induk Kependudukan (NIK)',
      value: user.nikMasked,
      icon: IdCard,
      note: 'Tersamarkan demi keamanan data',
    },
    {
      label: 'Alamat Email',
      value: user.email,
      icon: Mail,
    },
    {
      label: 'Nomor Telepon / WhatsApp',
      value: user.phone,
      icon: Phone,
    },
    {
      label: 'Pekerjaan / Instansi',
      value: user.occupation,
      icon: Briefcase,
    },
    {
      label: 'Alamat Domisili',
      value: user.address,
      icon: MapPin,
      fullWidth: true,
    },
  ];

  /**
   * MEDAN KOSONG DISARING, TIDAK DIBERI STRIP (1 Oktober 2026). Sebelum ini
   * NIK, telepon, dan alamat selalu '-' karena memang tak ada sumbernya;
   * sumbernya kini ada (klaim SSO Helpdesk -> tiga kolom `users` -> GET
   * /auth/me). Tetapi Helpdesk tak menjamin ketiganya terisi, sehingga
   * kekosongan tetap menjadi keadaan NORMAL -- dan deretan tanda hubung
   * terbaca sebagai aplikasi yang gagal memuat sesuatu. Pola yang sama dipakai
   * ComplaintReporterProfile & SurveyRespondentCard.
   */
  const itemTerisi = biodataItems.filter((item) => Boolean(item.value));

  return (
    <Card className="p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Informasi Biodata</h2>
          {/* NASKAHNYA DIKOREKSI 1 Oktober 2026. Kalimat sebelumnya berbunyi
              "Kolom bertanda '-' belum tersedia karena tidak disimpan sistem",
              dan itu benar selama NIK/telepon/alamat memang tak pernah
              disimpan backend. Ketiganya kini disalin dari akun Helpdesk saat
              login, jadi kalimat itu menyalahkan sistem atas data yang sudah
              ada -- dan barisnya pun tak lagi bertanda hubung melainkan
              disembunyikan. */}
          <p className="text-sm text-text-secondary">
            Data identitas akun Anda pada sistem SKEMA, disalin dari akun Helpdesk saat Anda
            masuk. Kolom yang tidak ditampilkan berarti Helpdesk tidak mengirimkannya.
          </p>
        </div>
        <span className="text-xs bg-surface-container px-3 py-1 rounded-full font-medium text-text-secondary border border-border/50">
          Read-Only
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
        {itemTerisi.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div 
              key={index} 
              className={`space-y-1.5 p-4 rounded-xl bg-surface-container-low/50 border border-border/40 transition-colors hover:bg-surface-container-low ${
                item.fullWidth ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <IconComponent size={15} className="text-primary shrink-0" />
                <span>{item.label}</span>
              </div>
              <div className="text-base font-semibold text-text-primary font-body pl-6 break-words">
                {item.value}
              </div>
              {item.note && (
                <div className="text-xs text-text-secondary/80 pl-6 italic">
                  * {item.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
