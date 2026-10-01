import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SurveyResponsesTable from '../SurveyResponsesTable';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

/**
 * KOLOM PENGISI (1 Oktober 2026, laporan pengguna: "data responden bukan anonim
 * belum tampil ketika menjawab survei").
 *
 * Datanya sudah tersimpan sejak 8 September 2026 dan tak pernah dibaca siapa
 * pun; backend serta adapter membukanya pada tanggal yang sama dengan berkas
 * ini. Pengguna memilih agar namanya muncul di DAFTAR, bukan hanya di detail.
 *
 * YANG PALING DIJAGA DI SINI bukan munculnya nama, melainkan bahwa respons yang
 * pengisinya MEMILIH anonim tidak ikut terbuka. Membuka kolom ini dan
 * membocorkan orang yang memilih tidak memberi datanya terlihat sama saja dari
 * luar; hanya uji yang memisahkan keduanya.
 */
const baris = (tambahan = {}) => ({
  id: 1,
  submittedAt: '2026-10-01T03:00:00.000Z',
  averageScore: 3.5,
  respondent: {
    name: 'Siti Aminah',
    phone: '081234567890',
    gender: 'perempuan',
    ageGroup: '26-35',
    isAnonim: false,
  },
  ...tambahan,
});

const render1 = (responses) =>
  render(<SurveyResponsesTable responses={responses} surveyId={3} basePath="/admin-opd/surveys" />);

const judulKolom = () => screen.getAllByRole('columnheader').map((th) => th.textContent.trim());

describe('SurveyResponsesTable — kolom pengisi', () => {
  it('kolomnya ada', () => {
    render1([baris()]);

    expect(judulKolom()).toContain('Pengisi');
  });

  it('menampilkan nama pengisi yang memberi datanya', () => {
    render1([baris()]);

    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
  });

  it('KONTROL: pengisi anonim tidak membocorkan satu pun medannya', () => {
    render1([
      baris({
        id: 2,
        respondent: { name: null, phone: null, gender: null, ageGroup: null, isAnonim: true },
      }),
    ]);

    const tabel = within(screen.getByRole('table'));
    expect(tabel.getByText(/anonim/i)).toBeInTheDocument();
    expect(screen.queryByText('Siti Aminah')).not.toBeInTheDocument();
    expect(screen.queryByText('081234567890')).not.toBeInTheDocument();
  });

  it('KONTROL: nomor HP TIDAK dipajang di daftar', () => {
    // Daftar dipakai memindai banyak baris sekaligus. Nomor telepon di sana
    // memajang data hubung puluhan orang pada satu layar sekali lihat, padahal
    // yang dibutuhkan untuk memindai hanya namanya. Nomornya tetap terbaca di
    // halaman detail, satu orang pada satu waktu.
    render1([baris()]);

    expect(screen.queryByText('081234567890')).not.toBeInTheDocument();
  });

  it('baris lama tanpa data pengisi tidak meledak', () => {
    render1([{ id: 3, submittedAt: '2026-10-01T03:00:00.000Z', averageScore: null }]);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('KONTROL: kolom lama tetap ada', () => {
    // Tanpa ini, mengganti seluruh kepala tabel akan membuat uji di atas hijau.
    render1([baris()]);

    const judul = judulKolom();
    expect(judul).toContain('Respons');
    expect(judul).toContain('Waktu Pengisian');
    expect(judul).toContain('Nilai Rata-Rata');
  });
});
