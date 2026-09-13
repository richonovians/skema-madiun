'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { getOpdList } from '@/features/opd/services/opd.api';
import { useSesiAktif } from '@/features/authentication/hooks/useSesiAktif';

/**
 * SEBELUMNYA (bug ditemukan 2026-08-06, pola sama dgn ComplaintForm.jsx yg
 * sudah diperbaiki): OPD di-hardcode 19 entri slug lama (`pupr`/`kec_*`, tak
 * sinkron dgn data OPD nyata hasil sync Helpdesk), + dropdown "layanan" yg
 * TAK ADA padanannya di backend sama sekali (sudah diputuskan INT-45:
 * "backend tak punya konsep layanan sbg sub-divisi survei" -- lihat
 * survey.adapter.js), lalu redirect ke `/surveys/{slug-opd-palsu}` yg
 * PASTI salah (`/surveys/[id]` mengharap id survei numerik, bukan slug OPD).
 *
 * Kini: OPD dari `getOpdList()` sungguhan, TANPA dropdown layanan (tak ada
 * konsepnya), navigasi ke `/surveys?opdId=X` -- `/surveys` (SurveysPage)
 * sudah pakai `getActiveSurveys()` yg mendukung filter `opdId` (INT-45,
 * `GET /surveys/active?opdId=`), warga tinggal pilih survei aktif OPD itu
 * dari daftar nyata (bisa >1 survei aktif per OPD, tak selalu tepat satu).
 */
export default function SurveyForm() {
  const router = useRouter();
  const [opdId, setOpdId] = useState('');
  const [error, setError] = useState(null);

  // Sesi dibaca lewat useSesiAktif, bukan inisialisasi useState: beranda
  // dirender di server yang tak melihat localStorage, sehingga cara lama
  // membuat render pertama di klien berbeda dari HTML server. Alasan
  // lengkapnya di hooks/useSesiAktif.js.
  const adaSesi = useSesiAktif();

  const fetchOpd = useCallback(() => getOpdList({ limit: 100, isActive: true }), []);
  const { data: opdResponse, isLoading, error: gagalMuat } = useAsync(fetchOpd);
  const opdOptions = (opdResponse?.data ?? []).map((opd) => ({
    label: opd.name,
    value: String(opd.id),
  }));

  /**
   * EMPAT keadaan, dan pembedaannya bukan kosmetik. `getOpdList()` menuntut
   * sesi: `GET /api/v1/opd` menjawab 401 tanpa sesi (terukur 8 September 2026).
   * Jadi pengunjung beranda yang belum masuk SELALU melihat daftar kosong, dan
   * menyuruhnya "silakan pilih instansi" berarti menyuruh melakukan hal yang
   * tak mungkin dilakukan.
   *
   * Keadaan "gagal memuat" ikut dibedakan karena `useAsync` sudah mengembalikan
   * `error` dan nilai itu tadinya dibuang, sehingga kegagalan jaringan tak
   * dapat dibedakan dari daftar yang memang kosong.
   *
   * HANYA DI SINI himbauan masuk itu muncul. Sebelumnya ada paragraf tambahan
   * beserta tautan "Masuk sekarang" di bawah dropdown, dan pengguna meminta
   * keduanya dihapus (8 September 2026) karena satu pesan pada penampung
   * dropdown sudah cukup. Tautannya menuju '/' , yaitu halaman yang sedang
   * dibaca, jadi yang hilang cuma pengulangan.
   */
  const labelPenampung = () => {
    if (!adaSesi) return 'Masuk untuk melihat daftar instansi';
    if (isLoading) return 'Memuat daftar instansi...';
    if (gagalMuat) return 'Daftar instansi gagal dimuat';
    return 'Pilih Instansi';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!adaSesi) {
      setError('Masuk terlebih dahulu untuk melihat instansi dan survei yang tersedia.');
      return;
    }
    if (!opdId) {
      setError('Silakan pilih Instansi / OPD yang ingin dinilai terlebih dahulu');
      return;
    }
    setError(null);
    router.push(`/surveys?opdId=${opdId}`);
  };

  const handleChange = (value) => {
    setOpdId(value);
    if (error) setError(null);
  };

  return (
    <section className="w-full bg-white rounded-xl shadow-2xl p-6 lg:p-8 border border-slate-100">
      <div className="mb-8 border-b border-border pb-6">
        <h2 className="font-h2 text-h2 text-text-primary mb-2">Formulir Survei Kepuasan</h2>
        <p className="text-text-secondary text-sm">Pilih instansi untuk melihat survei aktif yang tersedia.</p>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <Dropdown
          id="opd"
          label="PILIH INSTANSI / OPD"
          value={opdId}
          onChange={handleChange}
          error={error ?? (adaSesi && gagalMuat ? gagalMuat.message : null)}
          options={[{ value: '', label: labelPenampung() }, ...opdOptions]}
          /* Medan cari yang sama seperti pada formulir pengaduan (11 September
             2026). Daftarnya memang daftar yang sama -- 62 instansi aktif --
             dan kedua formulir berdiri di halaman beranda yang sama, jadi
             membedakan keduanya berarti pengguna harus menghafal dropdown mana
             yang dapat dicari.

             Syaratnya ikut membedakan keempat keadaan `labelPenampung()`:
             tanpa sesi, sedang memuat, dan gagal memuat sama-sama berujung
             daftar kosong, dan medan cari di atasnya tak menjanjikan apa pun. */
          searchable={adaSesi && opdOptions.length > 0}
          searchPlaceholder="Cari nama instansi..."
          emptySearchLabel="Tidak ada instansi yang cocok"
        />

        <Button type="submit" className="w-full py-4 text-xl">
          Lihat Survei Tersedia
        </Button>
      </form>
    </section>
  );
}
