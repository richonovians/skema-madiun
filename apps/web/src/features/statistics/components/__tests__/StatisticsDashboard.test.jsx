import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import StatisticsDashboard from '../StatisticsDashboard';

/**
 * Halaman statistik publik (INT-14) — sebelumnya tanpa cakupan uji sama sekali.
 *
 * `adaptStatistics` membaca sembilan kunci tanpa penjagaan (`insight.text`,
 * `serviceElements.map`, `valueDistribution.map`, `topOpd.map`), jadi respons
 * yang kekurangan salah satunya membuat halaman gagal render — bukan sekadar
 * tampil kosong. Salah satu kasus di bawah mengunci perilaku itu.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Bentuk minimum yang tetap sah bagi adapter — dipakai untuk menguji keadaan kosong. */
const statistikKosong = (over = {}) => ({
  summary: {
    ikm: null,
    totalRespondents: 0,
    totalComplaints: 0,
    completionRate: 0,
    avgSlaDays: 0,
    activeOpd: 0,
  },
  ikmTrend: [],
  complaintTrend: [],
  complaintStatus: [],
  complaintCategories: [],
  serviceElements: [],
  valueDistribution: [],
  topOpd: [],
  ...over,
});

const givenStatistics = (data) =>
  server.use(http.get(`${API_BASE}/statistics`, () => ok(data, '/statistics')));

