import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyFormModal from '../SurveyFormModal';

/**
 * PENCARIAN OPD pada modal Buat Survei Admin Kabupaten (11 September 2026).
 *
 * Daftar di sini BUKAN daftar yang diderivasi seperti pada penyaring, melainkan
 * SELURUH OPD aktif -- 62 di basis data nyata. Justru inilah dropdown OPD
 * terpanjang di halaman itu.
 */
const OPD_OPTIONS = [
  { value: '', label: 'Pilih OPD penyelenggara' },
  { value: '1', label: 'Dinas Kesehatan' },
  { value: '2', label: 'Dinas Pendidikan dan Kebudayaan' },
  { value: '3', label: 'Kecamatan Wonoasri' },
];

const render1 = (props = {}) =>
  render(
    <SurveyFormModal
      mode="create"
      opdOptions={OPD_OPTIONS}
      onSubmit={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );

const medanCari = () => screen.queryByRole('textbox', { name: /cari opd penyelenggara/i });

describe('SurveyFormModal — pencarian OPD', () => {
  it('dropdown OPD punya medan cari yang menyaring daftarnya', () => {
    render1();

    fireEvent.click(screen.getByLabelText(/opd penyelenggara/i));
    fireEvent.change(medanCari(), { target: { value: 'wono' } });

    expect(screen.getByRole('button', { name: 'Kecamatan Wonoasri' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dinas Kesehatan' })).not.toBeInTheDocument();
  });

  it('daftar pilihannya DIPENDEKKAN saat medan cari menyala', () => {
    // Bukan detail kosmetik. `menuMaxHeight` di modal ini memang dipendekkan
    // supaya daftar yang mengapung tak menimpa tombol "Batal"/"Buat Survei" di
    // footer. Kepala pencarian menambah ~61px DI ATAS daftar, jadi tanpa
    // pemendekan lanjutan panel totalnya justru melewati batas yang dulu
    // dihitung -- persis cacat yang batas itu ada untuk mencegahnya.
    render1();

    fireEvent.click(screen.getByLabelText(/opd penyelenggara/i));

    const daftar = document.querySelector('ul');
    expect(daftar.className).toContain('max-h-[140px]');
    expect(daftar.className).not.toContain('max-h-[200px]');
  });

  it('dropdown Triwulan & Tahun TIDAK ikut mendapat medan cari', () => {
    render1();

    fireEvent.click(screen.getByLabelText(/triwulan/i));
    expect(screen.queryByRole('textbox', { name: /^cari/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/triwulan/i));
    fireEvent.click(screen.getByLabelText(/tahun/i));
    expect(screen.queryByRole('textbox', { name: /^cari/i })).not.toBeInTheDocument();
  });

  it('pada mode ubah, OPD-nya teks mati -- tak ada dropdown maupun medan cari', () => {
    // Survei tak dapat dipindah OPD sesudah dibuat (UpdateSurveyDto tak punya
    // field itu), jadi di mode ubah memang tak ada yang perlu dicari.
    render1({
      mode: 'edit',
      initialValues: { title: 'Survei Contoh', period: '2026-Q3', opdId: 1 },
      opdName: 'Dinas Kesehatan',
    });

    expect(medanCari()).not.toBeInTheDocument();
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
  });
});
