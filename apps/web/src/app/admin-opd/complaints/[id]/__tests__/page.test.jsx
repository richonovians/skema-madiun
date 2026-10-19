import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminComplaintDetailPage from '../page';
import {
  getComplaintByTicketNo,
  getComplaintReplies,
  addComplaintReply,
  updateComplaintStatus,
} from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';

/**
 * Halaman detail pengaduan Admin OPD.
 *
 * Yang diuji di sini bukan tampilnya data, melainkan apa yang TERSISA di layar
 * selagi halaman memuat ulang sesudah pesan terkirim. Selama muat ulang
 * mengganti seluruh isi halaman dengan pemuat, tinggi dokumen runtuh, peramban
 * menjepit posisi gulir ke nol, dan admin terlempar ke puncak halaman setiap
 * kali membalas -- tepat pada saat ia sedang membaca percakapan di bawah.
 */
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ADU-001' }),
}));

jest.mock('@/features/complaints/services/complaints.api', () => ({
  getComplaintByTicketNo: jest.fn(),
  getComplaintReplies: jest.fn(),
  addComplaintReply: jest.fn(),
  updateComplaintStatus: jest.fn(),
}));

jest.mock('@/features/complaints/services/reference.api', () => ({
  getComplaintCategories: jest.fn(),
}));

const pengaduan = () => ({
  id: 'ADU-001',
  numericId: 7,
  userId: 3,
  opdId: 1,
  isAnonim: false,
  reporter: { name: 'Budi Santoso', initials: 'BS', nik: null, phone: null, address: null },
  title: 'Jalan berlubang di depan pasar',
  description: 'Sudah dua bulan belum diperbaiki.',
  dateStr: '1 Sep 2026',
  createdAt: '2026-09-01T02:00:00.000Z',
  ageDays: 10,
  status: 'Diproses',
  kategori: 'aduan',
  target: 'Dinas Pekerjaan Umum',
  attachments: [],
});

const kotakBalasan = () => screen.getByPlaceholderText(/tulis jawaban solusi/i);

beforeEach(() => {
  jest.clearAllMocks();
  getComplaintByTicketNo.mockResolvedValue(pengaduan());
  getComplaintReplies.mockResolvedValue([]);
  getComplaintCategories.mockResolvedValue([]);
  addComplaintReply.mockResolvedValue({});
  updateComplaintStatus.mockResolvedValue({});
});

