'use client';

import React, { useState } from 'react';
// `History` dibuang bersama tombol Superuser (8 September 2026).
import { Building2, Info, Lock, ShieldCheck, User, X } from 'lucide-react';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { ROLE_HOME } from '@/constants/roleHome';
import { setActingRole } from '../services/actingRole.api';
import { KUNCI_TOMBOL, peranUntukTombol, tombolUntukRoles } from '../utils/tombolPeran';

/**
 * Pemilih peran. Sejak 5 September 2026 BUKAN lagi khusus superuser: siapa pun
 * yang akunnya memegang lebih dari satu role melihatnya, dan pilihannya
 * menentukan HAK AKSES sesi itu -- bukan cuma halaman mana yang dibukakan.
 *
 * Dua hal yang HILANG dari versi sebelumnya, dan keduanya disengaja:
 *
 * 1. Langkah "pilih OPD". Dulu superuser dapat memerankan OPD mana pun karena
 *    backend memberinya cakupan penuh. Sekarang bertindak sebagai Admin OPD
 *    memakai instansi yang tercantum di AKUNNYA (keputusan pengguna
 *    5 September 2026), jadi tak ada yang perlu dipilih.
 * 2. Kalimat "pembatasan ini mengatur NAVIGASI, bukan hak akses di server".
 *    Itu sudah tidak benar lagi: `POST /auth/acting-role` menerbitkan sesi baru
 *    yang benar-benar membatasi hak (klaim `act`, lihat acting-role.util.ts).
 *    Membiarkannya berarti menjanjikan hal yang berlawanan dengan kenyataan.
 */
const ROLE_CHOICES = [
  {
    // SATU tombol untuk DUA role (8 September 2026). Yang menentukan haknya
    // `peranUntukTombol()`, bukan label di sini: akun bersuperuser masuk dengan
    // `act=superuser`, akun kabupaten biasa dengan `act=kabupaten`.
    key: KUNCI_TOMBOL.KABUPATEN,
    label: 'Admin Kabupaten',
    icon: ShieldCheck,
    tone: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800',
    description: 'Dashboard eksekutif dan monitoring survei serta pengaduan lintas OPD.',
    note: 'Log aktivitas & manajemen pengguna TIDAK terbuka pada peran ini.',
    // Dipakai bila akunnya memegang role `superuser`. Keterangannya WAJIB
    // berbeda: tombolnya satu, tapi haknya benar-benar tidak sama, dan
    // menjanjikan hal yang salah di sini berarti pengguna mengira fiturnya
    // rusak ketika manajemen pengguna tak terbuka -- atau sebaliknya.
    deskripsiSuper:
      'Dashboard eksekutif, monitoring lintas OPD, ditambah log aktivitas & manajemen pengguna.',
    noteSuper: 'Akun Anda bersuperuser, jadi log aktivitas & manajemen pengguna ikut terbuka.',
  },
  {
    key: KUNCI_TOMBOL.OPD,
    label: 'Admin OPD',
    icon: Building2,
    tone: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800',
    description: 'Dashboard OPD, daftar survei, pertanyaan, respons, dan pengaduan.',
    note: 'Instansinya mengikuti OPD yang tercantum di akun Anda.',
  },
  {
    key: KUNCI_TOMBOL.WARGA,
    label: 'Warga',
    icon: User,
    tone: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
    description: 'Tampilan warga: dashboard, pengaduan, dan pengisian survei.',
    note: 'Peran ini terkena gerbang persetujuan UU PDP seperti warga lainnya.',
  },
];

/**
 * @param {object} props
 * @param {string} [props.userName] nama pemilik akun, untuk judul
 * @param {string[]} props.roles role BACKEND yang dimiliki akun
 * @param {string|null} [props.currentRole] peran yang sedang dipakai
 * @param {number|null} [props.opdId] tautan OPD akun; menentukan boleh-tidaknya
 *   peran `opd` dipakai
 * @param {'login'|'switch'} [props.context] 'login' = menutup berarti
 *   membatalkan login; 'switch' = menutup berarti kembali ke peran sekarang
 * @param {() => void} props.onCancel
 */