describe('StatisticsDashboard', () => {
  it('menampilkan keadaan memuat sebelum data tiba', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText(/memuat statistik/i)).toBeInTheDocument();
  });

  it('merender kategori pengaduan terbanyak beserta jumlahnya', async () => {
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Top Kategori Pengaduan')).toBeInTheDocument();
    expect(screen.getByText('Aduan')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Lapor')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('merender peringkat OPD lengkap dengan medali dan nilai IKM', async () => {
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Top OPD Terbaik')).toBeInTheDocument();
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    expect(screen.getByText('88.5')).toBeInTheDocument();

    // Peringkat 1–3 memakai medali, bukan angka.
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  /**
   * EFEKTIVITAS DI KARTU KIRI (7 Oktober 2026).
   *
   * Bagian ini SEMULA berisi sebaran status pengaduan (Baru/Diproses/Selesai/
   * Ditolak) dan ketiga ujinya lulus. Dibuang pada hari yang sama atas
   * keputusan pemilik produk: keadaan per-kasus seperti "Ditolak 2" terbaca
   * sebagai pemerintah menolak warga, padahal bisa berarti duplikat atau spam.
   * Itu BUKAN penutupan kebocoran -- `GET /statistics` berdekorator `@Public()`
   * tanpa autentikasi, jadi angka itu memang sudah terbuka lewat API dan tetap
   * terbuka sesudah perubahan ini. Yang berubah hanya apa yang dipajang.
   *
   * Penggantinya tetap dari muatan permintaan yang sama: `summary.completionRate`,
   * `summary.avgSlaDays`, dan `summary.totalComplaints` -- ketiganya ditandai D3
   * (publik menurut rancangan) di statistics.entity.ts, seluruhnya agregat.
   *
   * Sebab kekosongannya sendiri tak berubah dan bukan cacat: hanya ada tiga
   * kategori pengaduan di data, sementara kartu kanan menggambar empat kartu
   * OPD berpadding tebal. Keduanya item `grid lg:grid-cols-2` yang meregang
   * setinggi baris, dan `BarChart` ber-`h-full` -- kotaknya ikut tinggi, isinya
   * tidak.
   */
  it('merender persentase aduan yang selesai ditangani', async () => {
    render(<StatisticsDashboard />);

    // Mock: completionRate 92.
    expect(await screen.findByText(/selesai ditangani/i)).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('menyebut rata-rata waktu penyelesaian dengan koma desimal', async () => {
    // Mock: avgSlaDays 3.4. Dibulatkan ke bilangan bulat angka ini menjadi
    // "3 hari", dan pada nilai sekecil itu selisihnya setengah hari kerja.
    render(<StatisticsDashboard />);

    const kotak = (await screen.findByText(/^rata-rata penyelesaian$/i)).closest('div');
    expect(kotak).toHaveTextContent('3,4 hari');
  });

  it('menyebut jumlah aduan masuk, supaya persentasenya punya penyebut', async () => {
    // Mock: totalComplaints 34. Tanpa ini "92%" tak terbaca: 92% dari 34
    // berbeda artinya dari 92% dari 3.
    render(<StatisticsDashboard />);
    await screen.findByText(/selesai ditangani/i);

    // Angka dan labelnya dipisah ke dua baris dalam satu kotak statistik,
    // jadi yang diperiksa keterikatannya, bukan satu untai teks.
    const kotak = screen.getByText(/^aduan masuk$/i).closest('div');
    expect(kotak).toHaveTextContent('34');
  });

  it('memberi bilah kemajuannya nama dan nilai yang terbaca pembaca layar', async () => {
    render(<StatisticsDashboard />);

    const bilah = await screen.findByRole('progressbar');
    expect(bilah).toHaveAttribute('aria-valuenow', '92');
    expect(bilah).toHaveAccessibleName(/selesai ditangani/i);
  });

  it('tidak merender bagian efektivitas ketika kedua angkanya belum ada', async () => {
    // `completionRate` dan `avgSlaDays` nullable di statistics.entity.ts: OPD
    // tanpa satu pun pengaduan tak punya persentase maupun rata-rata hari.
    // "0%" di sana adalah karangan, bukan nol yang terukur.
    givenStatistics(
      statistikKosong({
        summary: { ...statistikKosong().summary, completionRate: null, avgSlaDays: null },
        complaintCategories: [{ kode: 'aduan', nama: 'Aduan', count: 3 }],
      }),
    );
    render(<StatisticsDashboard />);

    // Kartunya tetap digambar -- yang hilang hanya bagian bawahnya.
    expect(await screen.findByText('Aduan')).toBeInTheDocument();
    expect(screen.queryByText(/selesai ditangani/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    // Judulnya DAN penyebutnya ikut hilang. Tanpa kedua baris ini ujinya
    // hampa: dengan `completionRate` null bilah kemajuannya memang tak
    // tergambar walau penjaganya dicabut, sehingga yang tersisa adalah judul
    // bagian plus "0 aduan masuk" yang menggantung sendiri. Terbukti lewat
    // mutasi `if (false) return null`, yang lolos sebelum dua baris ini ada.
    expect(screen.queryByText('Efektivitas Penyelesaian Aduan')).not.toBeInTheDocument();
    expect(screen.queryByText(/aduan masuk/i)).not.toBeInTheDocument();
  });

  it('memberi jarak tetap ke bagian efektivitas, bukan mendorongnya ke dasar kartu', async () => {
    // Percobaan sebelumnya memakai `mt-auto`, yang mendorong bagian ini ke
    // dasar kartu yang diregangkan. Sisa ruangnya tidak hilang, hanya PINDAH:
    // dari bawah bagian ini menjadi pita kosong di antara daftar kategori dan
    // garis pemisahnya, dan terlihat sama kosongnya (laporan pengguna,
    // 7 Oktober 2026). Jaraknya kini tetap; kekosongannya dibereskan dengan
    // berhenti meregangkan kartunya, lihat uji berikutnya.
    render(<StatisticsDashboard />);

    const judul = await screen.findByText('Efektivitas Penyelesaian Aduan');
    const pembungkus = judul.closest('div').parentElement;

    expect(pembungkus).toHaveClass('mt-8');
    expect(pembungkus).not.toHaveClass('mt-auto');
  });

  it('tidak meregangkan kartu melampaui isinya', async () => {
    // Item grid bawaannya `stretch`: kartu kiri dipaksa setinggi kartu OPD di
    // sebelahnya walau isinya lebih pendek, dan selisihnya menjadi ruang kosong
    // DI DALAM kartu yang tak dapat diisi apa pun yang jujur. `items-start`
    // membuat tinggi tiap kartu mengikuti isinya sendiri.
    render(<StatisticsDashboard />);
    await screen.findByText('Top Kategori Pengaduan');

    const grid = document.querySelector('[class*="lg:grid-cols-2"]');
    expect(grid).toHaveClass('items-start');
  });

  it('KONTROL: daftar kategori tetap utuh di kartu yang sama', async () => {
    // Menambah bagian baru tak boleh menggusur yang sudah ada.
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Aduan')).toBeInTheDocument();
    expect(screen.getByText('Lapor')).toBeInTheDocument();
    expect(screen.getByText('Lainnya')).toBeInTheDocument();
  });

  it('menampilkan keadaan kosong ketika belum ada pengaduan maupun hasil IKM', async () => {
    givenStatistics(statistikKosong());
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Belum ada data pengaduan.')).toBeInTheDocument();
    expect(screen.getByText('Belum ada hasil IKM yang tercatat.')).toBeInTheDocument();
    // Grafik tidak boleh ikut dirender saat datanya kosong.
    expect(screen.queryByText('Top Kategori Pengaduan')).not.toBeInTheDocument();
  });

  it('menampilkan ErrorState dengan tombol coba lagi saat API gagal, dan memuat ulang saat diklik', async () => {
    let gagal = true;
    server.use(
      http.get(`${API_BASE}/statistics`, () => {
        if (gagal) {
          return ok({ message: 'Server bermasalah' }, '/statistics', 500);
        }
        // Penanda pemulihan DIPINDAHKAN dari narasi insight (dibuang
        // 6 Oktober 2026) ke keadaan kosong yang masih digambar halaman ini.
        // Yang dibuktikan uji ini tetap sama: tombol Coba Lagi benar-benar
        // memicu pengambilan ulang.
        return ok(statistikKosong(), '/statistics');
      }),
    );

    render(<StatisticsDashboard />);

    expect(await screen.findByText('Gagal memuat statistik')).toBeInTheDocument();

    // Percobaan berikutnya berhasil — tombol Coba Lagi harus benar-benar memicu fetch ulang.
    gagal = false;
    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));

    await waitFor(() =>
      expect(screen.getByText('Belum ada data pengaduan.')).toBeInTheDocument(),
    );
  });
});
