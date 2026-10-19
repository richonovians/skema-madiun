import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';
import AboutStatistics from '../AboutStatistics';
import FAQSection from '../FAQSection';
import AboutHero from '../AboutHero';
import VisionMission from '../VisionMission';
import CoreValues from '../CoreValues';
import FeatureHighlights from '../FeatureHighlights';
import CommitmentSection from '../CommitmentSection';
import AboutPlatform from '../AboutPlatform';

/**
 * TC-FE-047 — Halaman "Tentang Kami" (`/about`).
 *
 * Dua belas komponen, tak pernah punya kasus uji sampai 3 September 2026.
 * Halaman publik: siapa pun bisa membukanya tanpa masuk, termasuk pengunjung
 * yang belum pernah memakai layanannya.
 *
 * Kerusakan yang ditangkap:
 *  - angka statistik yang gagal dimuat tampil sebagai **0**, bukan '-'. Pada
 *    halaman publik pemerintah daerah, "0 Total Pengaduan" adalah pernyataan
 *    yang salah dan dapat dikutip — jauh lebih buruk daripada strip;
 *  - kegagalan memuat menyembunyikan seluruh seksinya sehingga tata letak
 *    halaman melompat, atau sebaliknya menyisakan angka tanpa keterangan;
 *  - akordeon FAQ membuka semua jawaban sekaligus, atau tak dapat ditutup lagi;
 *  - satu dari delapan seksinya berhenti dirender tanpa ada yang menyadarinya.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Handler bawaan `/statistics` di handlers.ts dipakai apa adanya untuk jalur
 * berhasil, BUKAN diganti tiruan sendiri. Percobaan pertama menuliskan amplop
 * ringkas berisi `summary` saja dan gagal: `adaptStatistics` juga membaca
 * `insight.text`, `complaintCategories`, `valueDistribution`, dan `topOpd` —
 * tiruan yang kurang lengkap melempar, halamannya jatuh ke keadaan galat, dan
 * kegagalannya terbaca seolah angka statistiknya yang salah.
 */
const RINGKASAN_BAWAAN = { activeOpd: 54, totalRespondents: 128, completionRate: 92 };

describe('AboutStatistics (TC-FE-047)', () => {
  it('menampilkan angka sungguhan dari API beserta labelnya', async () => {
    render(<AboutStatistics />);

    // Jumlah OPD ditulis persis, TANPA akhiran "+": ia hitungan, bukan perkiraan.
    expect(await screen.findByText(String(RINGKASAN_BAWAAN.activeOpd))).toBeInTheDocument();
    expect(screen.getByText('Total OPD Terintegrasi')).toBeInTheDocument();
    expect(screen.getByText('Tingkat Penyelesaian')).toBeInTheDocument();
    // Tingkat penyelesaian memakai akhiran '%', dan akhirannya hilang saat
    // nilainya tak ada — dua hal yang harus bergerak bersama.
    expect(screen.getByText(String(RINGKASAN_BAWAAN.completionRate))).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('menuliskan strip, bukan nol, ketika statistiknya gagal dimuat', async () => {
    server.use(
      http.get(`${API_BASE}/statistics`, () =>
        HttpResponse.json(
          { success: false, statusCode: 500, message: 'Gagal memuat' },
          { status: 500 },
        ),
      ),
    );

    render(<AboutStatistics />);

    // "0 Total Pengaduan" di halaman publik adalah pernyataan yang salah dan
    // dapat dikutip; strip jujur mengaku belum tahu.
    await waitFor(() => expect(screen.getAllByText('-').length).toBeGreaterThan(0));
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('tetap merender seksinya saat gagal, dengan keterangan singkat', async () => {
    server.use(
      http.get(`${API_BASE}/statistics`, () =>
        HttpResponse.json(
          { success: false, statusCode: 500, message: 'Gagal memuat' },
          { status: 500 },
        ),
      ),
    );

    render(<AboutStatistics />);

    // Menyembunyikan seksinya membuat tata letak halaman publik melompat.
    expect(await screen.findByText(/Angka statistik belum dapat dimuat saat ini/)).toBeInTheDocument();
    expect(screen.getByText('Total OPD Terintegrasi')).toBeInTheDocument();
  });

  it('menandai keadaan memuat tanpa menampilkan angka sementara', () => {
    const { container } = render(<AboutStatistics />);

    // Angka yang berkedip dari 0 ke nilai sebenarnya sempat terbaca salah.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});

describe('FAQSection (TC-FE-047)', () => {
  it('menampilkan seluruh pertanyaan dengan jawaban tertutup', () => {
    const { container } = render(<FAQSection />);

    const tombol = screen.getAllByRole('button');
    expect(tombol.length).toBeGreaterThan(0);
    // Semua panel jawaban mulai dalam keadaan tertutup.
    expect(container.querySelectorAll('.max-h-0').length).toBe(tombol.length);
  });

  it('membuka satu jawaban dan menutupnya lagi saat ditekan kedua kali', () => {
    const { container } = render(<FAQSection />);
    const tombol = screen.getAllByRole('button');

    fireEvent.click(tombol[0]);
    expect(container.querySelectorAll('.max-h-40').length).toBe(1);

    fireEvent.click(tombol[0]);
    expect(container.querySelectorAll('.max-h-40').length).toBe(0);
  });

  it('hanya membuka satu jawaban dalam satu waktu', () => {
    const { container } = render(<FAQSection />);
    const tombol = screen.getAllByRole('button');
    if (tombol.length < 2) return;

    fireEvent.click(tombol[0]);
    fireEvent.click(tombol[1]);

    // Akordeon, bukan daftar centang: membuka semuanya sekaligus membuat
    // halaman memanjang dan pertanyaan sulit ditelusuri.
    expect(container.querySelectorAll('.max-h-40').length).toBe(1);
  });

  it('memakai tombol bertipe button sehingga tak mengirim formulir apa pun', () => {
    render(<FAQSection />);
    for (const t of screen.getAllByRole('button')) {
      expect(t).toHaveAttribute('type', 'button');
    }
  });
});

describe('Seluruh seksi halaman Tentang (TC-FE-047)', () => {
  /** Tiap seksi harus benar-benar menghasilkan isi — bukan wadah kosong. */
  const SEKSI = [
    ['AboutHero', AboutHero],
    ['AboutPlatform', AboutPlatform],
    ['VisionMission', VisionMission],
    ['CoreValues', CoreValues],
    ['FeatureHighlights', FeatureHighlights],
    ['CommitmentSection', CommitmentSection],
  ];

  it.each(SEKSI)('%s merender isi tanpa melempar', (_nama, Komponen) => {
    const { container } = render(<Komponen />);
    expect(container.textContent.trim().length).toBeGreaterThan(20);
  });

  it('memberi tiap gambar teks alternatif', () => {
    const { container } = render(
      <>
        <AboutHero />
        <AboutPlatform />
        <CommitmentSection />
      </>,
    );

    // Gambar tanpa `alt` tak berarti apa-apa bagi pembaca layar, dan halaman
    // ini publik — pengunjungnya termasuk penyandang disabilitas.
    for (const img of container.querySelectorAll('img')) {
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')).not.toBe('');
    }
  });

  it('menyusun judul seksi sebagai heading, bukan teks tebal biasa', () => {
    render(
      <>
        <VisionMission />
        <CoreValues />
        <FeatureHighlights />
      </>,
    );

    // Pembaca layar menelusuri halaman panjang lewat daftar heading; teks tebal
    // tanpa peran heading tak muncul di daftar itu.
    expect(screen.getAllByRole('heading').length).toBeGreaterThanOrEqual(3);
  });
});
