import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ComplaintFilterBar from '../ComplaintFilterBar';

/**
 * PENCARIAN OPD pada penyaring halaman Pengaduan Admin Kabupaten (permintaan
 * pengguna 11 September 2026). Pasangan SurveyFilterBar.test.jsx -- kedua
 * halaman monitoring itu memang sengaja dibuat satu keluarga.
 */
const OPD_OPTIONS = [
  { value: '', label: 'Semua OPD' },
  { value: 'tanpa-tujuan', label: 'Belum bertujuan' },
  { value: '1', label: 'Dinas Kesehatan' },
  { value: '2', label: 'Dinas Pendidikan dan Kebudayaan' },
  { value: '3', label: 'Kecamatan Wonoasri' },
];

const FILTERS = { search: '', opd: '', status: '', kategori: '' };

const render1 = (props = {}) =>
  render(
    <ComplaintFilterBar
      filters={FILTERS}
      onFilterChange={jest.fn()}
      onResetFilters={jest.fn()}
      opdOptions={OPD_OPTIONS}
      categoryOptions={[
        { value: '', label: 'Semua Kategori' },
        { value: 'aduan', label: 'Aduan' },
      ]}
      {...props}
    />,
  );

const pemicu = (nama) => screen.getByRole('button', { name: nama });
// Nama persis: pencarian bebas di bilah yang sama berpenampung "Cari nomor
// tiket, judul, pelapor...", dan placeholder ikut jadi nama aksesibilitas.
const medanCari = () => screen.queryByRole('textbox', { name: 'Cari OPD' });

describe('ComplaintFilterBar — pencarian OPD', () => {
  it('dropdown OPD punya medan cari yang menyaring daftarnya', () => {
    render1();

    fireEvent.click(pemicu('Semua OPD'));
    fireEvent.change(medanCari(), { target: { value: 'kesehatan' } });

    expect(screen.getByRole('button', { name: 'Dinas Kesehatan' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Dinas Pendidikan dan Kebudayaan' }),
    ).not.toBeInTheDocument();
    // "Belum bertujuan" ikut tersaring. Ia menumpang penyaring OPD (6 September
    // 2026) tetapi bukan nama instansi, jadi menyisakannya di antara hasil
    // pencarian nama instansi justru menyesatkan.
    expect(screen.queryByRole('button', { name: 'Belum bertujuan' })).not.toBeInTheDocument();
  });

  it('memilih hasil pencarian meneruskan id OPD-nya ke penyaring', () => {
    const onFilterChange = jest.fn();
    render1({ onFilterChange });

    fireEvent.click(pemicu('Semua OPD'));
    fireEvent.change(medanCari(), { target: { value: 'wono' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kecamatan Wonoasri' }));

    expect(onFilterChange).toHaveBeenCalledWith({ ...FILTERS, opd: '3' });
  });

  it('dropdown Status & Kategori TIDAK ikut mendapat medan cari', () => {
    render1();

    // Pemicunya DITANGKAP sebelum panel mana pun dibuka: begitu terbuka, label
    // pilihan yang sedang aktif muncul kedua kalinya sebagai tombol di dalam
    // daftar, dan pencarian berdasar nama menemukan dua elemen.
    const pemicuStatus = pemicu('Semua Status');
    const pemicuKategori = pemicu('Semua Kategori');

    fireEvent.click(pemicuStatus);
    expect(screen.queryByRole('textbox', { name: /^cari/i })).not.toBeInTheDocument();

    fireEvent.click(pemicuStatus);
    fireEvent.click(pemicuKategori);
    expect(screen.queryByRole('textbox', { name: /^cari/i })).not.toBeInTheDocument();
  });

  it('tanpa satu pun OPD, medan carinya tidak muncul', () => {
    render1({ opdOptions: [{ value: '', label: 'Semua OPD' }] });

    fireEvent.click(pemicu('Semua OPD'));

    expect(medanCari()).not.toBeInTheDocument();
  });
});
