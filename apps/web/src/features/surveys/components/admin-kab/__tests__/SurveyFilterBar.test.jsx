import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyFilterBar from '../SurveyFilterBar';

/**
 * PENCARIAN OPD pada penyaring halaman Survei Admin Kabupaten (permintaan
 * pengguna 11 September 2026).
 *
 * Penyaring ini melihat SELURUH survei lintas OPD, jadi daftar OPD-nya sepanjang
 * jumlah instansi yang pernah membuat survei -- menuju 62 di basis data nyata.
 *
 * Perilaku penyaringannya sendiri diuji di components/ui/__tests__/
 * Dropdown.test.jsx. Yang diuji di sini dropdown MANA yang mendapatkannya.
 */
const OPD_OPTIONS = [
  { value: '', label: 'Semua OPD' },
  { value: '1', label: 'Dinas Kesehatan' },
  { value: '2', label: 'Dinas Pendidikan dan Kebudayaan' },
  { value: '3', label: 'Kecamatan Wonoasri' },
];

const FILTERS = { search: '', opd: '', status: '', periode: '' };

const render1 = (props = {}) =>
  render(
    <SurveyFilterBar
      filters={FILTERS}
      onFilterChange={jest.fn()}
      onResetFilters={jest.fn()}
      opdOptions={OPD_OPTIONS}
      periodeOptions={[
        { value: '', label: 'Semua Periode' },
        { value: '2026-Q3', label: '2026-Q3' },
      ]}
      {...props}
    />,
  );

// Penyaring ini TAK punya label maupun id -- pemicunya dikenali dari label
// pilihan yang sedang aktif.
const pemicu = (nama) => screen.getByRole('button', { name: nama });
// Nama persis, BUKAN /cari opd/i: medan pencarian bebas di bilah yang sama
// berpenampung "Cari judul survei atau OPD...", dan placeholder ikut menjadi
// nama aksesibilitas saat tak ada label. Regex longgar akan menangkap keduanya.
const medanCari = () => screen.queryByRole('textbox', { name: 'Cari OPD' });

describe('SurveyFilterBar — pencarian OPD', () => {
  it('dropdown OPD punya medan cari yang menyaring daftarnya', () => {
    render1();

    fireEvent.click(pemicu('Semua OPD'));
    fireEvent.change(medanCari(), { target: { value: 'pendidikan' } });

    expect(screen.getByRole('button', { name: 'Dinas Pendidikan dan Kebudayaan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dinas Kesehatan' })).not.toBeInTheDocument();
  });

  it('memilih hasil pencarian meneruskan id OPD-nya ke penyaring', () => {
    const onFilterChange = jest.fn();
    render1({ onFilterChange });

    fireEvent.click(pemicu('Semua OPD'));
    fireEvent.change(medanCari(), { target: { value: 'wono' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kecamatan Wonoasri' }));

    expect(onFilterChange).toHaveBeenCalledWith({ ...FILTERS, opd: '3' });
  });

  it('dropdown Status & Periode TIDAK ikut mendapat medan cari', () => {
    // Empat status dan segelintir periode. Medan cari di sana menambah langkah
    // tanpa menghemat satu pun gulir.
    render1();

    // Pemicunya DITANGKAP sebelum panel mana pun dibuka: begitu terbuka, label
    // pilihan yang sedang aktif muncul kedua kalinya sebagai tombol di dalam
    // daftar, dan pencarian berdasar nama menemukan dua elemen.
    const pemicuStatus = pemicu('Semua Status');
    const pemicuPeriode = pemicu('Semua Periode');

    fireEvent.click(pemicuStatus);
    expect(screen.queryByRole('textbox', { name: /^cari/i })).not.toBeInTheDocument();

    fireEvent.click(pemicuStatus);
    fireEvent.click(pemicuPeriode);
    expect(screen.queryByRole('textbox', { name: /^cari/i })).not.toBeInTheDocument();
  });

  it('tanpa satu pun OPD, medan carinya tidak muncul', () => {
    // Daftarnya diderivasi dari survei yang termuat. Sebelum ada survei sama
    // sekali, isinya cuma "Semua OPD" -- tak ada yang dapat dicari.
    render1({ opdOptions: [{ value: '', label: 'Semua OPD' }] });

    fireEvent.click(pemicu('Semua OPD'));

    expect(medanCari()).not.toBeInTheDocument();
  });
});

/**
 * TOMBOL SAMPAH MASUK KE BARIS TOMBOL (1 Oktober 2026, permintaan pengguna:
 * "pindahkan tombol sampah pada halaman monitoring survei kabupaten, sejajar
 * dengan tombol reset filter, buat survei, ekspor").
 *
 * Sebelumnya ia berdiri sendiri pada barisnya sendiri di atas kartu ringkasan,
 * `justify-end`, terpisah dari seluruh aksi lain halaman itu.
 *
 * DIRENDER DI SINI, BUKAN DIOPER SEBAGAI children, supaya urutannya tetap
 * menjadi urusan komponen baris tombol -- halaman pemanggil tak perlu tahu di
 * sebelah mana ia duduk, dan tak ada dua tempat yang harus mengingat hal sama.
 *
 * BARIS INI SUDAH SEMPIT, dan itu terukur: komentar di komponennya mencatat
 * empat tombol menuntut 314px sementara layar 320px hanya menyediakan 222px --
 * sebabnya `flex-wrap` dipasang 1 September 2026. Tombol kelima akan membungkus
 * ke baris kedua di ponsel, dan itu perilaku yang memang sudah dirancang.
 */
describe('SurveyFilterBar — tautan Sampah', () => {
  it('tautan Sampah ada di dalam baris tombol', () => {
    render1();

    expect(screen.getByRole('link', { name: /sampah/i })).toHaveAttribute(
      'href',
      '/admin-kab/surveys/sampah',
    );
  });

  it('duduk dalam wadah yang sama dengan Reset Filter dan Buat Survei', () => {
    // Inilah isi permintaannya: "sejajar dengan". Memastikan tautannya ADA saja
    // akan tetap hijau walau ia kembali berdiri sendiri di barisnya sendiri.
    render1();

    const sampah = screen.getByRole('link', { name: /sampah/i });
    const buat = screen.getByRole('button', { name: /buat survei/i });

    expect(sampah.parentElement).toBe(buat.parentElement);
  });

  it('KONTROL: tombol lama tetap ada di baris itu', () => {
    render1();

    expect(screen.getByRole('button', { name: /buat survei/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ekspor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});