describe('Detail pengaduan Admin OPD', () => {
  it('isi halaman tetap terpasang selagi memuat ulang sesudah pesan terkirim', async () => {
    // Muat ulang DITAHAN menggantung, supaya yang diperiksa benar-benar keadaan
    // layar selama muat ulang berlangsung -- bukan keadaan sesudahnya, yang
    // selalu terlihat benar dan tak membuktikan apa pun.
    let lepaskanMuatUlang;
    getComplaintByTicketNo.mockResolvedValueOnce(pengaduan()).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          lepaskanMuatUlang = () => resolve(pengaduan());
        }),
    );

    render(<AdminComplaintDetailPage />);
    fireEvent.change(await screen.findByPlaceholderText(/tulis jawaban solusi/i), {
      target: { value: 'Perbaikan dijadwalkan pekan depan.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /kirim pesan/i }));

    await waitFor(() => expect(getComplaintByTicketNo).toHaveBeenCalledTimes(2));

    expect(kotakBalasan()).toBeInTheDocument();
    expect(screen.queryByText(/memuat detail pengaduan/i)).not.toBeInTheDocument();

    lepaskanMuatUlang();
    await waitFor(() => expect(kotakBalasan()).toBeInTheDocument());
  });

  it('pemuat penuh hanya pada muat pertama, saat memang belum ada yang bisa ditampilkan', async () => {
    let lepaskanMuatPertama;
    getComplaintByTicketNo.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          lepaskanMuatPertama = () => resolve(pengaduan());
        }),
    );

    render(<AdminComplaintDetailPage />);

    expect(screen.getByText(/memuat detail pengaduan/i)).toBeInTheDocument();

    lepaskanMuatPertama();
    await screen.findByPlaceholderText(/tulis jawaban solusi/i);
  });
  it('pesan yang gagal terkirim tidak dibuang, dan sebabnya muncul di dekat tombolnya', async () => {
    // Sesudah halaman berhenti melompat ke puncak, pesan galat yang dipasang di
    // atas sana tak lagi terlihat oleh admin yang sedang berada di kolom
    // balasan. Kalau teksnya ikut dikosongkan, satu-satunya salinan tulisannya
    // hilang tanpa ia pernah tahu pengirimannya gagal.
    addComplaintReply.mockRejectedValue(new Error('Jaringan terputus'));

    render(<AdminComplaintDetailPage />);
    fireEvent.change(await screen.findByPlaceholderText(/tulis jawaban solusi/i), {
      target: { value: 'Perbaikan dijadwalkan pekan depan.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /kirim pesan/i }));

    expect(await screen.findByText(/jaringan terputus/i)).toBeInTheDocument();
    expect(kotakBalasan()).toHaveValue('Perbaikan dijadwalkan pekan depan.');
  });
});

/**
 * KEPALA HALAMAN DI LAYAR SEMPIT (17 September 2026, audit responsif).
 *
 * Terukur di Chrome sungguhan: halaman ini menggulir ke samping pada SETIAP
 * lebar di bawah 480px -- 118px pada 320, 78px pada 360, 48px pada 390, dan
 * 24px pada 414. Sebabnya baris kepala yang tak pernah membungkus: tombol
 * kembali, judul berisi nomor tiket panjang, dan menu ekspor selebar 144px
 * yang didorong `ml-auto` dipaksa berbagi satu baris. Menu ekspornyalah yang
 * terlempar keluar tepi kanan.
 *
 * Halaman setara di Admin Kabupaten tak punya cacat ini: ia memakai
 * ComplaintDetailHeader yang barisnya `flex-col sm:flex-row`. Halaman inilah
 * satu-satunya yang menyusun kepalanya sendiri.
 *
 * BATAS UJI INI DINYATAKAN TERUS TERANG: jsdom tak menghitung tata letak sama
 * sekali -- setiap elemen berukuran nol di sana, sehingga luberannya mustahil
 * diukur di Jest. Yang dikunci di bawah adalah SYARAT yang membuat pembungkusan
 * mungkin terjadi. Bukti sesungguhnya tetap pengukuran di peramban.
 */
describe('Detail pengaduan Admin OPD — kepala halaman di layar sempit', () => {
  const judul = async () => await screen.findByRole('heading', { name: /detail pengaduan/i });

  it('baris kepala boleh membungkus, bukan memaksa semuanya satu baris', async () => {
    render(<AdminComplaintDetailPage />);

    expect((await judul()).parentElement.className).toMatch(/\bflex-wrap\b/);
  });

  it('judul dapat menyusut dan memenggal nomor tiket yang panjang', async () => {
    render(<AdminComplaintDetailPage />);
    const h = await judul();

    // `min-w-0` melawan lebar minimum bawaan item flex; tanpa itu judul menolak
    // menyusut dan justru mendorong tetangganya keluar layar. `break-words`
    // untuk nomor tiket, yang satu untaian tanpa spasi.
    expect(h.className).toMatch(/\bmin-w-0\b/);
    expect(h.className).toMatch(/\bbreak-words\b/);
  });

  it('menu ekspor mengambil baris sendiri di layar sempit, dan kembali ke kanan di layar lebar', async () => {
    render(<AdminComplaintDetailPage />);
    const tombol = await screen.findByRole('button', { name: /ekspor/i });
    const pembungkus = tombol.closest('div').parentElement;

    expect(pembungkus.className).toMatch(/\bw-full\b/);
    expect(pembungkus.className).toMatch(/\bsm:w-auto\b/);
    expect(pembungkus.className).toMatch(/\bsm:ml-auto\b/);
  });
});

/**
 * STATUS PROGRES DI HALAMAN ADMIN OPD (permintaan pengguna 22 September 2026).
 *
 * Kartu ini sudah lama ada di halaman Admin Kabupaten tetapi tak pernah di
 * sini, sehingga petugas yang justru mengerjakan tiketnya tak punya gambaran
 * tahap mana yang sedang berjalan -- ia hanya melihat satu lencana status.
 */
describe('halaman detail Admin OPD — Status Progres', () => {
  it('menampilkan kartu Status Progres', async () => {
    render(<AdminComplaintDetailPage />);

    expect(await screen.findByText('Status Progres')).toBeInTheDocument();
  });

  /**
   * Tahapannya harus mengikuti status tiketnya, bukan sekadar tergambar. Tanpa
   * ini, kartu yang selalu menyorot tahap pertama akan lolos uji di atas.
   */
  it('menyorot tahap yang sesuai status tiket', async () => {
    render(<AdminComplaintDetailPage />);

    const kartu = (await screen.findByText('Status Progres')).closest('div');
    expect(kartu).toHaveTextContent('Diproses');
  });
});
