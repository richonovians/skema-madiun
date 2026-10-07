import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PenyaringPeriode from '../PenyaringPeriode';

/**
 * DUA DROPDOWN, SATU NILAI (6 Oktober 2026, permintaan pengguna: "ubah dropdown
 * periode menjadi pisah antara triwulan dan tahun berbeda dropdown").
 *
 * Tahun WAJIB terisi, triwulan boleh "Semua Triwulan". Pilihan itu diambil
 * pengguna sendiri saat desainnya disajikan: alternatifnya -- dua-duanya boleh
 * "Semua" -- melahirkan kombinasi "semua tahun, Triwulan II" yang tak dapat
 * dinyatakan format periode mana pun, sehingga harus ditolak atau diabaikan
 * diam-diam, dan keduanya membingungkan.
 */
const TAHUN = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
];

const sajikan = (props = {}) =>
  render(
    <PenyaringPeriode
      value={props.value ?? '2026-Q2'}
      onChange={props.onChange ?? jest.fn()}
      tahunOptions={props.tahunOptions ?? TAHUN}
    />,
  );

const bukaTahun = () => fireEvent.click(screen.getByLabelText('Tahun'));
const bukaTriwulan = () => fireEvent.click(screen.getByLabelText('Triwulan'));
const pilih = (nama) => fireEvent.click(screen.getByRole('button', { name: nama }));