export default function RoleLoginPicker({
  userName,
  roles = [],
  currentRole = null,
  opdId = null,
  context = 'login',
  onCancel,
}) {
  const isSwitch = context === 'switch';
  const [sedangGanti, setSedangGanti] = useState(null);
  const [galat, setGalat] = useState('');

  // Komponen ini hanya di-mount selagi pemilih terbuka, jadi tanpa syarat.
  useBodyScrollLock();

  // Hanya tombol yang BENAR-BENAR dapat dipakai akun ini. Bukan sekadar
  // kerapian: menawarkan peran yang tak dimiliki hanya menghasilkan 403 dari
  // backend (AuthService.setActingRole), dan itu terasa seperti aplikasi rusak.
  //
  // Penyaringnya `tombolUntukRoles`, BUKAN `roles.includes(c.key)` seperti dulu:
  // tombol Admin Kabupaten mewakili DUA role, sehingga penyaring lama memberi
  // akun ber-role `[superuser]` nol tombol -- terkunci di luar tanpa pesan apa
  // pun. Ada uji khusus untuk kasus itu di utils/__tests__/tombolPeran.test.js.
  const kunciTampil = tombolUntukRoles(roles);
  const pilihan = ROLE_CHOICES.filter((c) => kunciTampil.includes(c.key));
  const punyaSuperuser = roles.includes('superuser');

  const enterAs = async (tombolKey) => {
    setGalat('');
    // `sedangGanti` memegang kunci TOMBOL, bukan peran hasil pemetaan, supaya
    // penanda "berpindah..." tetap menempel pada tombol yang benar-benar diklik.
    setSedangGanti(tombolKey);
    const peran = peranUntukTombol(tombolKey, roles);
    try {
      await setActingRole(peran);
      // Navigasi HARD (bukan router.push) SENGAJA -- proxy.js membaca cookie
      // lewat full request, jadi cookie `role` yang baru ditulis harus ikut
      // terkirim pada permintaan berikutnya. `location.assign()` dipakai
      // alih-alih menugaskan `location.href`: efeknya sama, tapi ia pemanggilan
      // metode, bukan mutasi properti objek di luar komponen.
      window.location.assign(ROLE_HOME[peran] ?? '/');
    } catch (err) {
      setSedangGanti(null);
      setGalat(err.message || 'Gagal berpindah peran. Silakan coba lagi.');
    }
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {/* Jumlah TOMBOL, bukan jumlah role: akun ber-role
                `[superuser, kabupaten]` memegang dua role tapi melihat satu
                tombol, dan "2 peran" di atas satu tombol hanya membingungkan. */}
            {pilihan.length} pilihan peran
          </p>
          <h3 className="font-bold text-slate-800 text-lg leading-tight mt-1">
            {isSwitch ? 'Ganti peran' : 'Masuk sebagai'}
            {userName ? ` — ${userName}` : ''}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Pilih peran yang ingin Anda pakai. Hak akses sesi ini mengikuti pilihan tersebut.
          </p>
        </div>

        <div className="px-6 py-5 space-y-3 flex-1 min-h-0 overflow-y-auto">
          {galat && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {galat}
            </div>
          )}

          {pilihan.map((choice) => {
            const Icon = choice.icon;
            // Dibandingkan LEWAT PEMETAAN: peran yang sedang dipakai seorang
            // superuser adalah `superuser`, sementara kunci tombolnya
            // `kabupaten`. Tanpa ini penanda "sedang dipakai" tak pernah muncul
            // bagi mereka.
            const isCurrent = peranUntukTombol(choice.key, roles) === currentRole;
            // Admin OPD tanpa tautan OPD tak dapat dipakai -- backend menolaknya
            // 400. Ditampilkan NONAKTIF beserta sebabnya, bukan disembunyikan:
            // pemiliknya berhak tahu mengapa peran yang ia miliki tak bisa dibuka.
            const terhalang = choice.key === KUNCI_TOMBOL.OPD && opdId == null;
            const sibuk = sedangGanti !== null;

            return (
              <button
                key={choice.key}
                type="button"
                disabled={terhalang || sibuk}
                onClick={() => enterAs(choice.key)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${choice.tone} ${
                  isCurrent ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                } ${terhalang || sibuk ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={18} className="shrink-0" />
                  <span className="font-bold text-sm">{choice.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      sedang dipakai
                    </span>
                  )}
                  {sedangGanti === choice.key && (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      berpindah...
                    </span>
                  )}
                </span>
                <span className="block text-xs mt-1.5 opacity-90">
                  {punyaSuperuser && choice.deskripsiSuper
                    ? choice.deskripsiSuper
                    : choice.description}
                </span>
                <span className="flex items-start gap-1.5 text-[11px] mt-2 opacity-80">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>
                    {terhalang
                      ? 'Akun Anda belum ditautkan ke OPD mana pun, jadi peran ini belum dapat dipakai. Hubungi Superuser untuk menautkannya.'
                      : punyaSuperuser && choice.noteSuper
                        ? choice.noteSuper
                        : choice.note}
                  </span>
                </span>
              </button>
            );
          })}

          <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Lock size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Peran yang dipilih menentukan hak akses sesi ini di server, bukan cuma menu yang
              tampil: hal yang di luar peran itu akan ditolak walau akun Anda memilikinya. Peran
              bisa diganti kapan saja lewat menu &quot;Ganti Peran&quot;, tanpa keluar dan masuk lagi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
