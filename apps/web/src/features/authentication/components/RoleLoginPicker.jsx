'use client';

import React from 'react';
import { Building2, ShieldCheck, User, History, X, Info } from 'lucide-react';
import { SUPERUSER_AREA_HOME } from '@/constants/roleHome';

/**
 * Pemilih PERAN saat login -- hanya untuk `superuser`.
 *
 * Peran lain tak pernah melihat ini: Admin Kabupaten, Admin OPD, dan Warga
 * langsung diarahkan ke berandanya masing-masing seperti sebelumnya.
 *
 * Yang dipilih adalah PERAN (area kerja), BUKAN akun. Sesi yang dipakai tetap
 * sesi superuser itu sendiri -- tak ada login ulang dan tak ada akun lain yang
 * dipinjam. Ini bisa dilakukan karena backend memperlakukan superuser setara
 * `kabupaten` di seluruh pemeriksaan akses (`hasFullAccess` di role.util.ts),
 * jadi setiap area terbuka untuknya.
 *
 * DUA hal yang perlu jujur disampaikan ke pengguna, dan karena itu tertulis di
 * kartunya masing-masing:
 * 1. Area OPD tidak mengarah ke /admin-opd/dashboard. `getOpdDashboard` menuntut
 *    `Role.opd` DENGAN opdId terisi (diperiksa di dalam service, jadi keistimewaan
 *    superuser tak menolong) sementara superuser tak tertaut OPD mana pun.
 *    Tujuannya diganti daftar survei lintas OPD, yang berfungsi penuh.
 * 2. Area warga menampilkan data SELURUH sistem, bukan milik satu warga.
 *    Penyaring kepemilikan backend memberi superuser cakupan tanpa batas
 *    (terbukti: GET /complaints mengembalikan 4 baris untuk peran berhak penuh
 *    vs 2 baris untuk warga aslinya).
 */
const ROLE_CHOICES = [
  {
    key: 'kabupaten',
    label: 'Admin Kabupaten',
    icon: ShieldCheck,
    tone: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800',
    description: 'Dashboard eksekutif, monitoring survei lintas OPD, manajemen pengguna.',
    note: 'Log aktivitas ikut terbuka karena Anda superuser.',
    noteIcon: History,
  },
  {
    key: 'opd',
    label: 'Admin OPD',
    icon: Building2,
    tone: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800',
    description: 'Area OPD: daftar survei, pertanyaan, respons, dan pengaduan.',
    note: 'Masuk ke daftar survei -- dashboard OPD butuh akun yang tertaut satu OPD.',
  },
  {
    key: 'responden',
    label: 'Warga',
    icon: User,
    tone: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
    description: 'Tampilan warga: dashboard, pengaduan, dan pengisian survei.',
    note: 'Data yang tampil mencakup seluruh sistem, bukan milik satu warga.',
  },
];

export default function RoleLoginPicker({ superuserName, onCancel }) {
  const enterAs = (roleKey) => {
    // Navigasi HARD (bukan router.push) SENGAJA -- proxy.js membaca cookie lewat
    // full request, jadi cookie sesi yang baru ditulis harus ikut terkirim pada
    // permintaan berikutnya. `location.assign()` dipakai alih-alih menugaskan
    // `location.href`: efeknya sama, tapi ia pemanggilan metode, bukan mutasi
    // properti objek di luar komponen (react-hooks/immutability).
    window.location.assign(SUPERUSER_AREA_HOME[roleKey]);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[560px] max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 relative shrink-0">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            aria-label="Batalkan login"
            title="Batalkan login"
          >
            <X size={18} />
          </button>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Superuser</p>
          <h3 className="font-bold text-slate-800 text-lg leading-tight mt-1">
            Masuk sebagai{superuserName ? ` — ${superuserName}` : ''}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Pilih peran yang ingin Anda buka. Hanya superuser yang mendapat pilihan ini.
          </p>
        </div>

        <div className="px-6 py-5 space-y-3 flex-1 min-h-0 overflow-y-auto">
          {ROLE_CHOICES.map((choice) => {
            const Icon = choice.icon;
            const NoteIcon = choice.noteIcon;
            return (
              <button
                key={choice.key}
                onClick={() => enterAs(choice.key)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${choice.tone}`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={18} className="shrink-0" />
                  <span className="font-bold text-sm">{choice.label}</span>
                </span>
                <span className="block text-xs mt-1.5 opacity-90">{choice.description}</span>
                <span className="flex items-start gap-1.5 text-[11px] mt-2 opacity-80">
                  {NoteIcon ? (
                    <NoteIcon size={12} className="mt-0.5 shrink-0" />
                  ) : (
                    <Info size={12} className="mt-0.5 shrink-0" />
                  )}
                  <span>{choice.note}</span>
                </span>
              </button>
            );
          })}

          <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Info size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Anda tetap masuk memakai akun superuser sendiri -- tak ada akun lain yang dipinjam.
              Pilihan ini hanya menentukan area mana yang dibuka lebih dulu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
