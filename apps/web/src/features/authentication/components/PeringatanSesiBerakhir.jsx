'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { isUnauthorizedError } from '@/services/api';
import { authApi } from '../services/sso.api';
import { waktuBerakhirSesiMs } from '../services/authStorage';
import { useSesiAkanBerakhir } from '../hooks/useSesiAkanBerakhir';

const formatJam = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});

/**
 * Peringatan lima menit sebelum sesi berakhir (23 November 2026).
 *
 * Dipasang SEKALI di root layout, bukan di tiap navbar: ketiga area (warga,
 * Admin OPD, Admin Kabupaten) sama-sama butuh, dan satu tempat menjamin tak
 * ada dua dialog yang muncul bersamaan.
 *
 * "Lanjutkan sesi" memanggil `GET /auth/me`. Interseptor backend
 * memperpanjang jendela menganggur pada permintaan apa pun, dan `api.js`
 * meneruskan waktu berakhir barunya ke authStorage, yang lalu memadamkan
 * dialog ini lewat hook-nya. Bila waktunya TIDAK bergeser, sesi sudah di pagu
 * mutlak 12 jam -- atau jalur dev-login, yang tokennya memang tak pernah
 * diperpanjang -- dan dialog berganti pesan.
 *
 * `role="alertdialog"`: pesannya mendesak dan menuntut tanggapan, jadi pembaca
 * layar mengumumkannya begitu muncul.
 */
export default function PeringatanSesiBerakhir() {
  const berakhirPada = useSesiAkanBerakhir();
  // Disimpan per waktu berakhir, bukan sebagai boolean: sesudah sesi
  // diperpanjang lalu mendekati batas berikutnya, peringatannya harus muncul
  // lagi walau yang sebelumnya ditutup.
  const [ditutupUntuk, setDitutupUntuk] = useState(null);
  const [hasil, setHasil] = useState({ untuk: null, jenis: null });
  const [memproses, setMemproses] = useState(false);
  const refDialog = useRef(null);
  const idJudul = useId();
  const idIsi = useId();

  const terbuka = berakhirPada != null && berakhirPada !== ditutupUntuk;
  const jenis = hasil.untuk === berakhirPada ? hasil.jenis : null;

  useBodyScrollLock(terbuka);
  useFocusTrap(refDialog, terbuka);

  useEffect(() => {
    if (!terbuka) return undefined;
    const padaTombol = (e) => {
      if (e.key === 'Escape' && !memproses) setDitutupUntuk(berakhirPada);
    };
    window.addEventListener('keydown', padaTombol);
    return () => window.removeEventListener('keydown', padaTombol);
  }, [terbuka, memproses, berakhirPada]);

  if (!terbuka || typeof document === 'undefined') return null;

  const tutup = () => setDitutupUntuk(berakhirPada);

  const lanjutkan = async () => {
    const semula = berakhirPada;
    setMemproses(true);
    try {
      await authApi.me();
      const baru = waktuBerakhirSesiMs();
      if (baru != null && baru <= semula) setHasil({ untuk: semula, jenis: 'mentok' });
    } catch (err) {
      // 401: sesinya sudah mati dan interseptor membersihkannya; dialog ini
      // padam sendiri karena hook-nya ikut membaca keadaan tanpa sesi.
      if (!isUnauthorizedError(err)) setHasil({ untuk: semula, jenis: 'galat' });
    } finally {
      setMemproses(false);
    }
  };

  const jam = formatJam.format(berakhirPada);
  let isi = `Sesi Anda akan berakhir pukul ${jam} WIB. Simpan atau kirim pekerjaan Anda.`;
  if (jenis === 'mentok') {
    isi =
      'Sesi sudah mencapai batas maksimum dan tidak dapat diperpanjang. Kirim pekerjaan Anda sekarang, lalu masuk kembali.';
  } else if (jenis === 'galat') {
    isi = `Sesi belum dapat diperpanjang karena server tidak terjangkau. Sesi Anda tetap berakhir pukul ${jam} WIB kecuali diperpanjang.`;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        ref={refDialog}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        aria-describedby={idIsi}
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden w-full max-w-[420px] focus:outline-none"
      >
        <div className="p-6 text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-amber-50 text-amber-600">
            <Clock size={32} aria-hidden="true" />
          </div>
          <h2 id={idJudul} className="text-xl font-bold text-text-primary">
            Sesi Anda akan berakhir
          </h2>
          <p id={idIsi} className="text-sm text-text-secondary leading-relaxed">
            {isi}
          </p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={tutup}
            disabled={memproses}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Tutup
          </button>
          {jenis !== 'mentok' && (
            <button
              type="button"
              onClick={lanjutkan}
              disabled={memproses}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-colors disabled:opacity-60"
            >
              {memproses ? 'Memproses...' : 'Lanjutkan sesi'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
