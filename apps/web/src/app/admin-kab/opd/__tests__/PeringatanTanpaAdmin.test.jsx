import React from 'react';
import { render, screen } from '@testing-library/react';
import ManajemenOPDPage from '../page';
import api from '@/services/api';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

/**
 * RANTAI UTUH PERINGATAN "BELUM ADA ADMIN" (4 Oktober 2026, laporan pengguna:
 * "saya masih belum bisa melihat perubahannya").
 *
 * Uji yang sudah ada menjamin kedua UJUNGNYA: `opd.service.spec.ts` membuktikan
 * backend menghitung `adminCount`, dan `OPDTableTanpaAdmin.test.jsx` membuktikan
 * tabel menandai baris yang nol. Tak satu pun menjamin BAGIAN DI ANTARANYA --
 * `getOpdList` dan `adaptOpd` -- padahal di situlah nama medan dapat berubah
 * diam-diam dan hilang tanpa ada uji yang memerah.
 *
 * Berkas ini memakai muatan mentah yang DISALIN dari respons server sungguhan
 * (GET /api/v1/opd, diukur 4 Oktober 2026), bukan bentuk karangan: medan
 * backend berbahasa Indonesia (`nama`, `kode`) sementara komponen memakai
 * bahasa Inggris (`name`, `code`), dan penerjemahnya satu-satunya adalah
 * adapter yang ikut diuji di sini. Hanya `api.get` yang ditiru; service,
 * adapter, halaman, dan tabel semuanya yang asli.
 */
const barisMentah = (over = {}) => ({
  id: 77,
  externalId: '5748d6d0-2abb-4d67-b42b-b0ea87a5a46a',
  nama: 'BAGIAN ADMINISTRASI PEMBANGUNAN',
  kode: 'BAGIANADMI',
  jenisLayanan: null,
  penanggungJawab: null,
  isActive: true,
  syncedAt: '2026-09-30T06:52:40.986Z',
  createdAt: '2026-08-27T01:41:13.148Z',
  updatedAt: '2026-09-30T06:52:41.762Z',
  activeSurveys: 0,
  openComplaints: 0,
  adminCount: 0,
  ...over,
});

const jawab = (rows) =>
  api.get.mockResolvedValue({
    data: rows,
    meta: { pagination: { total: rows.length, page: 1, limit: 100, totalPages: 1 } },
  });

describe('Manajemen OPD — peringatan OPD tanpa admin, rantai utuh', () => {
  beforeEach(() => jest.clearAllMocks());

  it('menandai OPD tanpa admin dari muatan mentah backend', async () => {
    jawab([barisMentah()]);

    render(<ManajemenOPDPage />);

    expect(await screen.findByText('BAGIAN ADMINISTRASI PEMBANGUNAN')).toBeInTheDocument();
    expect(screen.getByText(/belum ada admin/i)).toBeInTheDocument();
  });

  it('tidak menandai OPD yang punya admin', async () => {
    jawab([barisMentah({ adminCount: 2 })]);

    render(<ManajemenOPDPage />);

    expect(await screen.findByText('BAGIAN ADMINISTRASI PEMBANGUNAN')).toBeInTheDocument();
    expect(screen.queryByText(/belum ada admin/i)).not.toBeInTheDocument();
  });

  /**
   * Inilah cacat yang berkas ini benar-benar dibuat untuk menangkapnya: backend
   * yang berhenti mengirim `adminCount` sama sekali. Kedua uji di atas tetap
   * berperilaku wajar, dan satu-satunya gejalanya adalah peringatan yang diam
   * -- persis keluhan yang memulai penelusuran ini.
   */
  it('tidak menuduh apa pun bila backend tak mengirim adminCount', async () => {
    const { adminCount: _dibuang, ...tanpaMedan } = barisMentah();
    jawab([tanpaMedan]);

    render(<ManajemenOPDPage />);

    expect(await screen.findByText('BAGIAN ADMINISTRASI PEMBANGUNAN')).toBeInTheDocument();
    expect(screen.queryByText(/belum ada admin/i)).not.toBeInTheDocument();
  });
});
