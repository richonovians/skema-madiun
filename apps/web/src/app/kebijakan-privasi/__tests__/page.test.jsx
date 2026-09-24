import React from 'react';
import { render, screen } from '@testing-library/react';
import KebijakanPrivasi from '../page';
import Footer from '@/components/layouts/Footer';
import ConsentGate from '@/features/authentication/components/ConsentGate';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/features/authentication/services/sso.api', () => ({
  authApi: { logout: jest.fn(), setujuiPdp: jest.fn() },
}));
jest.mock('@/features/authentication/services/authStorage', () => ({
  saveConsentFlag: jest.fn(),
  clearSession: jest.fn(),
}));

/**
 * KEBIJAKAN PRIVASI (25 September 2026).
 *
 * Gerbang persetujuan sudah memuat empat butir yang substantif, tetapi teksnya
 * HANYA muncul di gerbang: warga yang sudah menyetujui tak punya cara
 * membacanya lagi, dan tak ada alamat yang dapat ditaut dari footer maupun
 * dirujuk saat ada sengketa. Halaman ini tempat tinggalnya.
 *
 * DUA PENEGASAN DI BAWAH ADALAH YANG PALING PENTING, dan keduanya menjaga
 * kejujuran, bukan tata letak:
 *
 * 1. Bagian retensi WAJIB menyatakan bahwa angkanya masih USULAN yang menunggu
 *    penetapan Diskominfo. Angka itu tidak pernah diputuskan siapa pun.
 *    Menerbitkannya tanpa penanda membuat Pemerintah Kabupaten Madiun
 *    menyatakan sesuatu yang tak pernah diputuskannya. Bila suatu saat
 *    penandanya dibuang sementara angkanya belum disahkan, uji ini memerah.
 *
 * 2. Alamat pelaporan harus NYATA. Gerbang persetujuan menyuruh "menghubungi
 *    Admin Kabupaten melalui kanal resmi Diskominfo" tanpa menyebut kanalnya
 *    apa, sehingga hak yang dijanjikan tak punya jalan.
 */
const ALAMAT = 'diskominfo@madiunkab.go.id';

describe('halaman kebijakan privasi', () => {
  it('memakai satu h1 yang menamai isinya', () => {
    render(<KebijakanPrivasi />);

    expect(screen.getByRole('heading', { level: 1, name: /kebijakan privasi/i })).toBeInTheDocument();
  });

  it.each([
    ['pengendali data', /pengendali data/i],
    ['data yang dikumpulkan', /data yang (kami )?kumpulkan/i],
    ['tujuan', /tujuan/i],
    ['dasar hukum', /dasar (hukum|pemrosesan)/i],
    ['masa simpan', /masa simpan|retensi/i],
    ['hak warga', /hak anda/i],
    ['keamanan', /keamanan/i],
  ])('memuat bagian %s', (_nama, pola) => {
    render(<KebijakanPrivasi />);

    expect(screen.getByRole('heading', { name: pola })).toBeInTheDocument();
  });

  it('MENYATAKAN masa simpan masih usulan yang belum ditetapkan', () => {
    render(<KebijakanPrivasi />);

    // `getAllBy`, bukan `getBy`: yang dijaga adalah halaman ini MENYATAKANNYA,
    // bukan menyatakannya tepat sekali. Kalimatnya memang muncul lebih dari
    // sekali dan sebagiannya dibungkus <strong>, dan keduanya sama-sama benar.
    expect(screen.getAllByText(/belum ditetapkan|masih berupa usulan/i).length).toBeGreaterThan(0);
  });

  it('menyebut alamat yang nyata untuk menggunakan hak', () => {
    render(<KebijakanPrivasi />);

    expect(screen.getAllByText(new RegExp(ALAMAT, 'i')).length).toBeGreaterThan(0);
  });

  it('menyebut UU 27/2022 sebagai dasarnya', () => {
    render(<KebijakanPrivasi />);

    expect(screen.getByText(/27 tahun 2022/i)).toBeInTheDocument();
  });

  it('TIDAK menjanjikan basis data terenkripsi seluruhnya', () => {
    // Yang terenkripsi hanya lampiran, `complaints.uraian`, dan
    // `complaint_replies.pesan`. Identitas pelapor tidak. Klaim berlebih di
    // halaman hukum lebih buruk daripada tak mengklaim apa pun.
    render(<KebijakanPrivasi />);

    expect(screen.queryByText(/seluruh data (Anda )?terenkripsi/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/basis data terenkripsi sepenuhnya/i);
  });
});

describe('jalan menuju kebijakan privasi', () => {
  it('footer menautnya', () => {
    // Tanpa tautan permanen, halaman ini ada tetapi tak dapat ditemukan --
    // persis masalah yang hendak diperbaikinya.
    render(<Footer />);

    expect(screen.getByRole('link', { name: /kebijakan privasi/i })).toHaveAttribute(
      'href',
      '/kebijakan-privasi',
    );
  });

  it('gerbang persetujuan menautnya, di tempat keputusannya diambil', () => {
    // Persetujuan yang bebas menuntut kesempatan membaca keterangan lengkapnya
    // SEBELUM mencentang, bukan sesudah. Empat butir ringkas di gerbang itu
    // ringkasan, dan ringkasan harus dapat ditelusuri ke sumbernya.
    render(<ConsentGate />);

    expect(screen.getByRole('link', { name: /kebijakan privasi/i })).toHaveAttribute(
      'href',
      '/kebijakan-privasi',
    );
  });
});
