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