describe('PenyaringPeriode', () => {
  it('menggambar DUA dropdown, bukan satu gabungan', () => {
    sajikan();

    expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
    expect(screen.getByLabelText('Triwulan')).toBeInTheDocument();
  });

  it('mengganti triwulan menyusun ulang nilai kanoniknya', () => {
    const onChange = jest.fn();
    sajikan({ onChange });

    bukaTriwulan();
    pilih('Triwulan IV');

    expect(onChange).toHaveBeenLastCalledWith('2026-Q4');
  });

  it('mengganti tahun MEMPERTAHANKAN triwulan yang sedang dipilih', () => {
    // Mengganti tahun lalu diam-diam kembali ke Triwulan I akan memindahkan
    // pengguna ke periode yang tak pernah ia minta.
    const onChange = jest.fn();
    sajikan({ onChange, value: '2026-Q3' });

    bukaTahun();
    pilih('2025');

    expect(onChange).toHaveBeenLastCalledWith('2025-Q3');
  });

  it('"Semua Triwulan" menghasilkan tahun saja', () => {
    const onChange = jest.fn();
    sajikan({ onChange });

    bukaTriwulan();
    pilih('Semua Triwulan');

    expect(onChange).toHaveBeenLastCalledWith('2026');
  });

  it('nilai berupa tahun saja menampilkan "Semua Triwulan" sebagai pilihan aktif', () => {
    sajikan({ value: '2026' });

    expect(screen.getByLabelText('Triwulan')).toHaveTextContent('Semua Triwulan');
  });

  it('mengganti tahun ketika triwulan "Semua" tetap menghasilkan tahun saja', () => {
    const onChange = jest.fn();
    sajikan({ onChange, value: '2026' });

    bukaTahun();
    pilih('2025');

    expect(onChange).toHaveBeenLastCalledWith('2025');
  });

  it('kedua labelnya sr-only, tetapi namanya tetap terbaca', () => {
    // Labelnya blok DI ATAS kontrol, dan tetangganya di navbar tak berlabel:
    // kedua dropdown terdorong turun dan menonjol keluar dari tinggi bilah.
    // Disembunyikan, TIDAK dibuang -- `getByLabelText` di seluruh berkas ini
    // bergantung pada namanya, dan begitu pula pembaca layar.
    const { container } = sajikan();

    expect(container.querySelector('label[for="filter-periode-tahun"]')).toHaveClass('sr-only');
    expect(container.querySelector('label[for="filter-periode-triwulan"]')).toHaveClass('sr-only');
    expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
    expect(screen.getByLabelText('Triwulan')).toBeInTheDocument();
  });

  it('dropdown Triwulan punya lantai lebar, Tahun tidak', () => {
    // Terukur di navbar Admin Kabupaten: teksnya terpotong menjadi
    // "Semua Tri...". `truncate` memotong tanpa memerahkan apa pun, jadi
    // lantai lebarnya harus dinyatakan tersurat.
    //
    // "Semua Triwulan" pada `text-body-md` (16px) butuh ~112px teks, ditambah
    // padding 2x16px dan chevron 20px = ~164px. Angka pastinya boleh berubah;
    // yang dijaga uji ini adalah ADANYA lantai yang cukup.
    //
    // Tahun sengaja TANPA lantai: "2026" selalu pendek, dan lantai di sana
    // hanya mencuri ruang dari tetangganya di bilah yang sempit.
    const { container } = sajikan();

    const bungkusTriwulan = container.querySelector('#filter-periode-triwulan').parentElement;
    const bungkusTahun = container.querySelector('#filter-periode-tahun').parentElement;

    const px = (kelas) => Number(/min-w-\[(\d+)px\]/.exec(kelas)?.[1] ?? 0);

    expect(px(bungkusTriwulan.className)).toBeGreaterThanOrEqual(160);
    expect(px(bungkusTahun.className)).toBe(0);
  });

  /**
   * JATUH-TEMPO TAK BOLEH BERBOHONG (6 Oktober 2026, cacat yang ditemukan
   * sendiri saat memotret /admin-kab/dashboard, bukan diminta pengguna).
   *
   * Terukur di layar: penyaringnya menampilkan "2027" sementara kotak
   * keterangan tepat di bawahnya berbunyi "Penyaring navbar aktif: semua
   * periode". Dua pernyataan yang bertentangan pada satu layar.
   *
   * Dua sebabnya terpisah, dan keduanya diuji di bawah:
   *   1. jatuh-temponya memakai `tahunOptions[0]`, dan `buildTahunOptions()`
   *      memuat satu triwulan KE DEPAN -- di Q4 2026 pilihan teratasnya 2027,
   *      tahun yang belum punya satu pun baris data;
   *   2. jatuh-temponya hanya untuk TAMPILAN. Induknya tak pernah diberi tahu,
   *      sehingga angka di layar bukan angka yang menyaring.
   */
  it('jatuh-tempo memilih tahun BERJALAN, bukan tahun teratas yang di masa depan', () => {
    const onChange = jest.fn();
    const tahunIni = String(new Date().getFullYear());
    const tahunDepan = String(new Date().getFullYear() + 1);

    render(
      <PenyaringPeriode
        value=""
        onChange={onChange}
        tahunOptions={[
          { value: tahunDepan, label: tahunDepan },
          { value: tahunIni, label: tahunIni },
        ]}
      />,
    );

    expect(screen.getByLabelText('Tahun')).toHaveTextContent(tahunIni);
  });

  it('jatuh-tempo DILAPORKAN ke induk, bukan hanya digambar', () => {
    // Tanpa ini, layar menunjukkan satu tahun sementara yang benar-benar
    // dipakai menyaring adalah string kosong.
    const onChange = jest.fn();
    sajikan({ onChange, value: '' });

    expect(onChange).toHaveBeenCalledWith('2026');
  });

  it('nilai yang SUDAH terisi tidak ditimpa jatuh-tempo', () => {
    // Pasangan kontrol: laporan di atas hanya boleh terjadi saat nilainya
    // kosong. Menimpa nilai yang sudah ada akan memindahkan pengguna dari
    // periode yang baru saja ia pilih.
    const onChange = jest.fn();
    sajikan({ onChange, value: '2025-Q1' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('nilai kosong tetap menghasilkan periode bertahun, bukan `NaN`', () => {
    // Tahun WAJIB terisi. Versi pertama uji ini hanya memeriksa teks dropdown
    // Tahun, dan itu HAMPA: `Dropdown` menampilkan pilihan pertamanya terlepas
    // dari ada tidaknya jatuh-tempo di komponen ini. Yang benar-benar
    // membedakan adalah nilai yang dilaporkan saat triwulan diganti --
    // tanpa jatuh-tempo, hasilnya `NaN-Q2`.
    const onChange = jest.fn();
    sajikan({ onChange, value: '' });

    bukaTriwulan();
    pilih('Triwulan II');

    expect(onChange).toHaveBeenLastCalledWith('2026-Q2');
  });
});
