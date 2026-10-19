import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminKabLayoutProvider, useAdminKabLayout } from '../AdminKabLayoutProvider';

/**
 * NILAI AWAL `periode` = TAHUN BERJALAN (6 Oktober 2026).
 *
 * Sebelumnya string kosong, dengan alasan tersurat di docblock provider-nya:
 * mempersempit dashboard lintas-OPD harus menjadi tindakan sadar pengguna.
 * Alasan itu TIDAK SALAH; ia hanya tak bertahan terhadap keputusan berikutnya.
 * Sejak penyaring periode dipisah menjadi Tahun + Triwulan, pemilik produk
 * menetapkan tahun WAJIB terisi -- dan penyaring tahun yang wajib tak dapat
 * sekaligus berarti "tanpa penyaring".
 *
 * Yang dijaga uji ini bukan selera, melainkan supaya layarnya tidak berbohong:
 * tanpa nilai awal, `PenyaringPeriode` menggambar suatu tahun sambil induknya
 * memegang string kosong, dan dashboard menyatakan dua hal bertentangan
 * sekaligus. Diukur di /admin-kab/dashboard: dropdown "2027", keterangan
 * "Penyaring navbar aktif: semua periode".
 */
function Pembaca() {
  const { periode } = useAdminKabLayout();
  return <span data-testid="periode">{periode || '(kosong)'}</span>;
}

describe('AdminKabLayoutProvider — nilai awal periode', () => {
  it('terbuka pada tahun berjalan, bukan string kosong', () => {
    render(
      <AdminKabLayoutProvider>
        <Pembaca />
      </AdminKabLayoutProvider>,
    );

    expect(screen.getByTestId('periode')).toHaveTextContent(String(new Date().getFullYear()));
  });

  it('tanpa triwulan: tahun saja, bukan triwulan berjalan', () => {
    // Berbeda dari Admin OPD, yang memang terbuka pada triwulan berjalan.
    // Dashboard Kabupaten melingkupi seluruh OPD; triwulan berjalan di sana
    // sering belum punya satu pun survei tertutup.
    render(
      <AdminKabLayoutProvider>
        <Pembaca />
      </AdminKabLayoutProvider>,
    );

    expect(screen.getByTestId('periode').textContent).not.toMatch(/-Q\d/);
  });
});
