import React from 'react';
import { User, Mail, Lock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

/**
 * Gaya field terkunci. `opacity-70` (versi pertama) DITOLAK: ia meredupkan
 * TEKSNYA, sehingga nilai yang terisi terbaca seperti placeholder kosong --
 * lawan dari maksudnya. Yang dibutuhkan: latar berbeda supaya jelas tak bisa
 * disunting, teks tetap penuh supaya jelas ADA ISINYA.
 *
 * Ditulis sebagai varian arbitrer `[&_input]:` karena `className` milik
 * komponen Input bersama menempel di div PEMBUNGKUS, bukan di <input>-nya --
 * dan mengubah komponen bersama itu demi satu halaman tidak sepadan.
 */
const KELAS_TERKUNCI =
  '[&_input]:bg-surface-container-low [&_input]:text-text-primary [&_input]:cursor-not-allowed';

/**
 * `identityLocked` (5 September 2026) MENGGANTIKAN `emailReadOnly`.
 *
 * Identitas akun administrator berasal dari Helpdesk Diskominfo, bukan dari
 * SKEMA: akun lahir dari SSO (lihat SsoService.createUser di backend) dan
 * nama/email-nya adalah cerminan data di sana. Karena itu di halaman "Ubah
 * Role Admin" KEDUANYA dikunci -- yang boleh diubah dari SKEMA hanya role
 * untuk sistem SKEMA sendiri.
 *
 * Sebelumnya hanya email yang dikunci, dengan alasan lebih sempit: UpdateUserDto
 * backend memang tak punya field email. Nama TERNYATA bisa diubah (DTO menerima
 * `nama`), dan itulah yang ditutup sekarang -- bukan karena API-nya menolak,
 * tapi karena sumber datanya bukan di sini.
 *
 * Nilainya tetap DITAMPILKAN, tidak disembunyikan: admin perlu memastikan ia
 * sedang mengubah role orang yang benar.
 *
 * CATATAN JUJUR: penguncian ini ada di ANTARMUKA. `PATCH /users/:id` masih
 * menerima `nama` bila ada klien lain yang mengirimnya; yang dijamin di sini
 * adalah halaman ini tak lagi mengirimnya (lihat uji halaman edit).
 */
export default function AccountInformationCard({
  formData,
  onChange,
  errors,
  identityLocked = false,
}) {
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
            {identityLocked
              ? 'Data identitas administrator, bersumber dari Helpdesk Diskominfo'
              : 'Data identitas administrator yang akan didaftarkan'}
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
            disabled={identityLocked}
            className={identityLocked ? KELAS_TERKUNCI : ''}
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
            disabled={identityLocked}
            className={identityLocked ? KELAS_TERKUNCI : ''}
          />
          {errors.email && (
            <p className="text-xs text-error flex items-center gap-1 mt-1">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-error/10 text-error flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</span>
              {errors.email}
            </p>
          )}
        </div>

        {/* SATU keterangan untuk kedua field, bukan satu per field: sebabnya
            sama (sumber datanya di luar SKEMA), dan mengulangnya dua kali
            hanya menambah bacaan tanpa menambah keterangan. Sebabnya WAJIB
            disebut -- tanpa itu admin tak tahu ke mana membetulkan nama yang
            salah, dan halaman ini jadi jalan buntu. */}
        {identityLocked && (
          <div className="flex items-start gap-2 p-sm bg-surface-container-low rounded-lg border border-border">
            <Lock size={14} className="text-text-secondary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Nama dan email dikelola Helpdesk Diskominfo, sehingga tidak dapat diubah dari SKEMA.
              Perbaikan identitas dilakukan di Helpdesk; dari halaman ini yang dapat diubah hanya
              role untuk sistem SKEMA.
            </p>
          </div>
        )}
        {/* Nomor Telepon DIHAPUS -- skema User backend tak punya kolom ini
            sama sekali (CreateUserDto: nama/email/role/opdId saja), mengisinya
            hanya menyesatkan admin krn nilainya tak pernah tersimpan. */}
      </div>
    </Card>
  );
}
