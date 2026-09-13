'use client';

import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import ResetFilterButton from '@/components/ui/ResetFilterButton';
import { RENTANG_BAWAAN, RENTANG_WAKTU } from '../adapters/notificationRentang';

/**
 * Urutan menurut waktu (permintaan pengguna 13 September 2026).
 *
 * HANYA waktu, bukan jenis atau status. Halaman ini mengelompokkan barisnya
 * per rentang tanggal ("Hari ini", "Kemarin", ...), dan kepala kelompok itu
 * mengandaikan daftarnya terurut waktu. Membalik urutannya masih koheren --
 * kelompoknya ikut terbalik -- sedangkan mengurutkan per jenis akan
 * menghancurkan pengelompokan itu sama sekali.
 */
export const URUTAN_WAKTU = [
  { value: 'desc', label: 'Terbaru dulu' },
  { value: 'asc', label: 'Terlama dulu' },
];

export const URUTAN_BAWAAN = 'desc';

/**
 * Bilah saringan halaman riwayat notifikasi.
 *
 * BARIS SENDIRI, bukan disisipkan ke baris pil status: pada 390px baris itu
 * sudah penuh -- "Tandai semua dibaca" pun sudah turun sendiri di sana.
 *
 * Kedua dropdown diberi label tampak. Tanpa label, satu-satunya penanda
 * dropdown adalah nilai aktifnya sendiri, dan dua dropdown bersebelahan yang
 * sama-sama berisi kata waktu ("Semua waktu" dan "Terbaru dulu") tak mungkin
 * dibedakan oleh pembaca layar.
 */
export default function NotificationFilterBar({
  rentang,
  urutan,
  onRentangChange,
  onUrutanChange,
  onReset,
}) {
  // Tombol reset yang selalu tampak padahal tak ada yang perlu direset hanya
  // menambah ramai pada bilah yang sudah padat di layar sempit.
  const adaSaringanAktif = rentang !== RENTANG_BAWAAN || urutan !== URUTAN_BAWAAN;

  return (
    <div className="flex flex-wrap items-end gap-sm mb-md">
      <div className="min-w-[170px]">
        <Dropdown
          id="saring-rentang-notifikasi"
          label="Rentang waktu"
          value={rentang}
          onChange={onRentangChange}
          options={RENTANG_WAKTU}
        />
      </div>
      <div className="min-w-[150px]">
        <Dropdown
          id="saring-urutan-notifikasi"
          label="Urutan"
          value={urutan}
          onChange={onUrutanChange}
          options={URUTAN_WAKTU}
        />
      </div>
      {adaSaringanAktif && <ResetFilterButton onReset={onReset} labelClassName="" />}
    </div>
  );
}
