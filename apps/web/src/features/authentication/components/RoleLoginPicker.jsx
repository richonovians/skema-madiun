'use client';

import React from 'react';
import { Building2, ShieldCheck, User, History, X, Info, Lock } from 'lucide-react';
import { SUPERUSER_AREA_HOME } from '@/constants/roleHome';
import { saveSuperuserArea } from '../services/authStorage';

/**
 * Pemilih PERAN (area kerja) -- hanya untuk `superuser`.
 *
 * Peran lain tak pernah melihat ini: Admin Kabupaten, Admin OPD, dan Warga
 * langsung diarahkan ke berandanya masing-masing seperti sebelumnya.
 *
 * Yang dipilih adalah PERAN, BUKAN akun. Sesi yang dipakai tetap sesi superuser
 * itu sendiri -- tak ada login ulang dan tak ada akun lain yang dipinjam.
 *
 * KURUNGAN AREA (2026-08-20, permintaan user: "jika superuser login sebagai
 * warga hanya dapat mengakses semua halaman warga, ... opd ... kabupaten"):
 * pilihan di sini disimpan sebagai cookie `area` dan proxy.js MEMBATASI navigasi
 * pada area itu saja sampai diganti. Sifatnya perlu dinyatakan terus terang, dan
 * karena itu tertulis di kotak bawah: ini pembatas NAVIGASI, bukan pembatas hak.
 * Backend tetap memperlakukan superuser setara kabupaten (`hasFullAccess`), jadi
 * memilih "Warga" tidak mengurangi apa yang boleh dilakukan token-nya.
 *
 * DUA batas teknis yang juga disampaikan apa adanya di kartunya masing-masing:
 * 1. Area OPD tidak mengarah ke /admin-opd/dashboard. `getOpdDashboard` menuntut
 *    `Role.opd` DENGAN opdId terisi (diperiksa di dalam service, jadi
 *    keistimewaan superuser tak menolong) sementara superuser tak tertaut OPD.
 *    Tujuannya diganti daftar survei lintas OPD, yang berfungsi penuh.
 * 2. Area warga menampilkan data SELURUH sistem, bukan milik satu warga --
 *    penyaring kepemilikan backend memberi superuser cakupan tanpa batas.
 */
const ROLE_CHOICES = [
  {
    key: 'kabupaten',
    label: 'Admin Kabupaten',
    icon: ShieldCheck,
    tone: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800',
    description: 'Dashboard eksekutif, monitoring survei lintas OPD, manajemen pengguna.',
    note: 'Log aktivitas & manajemen pengguna ikut terbuka karena Anda superuser.',
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

export default function RoleLoginPicker({
  superuserName,
  // 'login' = baru masuk (menutup = membatalkan login); 'switch' = berpindah area
  // dari dalam aplikasi (menutup = kembali ke area yang sedang dipakai).
  context = 'login',
  currentArea = null,
  onCancel,
}) {
  const isSwitch = context === 'switch';

  const enterAs = (roleKey) => {
    // Ditulis SEBELUM navigasi: proxy.js membaca cookie ini pada permintaan
    // berikutnya untuk menentukan area mana yang boleh dibuka.
    saveSuperuserArea(roleKey);
    // Navigasi HARD (bukan router.push) SENGAJA -- proxy.js membaca cookie lewat
    // full request, jadi cookie yang baru ditulis harus ikut terkirim pada
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
            aria-label={isSwitch ? 'Tutup' : 'Batalkan login'}
            title={isSwitch ? 'Tutup tanpa berpindah' : 'Batalkan login'}
          >
            <X size={18} />
          </button>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Superuser</p>
          <h3 className="font-bold text-slate-800 text-lg leading-tight mt-1">
            {isSwitch ? 'Ganti peran' : 'Masuk sebagai'}
            {superuserName ? ` — ${superuserName}` : ''}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Pilih peran yang ingin Anda buka. Hanya superuser yang mendapat pilihan ini.
          </p>
        </div>

        <div className="px-6 py-5 space-y-3 flex-1 min-h-0 overflow-y-auto">
          {ROLE_CHOICES.map((choice) => {
            const Icon = choice.icon;
            const NoteIcon = choice.noteIcon;
            const isCurrent = choice.key === currentArea;
            return (
              <button
                key={choice.key}
                onClick={() => enterAs(choice.key)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${choice.tone} ${
                  isCurrent ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={18} className="shrink-0" />
                  <span className="font-bold text-sm">{choice.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      sedang dipakai
                    </span>
                  )}
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
            <Lock size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Selama peran ini dipakai, halaman di luar areanya akan dialihkan kembali ke sini.
              Anda tetap masuk memakai akun superuser sendiri -- tak ada akun lain yang dipinjam,
              dan pembatasan ini mengatur NAVIGASI, bukan hak akses di server. Peran bisa diganti
              kapan saja lewat menu &quot;Ganti Peran&quot;.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
