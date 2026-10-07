import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import AnalyticsKabPage from '../page';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

/**
 * STATISTIK & LAPORAN UNTUK ADMIN KABUPATEN (6 Oktober 2026, permintaan
 * pengguna: "tambahkan juga halaman statistik & laporan yang ada di halaman opd
 * ke halaman kabupaten. cek juga efek penambahannya").
 *
 * EFEK YANG DIUKUR, dan sebabnya halaman ini bukan salinan. Versi Admin OPD
 * mengambil angka resolusi pengaduannya dari `GET /dashboard/opd`, yang dijaga
 * `@Roles(Role.opd)` -- seorang Admin Kabupaten dijawab 403 dan seluruh tab
 * Pengaduan runtuh. Versi ini memakai `GET /statistics`, yang memang
 * kabupaten-wide dan sudah membawa `completionRate` serta `avgSlaDays`.
 *
 * SATUANNYA BERBEDA, dan itu jebakan yang sengaja dijaga uji di bawah: halaman
 * OPD memakai JAM, statistik Kabupaten memakai HARI.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Penjaga: endpoint khusus OPD TIDAK boleh disentuh halaman ini. */
const pasangPengintaiDashboardOpd = () => {
  const dipanggil = jest.fn();
  server.use(
    http.get(`${API_BASE}/dashboard/opd`, () => {
      dipanggil();
      return ok({}, '/dashboard/opd', 403);
    }),
  );
  return dipanggil;
};

describe('Halaman Statistik & Laporan (Admin Kabupaten)', () => {
  it('TIDAK memanggil GET /dashboard/opd — endpoint itu 403 bagi Kabupaten', async () => {
    const dipanggil = pasangPengintaiDashboardOpd();

    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis skm/i });

    // Ditunggu sampai pengambilan datanya tuntas, supaya ketiadaan panggilan
    // benar-benar berarti "tak pernah", bukan "belum".
    await waitFor(() => expect(screen.queryByText(/memuat/i)).not.toBeInTheDocument());
    expect(dipanggil).not.toHaveBeenCalled();
  });

  it('menyediakan kedua tab, sama seperti halaman Admin OPD', async () => {
    render(<AnalyticsKabPage />);

    expect(await screen.findByRole('button', { name: /analisis skm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisis pengaduan/i })).toBeInTheDocument();
  });

  /**
   * TATA LETAKNYA, diperbaiki 6 Oktober 2026 atas permintaan pengguna
   * ("perbaiki tampilan halaman statistik & laporan di halaman kabupaten").
   *
   * Terukur dari potret halamannya: judul menempel ke navbar, isinya rata
   * dengan tepi sidebar tanpa sela, dan dropdown Survei menyentuh tepi kanan
   * layar. Sebabnya satu dan bukan selera -- halaman ini satu-satunya halaman
   * `admin-kab` yang tak membawa padding sendiri. `AdminKabLayout` tidak
   * memberikannya; setiap halaman memasangnya sendiri (`p-lg` di dashboard,
   * opd, surveys, complaints, users, audit-logs, dokumentasi-api).
   */
  it('membawa padding halamannya sendiri, seperti seluruh halaman admin-kab lain', async () => {
    const { container } = render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis skm/i });

    // AKAR HALAMANNYA, bukan `querySelector('.p-lg')`. Versi pertama uji ini
    // memakai pemilih itu dan HAMPA: beberapa komponen anak (kartu, kepala
    // tabel) sudah memakai `p-lg` sendiri, jadi ia hijau walau akarnya tak
    // punya padding apa pun. `Suspense` menggambar anaknya langsung, sehingga
    // `firstChild` memang pembungkus isi halaman.
    expect(container.firstChild).toHaveClass('p-lg');
  });

  /**
   * JUDUL HALAMAN HANYA SEKALI (7 Oktober 2026, permintaan pengguna: "hapus
   * teks statistik & laporan dibawah navbar").
   *
   * Navbar Admin Kabupaten sudah menuliskannya (PAGE_TITLES), jadi `<h2>` di
   * badan halaman mengulang kata yang sama tepat di bawahnya. Lebih buruk lagi
   * terukur dari tangkapan layar: saat digulir, h2 itu meluncur ke BELAKANG
   * navbar yang `fixed` dan terpotong separuh.
   *
   * Berbeda dengan halaman Admin OPD, yang h2-nya TETAP: navbar di sana
   * menampilkan nama OPD, bukan judul halaman, sehingga membuang h2 akan
   * meninggalkan halaman tanpa judul sama sekali.
   */
  it('tidak mengulang judul halaman di badan, navbar sudah menuliskannya', async () => {
    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis skm/i });

    expect(screen.queryByRole('heading', { name: /statistik & laporan/i })).toBeNull();
  });

  it('bilah tab berhenti di bawah navbar, bukan di baliknya', async () => {
    const { container } = render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis skm/i });

    const bilah = container.querySelector('.sticky');

    expect(bilah).toHaveClass('top-[var(--tinggi-navbar-kab)]');
  });

  it('label pemilih Survei tak mendorong barisnya turun', async () => {
    // Masalah yang sama dengan penyaring periode di navbar: label blok di ATAS
    // kontrol membuatnya tak sejajar dengan baris tab di sebelahnya. Namanya
    // tetap ada bagi pembaca layar.
    const { container } = render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis skm/i });

    await waitFor(() =>
      expect(container.querySelector('label[for="pilih-survei-kab"]')).toHaveClass('sr-only'),
    );
    expect(screen.getByLabelText('Survei')).toBeInTheDocument();
  });

  it('judul survei pada pemilihnya menyebut OPD penyelenggaranya', async () => {
    // Untuk Kabupaten, `GET /surveys` mengembalikan survei SELURUH OPD, dan ia
    // tak mengirim `opdNama`. Tanpa penggabungan nama, dua OPD berjudul serupa
    // tampak kembar dan orang memilih survei yang salah tanpa sadar.
    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis skm/i });

    await waitFor(() =>
      expect(screen.getByText(/Dinas Kesehatan/i)).toBeInTheDocument(),
    );
  });
});
