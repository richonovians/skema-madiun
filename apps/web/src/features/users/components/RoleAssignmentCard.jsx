import React from 'react';
import { ShieldCheck, Building2, Lock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { USER_ROLES } from '../constants/userConstants';

/**
 * Pilihan role. Sejak 5 September 2026 ini KELOMPOK KOTAK CENTANG, bukan
 * dropdown: satu akun boleh memegang beberapa role sekaligus, dan pemiliknya
 * memilih sedang bertindak sebagai yang mana saat login.
 *
 * `Masyarakat (Responden)` ikut ditawarkan sejak tanggal yang sama. Sebelumnya
 * backend menolaknya (`ADMIN_ROLES`) karena akun warga lahir dari SSO; batas
 * itu dicabut atas permintaan pengguna, dan `ASSIGNABLE_ROLES` kini memuat
 * seluruh role. Yang TETAP tertutup: `superuser` tak dapat dipetakan dari klaim
 * SSO -- di sini yang memberi adalah manusia yang sudah superuser.
 */
const ROLE_CHOICES = [
  {
    value: USER_ROLES.SUPERUSER,
    label: 'Superuser',
    keterangan:
      'Seluruh hak Admin Kabupaten, DITAMBAH log aktivitas dan manajemen pengguna (halaman ini).',
  },
  {
    value: USER_ROLES.ADMIN_KABUPATEN,
    label: 'Admin Kabupaten',
    keterangan:
      'Akses penuh lintas OPD, KECUALI log aktivitas dan manajemen pengguna (keduanya khusus Superuser).',
  },
  {
    value: USER_ROLES.ADMIN_OPD,
    label: 'Admin OPD',
    keterangan:
      'Dashboard, survei, pertanyaan, respons, dan pengaduan milik SATU instansi yang ditautkan di bawah.',
  },
  {
    value: USER_ROLES.RESPONDENT,
    label: 'Masyarakat (Responden)',
    keterangan:
      'Mengirim pengaduan dan mengisi survei sebagai warga. Terkena gerbang persetujuan UU PDP.',
  },
];

const ROLE_LABEL = ROLE_CHOICES.reduce((acc, r) => ({ ...acc, [r.value]: r.label }), {});

/**
 * `opdOptions` datang dari page.jsx (GET /opd sungguhan) -- versi dummy lama
 * pakai DUMMY_OPD (id palsu, tak match OPD asli manapun), akan selalu gagal
 * validasi backend (`opdId` tak ditemukan) kalau dikirim apa adanya.
 *
 * `roleLocked` (2026-08-05, edit akun sendiri): backend menolak 403 kalau
 * seseorang mengubah role akunnya sendiri (cegah self-lockout, lihat
 * UsersService.update). Saat true, role ditampilkan statis supaya pengguna tak
 * mencoba aksi yang pasti ditolak.
 *
 * `opdLocked` (8 September 2026, KEPEMILIKAN DATA) mengikuti pola yang sama,
 * dengan alasan yang sama kerasnya: `opdId` berasal dari Helpdesk, dan
 * `PATCH /users/:id` kini MENOLAKNYA (UpdateUserDto). Menyisakan dropdown yang
 * dapat diubah berarti menawarkan aksi yang pasti gagal 400 — dan pengguna
 * akan menyalahkan aplikasinya, bukan aturannya.
 *
 * Instansinya tetap DITAMPILKAN, bukan disembunyikan: orang yang memberi peran
 * Admin OPD perlu tahu instansi mana yang akan dipegang akun itu. Dipakai
 * halaman EDIT saja; halaman TAMBAH admin tetap memakai dropdown, karena akun
 * manual (`pending:email`) belum punya data Helpdesk sama sekali.
 */
export default function RoleAssignmentCard({
  formData,
  onRolesChange,
  onDropdownChange,
  errors,
  opdOptions = [],
  roleLocked = false,
  opdLocked = false,
}) {
  const roles = formData.roles ?? [];
  const isAdminOPD = roles.includes(USER_ROLES.ADMIN_OPD);
  // Label dicari dari `opdOptions` supaya nama instansinya benar-benar yang
  // dikenal backend, bukan salinan kedua yang bisa basi. `null` = tak tertaut.
  //
  // Nilai kosong DISARING lebih dahulu, dan itu bukan kehati-hatian berlebihan:
  // `opdOptions` memuat opsi penampung ber-`value: ''` ("Pilih Instansi / OPD"),
  // jadi tanpa penjaga ini akun yang belum tertaut akan menampilkan kalimat
  // ajakan memilih sebagai kalau-kalau itu nama instansinya.
  const namaOpdTertaut = formData.opdId
    ? (opdOptions.find((o) => String(o.value) === String(formData.opdId))?.label ?? null)
    : null;

  const toggle = (value) => {
    const next = roles.includes(value) ? roles.filter((r) => r !== value) : [...roles, value];
    onRolesChange(next);
  };

  return (
    <Card className="p-lg">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-md pb-md border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="font-bold text-text-primary text-sm">Hak Akses</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Boleh lebih dari satu. Pemilik akun memilih sedang memakai yang mana saat masuk.
          </p>
        </div>
      </div>

      <div className="space-y-md">
        {roleLocked ? (
          <div className="space-y-xs">
            <span className="block text-sm font-bold text-text-primary">ROLE ADMINISTRATOR</span>
            <div className="w-full flex items-start gap-2 min-h-[44px] px-md py-2 border border-outline-variant rounded-lg bg-surface-container-low text-text-secondary">
              <Lock size={14} className="flex-shrink-0 mt-1" />
              <span className="text-body-md">
                {roles.length ? roles.map((r) => ROLE_LABEL[r] ?? r).join(', ') : '-'}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Anda tidak dapat mengubah role akun Anda sendiri.
            </p>
          </div>
        ) : (
          <fieldset className="space-y-xs">
            <legend className="block text-sm font-bold text-text-primary mb-2">
              ROLE ADMINISTRATOR
            </legend>
            <div className="space-y-2">
              {ROLE_CHOICES.map((pilihan) => {
                const tercentang = roles.includes(pilihan.value);
                return (
                  <label
                    key={pilihan.value}
                    htmlFor={`role-${pilihan.value}`}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      tercentang
                        ? 'border-primary bg-primary-container/20'
                        : 'border-border bg-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {/* `aria-label` NAMA ROLENYA SAJA, dengan keterangan
                        dilekatkan lewat aria-describedby. Tanpa itu nama
                        aksesibel field ini menjadi seluruh paragraf --
                        pembaca layar membacakan kalimat panjang sebagai nama
                        kotak centang, dan dua pilihan bisa punya nama yang
                        saling tumpang tindih (keterangan Admin Kabupaten
                        menyebut kata "Superuser"). */}
                    <input
                      id={`role-${pilihan.value}`}
                      type="checkbox"
                      checked={tercentang}
                      onChange={() => toggle(pilihan.value)}
                      aria-label={pilihan.label}
                      aria-describedby={`role-${pilihan.value}-ket`}
                      className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-primary">
                        {pilihan.label}
                      </span>
                      <span
                        id={`role-${pilihan.value}-ket`}
                        className="block text-xs text-text-secondary mt-0.5 leading-relaxed"
                      >
                        {pilihan.keterangan}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.roles && (
              <p className="text-xs text-error flex items-center gap-1 mt-1">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-error/10 text-error flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  !
                </span>
                {errors.roles}
              </p>
            )}
          </fieldset>
        )}

        {/* OPD hanya relevan bila Admin OPD termasuk. Instansi ini yang akan
            dipakai saat pemiliknya masuk sebagai Admin OPD -- ia tak memilih
            OPD lagi di sana (keputusan pengguna 5 September 2026). */}
        {isAdminOPD && (
          <div className="space-y-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-xs">
              <Building2 size={14} className="text-text-secondary" />
              <span className="text-xs text-text-secondary font-medium">
                Instansi yang dikelola akun ini saat masuk sebagai Admin OPD
              </span>
            </div>
            {opdLocked ? (
              <div className="space-y-xs">
                <p className="text-sm font-bold text-text-primary">
                  {namaOpdTertaut ?? 'Belum ditautkan Helpdesk'}
                </p>
                <p className="text-xs text-text-secondary">
                  Instansi ini berasal dari Helpdesk dan tak dapat diubah dari SKEMA.
                  {namaOpdTertaut
                    ? ' Ia diperbarui sendiri saat pemiliknya masuk lewat SSO.'
                    : ' Peran Admin OPD baru berlaku setelah Helpdesk menautkan instansinya.'}
                </p>
              </div>
            ) : (
              <Dropdown
                id="opdId"
                label="INSTANSI / OPD"
                options={opdOptions}
                value={formData.opdId}
                onChange={(value) => onDropdownChange('opdId', value)}
                error={errors.opdId}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
