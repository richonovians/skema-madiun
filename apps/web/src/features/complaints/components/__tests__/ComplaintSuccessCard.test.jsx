import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ComplaintSuccessCard from '../ComplaintSuccessCard';
import { getActiveSurveys } from '@/features/surveys/services/surveys.api';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getActiveSurveys: jest.fn(),
}));

const push = jest.fn();

/** Daftar survei aktif milik satu OPD, sebagaimana dikembalikan adapternya. */
const daftarSurvei = (...surveys) => ({ data: surveys, meta: {} });

/**
 * Halaman ini menerima id instansi lewat query `?opdId=`. Angka itu berasal dari
 * tabel `opd`, sedangkan `/surveys/:id` membaca `:id` sebagai id SURVEI -- dua
 * ruang nomor yang berbeda. Menaruh yang satu di lubang yang lain tak pernah
 * memunculkan galat: nomornya sah di kedua tabel, hanya menunjuk baris yang
 * salah. Itu sebabnya bug ini perlu dijaga uji, bukan sekadar dibaca.
 */
function renderKartu(query) {
  useRouter.mockReturnValue({ push });
  useSearchParams.mockReturnValue(new URLSearchParams(query));
  return render(<ComplaintSuccessCard />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ComplaintSuccessCard -- tombol "Lanjut Isi Survei"', () => {
  /**
   * Laporan pengguna 14 September 2026: tombolnya "kadang tidak membuka daftar
   * survei tetapi malah membuka salah satu survei".
   *
   * Di basis data setempat, instansi 22 (Bappeda) bertabrakan dengan survei 22
   * milik Satpol PP. Warga yang mengadu ke Bappeda karena itu mendarat di
   * kuesioner instansi yang sama sekali tak ia adukan -- dan jawabannya masuk
   * ke IKM instansi tersebut.
   */
  const klikLanjut = () =>
    fireEvent.click(screen.getByRole('button', { name: /lanjut isi survei/i }));

  /**
   * Sejak 15 September 2026, OPD boleh menunjuk satu survei utama dan tombol ini
   * menuju ke sana langsung. Id surveinya sengaja DIBEDAKAN dari id instansinya
   * (22 vs 77): kalau keduanya disamakan di dalam uji, tautan yang keliru
   * memakai `opdId` sebagai id survei akan tetap hijau.
   */
  it('menuju survei utama milik instansi yang diadukan', async () => {
    getActiveSurveys.mockResolvedValue(
      daftarSurvei({ id: '70', isUtama: false }, { id: '77', isUtama: true }),
    );
    renderKartu('complaintId=PGD1&opdId=22&opdName=Bappeda');

    klikLanjut();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/surveys/77'));
    expect(push).not.toHaveBeenCalledWith('/surveys/22');
  });

  it('meminta survei milik instansi itu saja, bukan seluruh instansi', async () => {
    getActiveSurveys.mockResolvedValue(daftarSurvei({ id: '77', isUtama: true }));
    renderKartu('complaintId=PGD2&opdId=24&opdName=Dinas%20Lingkungan%20Hidup');

    klikLanjut();

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(getActiveSurveys).toHaveBeenCalledWith(expect.objectContaining({ opdId: '24' }));
  });

  /**
   * CADANGAN, dan inilah perilaku lama yang tetap dipertahankan: instansi yang
   * belum menunjuk survei utama tak boleh membuat tombolnya mati. Warga tetap
   * dibawa ke daftar survei instansi yang ia adukan.
   *
   * Penjaga `not.toHaveBeenCalledWith('/surveys/22')` di bawah menjaga bug lama
   * (laporan 14 September 2026): `opdId` dan id survei adalah dua ruang nomor
   * berbeda, dan menaruh yang satu di lubang yang lain tak pernah memunculkan
   * galat -- hanya membuka kuesioner instansi yang tak diadukan siapa pun.
   */
  it('instansi tanpa survei utama jatuh ke daftar yang tersaring', async () => {
    getActiveSurveys.mockResolvedValue(daftarSurvei({ id: '70', isUtama: false }));
    renderKartu('complaintId=PGD1&opdId=22&opdName=Bappeda');

    klikLanjut();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/surveys?opdId=22'));
    expect(push).not.toHaveBeenCalledWith('/surveys/22');
  });

  /**
   * Permintaannya gagal -- jaringan putus, server sedang tak menjawab. Tombol
   * yang diam setelah ditekan adalah jalan buntu; warga yang baru saja mengadu
   * tak punya cara tahu bahwa ia masih boleh mengisi survei.
   */
  it('permintaan yang gagal tetap membawa ke daftar, bukan berhenti', async () => {
    getActiveSurveys.mockRejectedValue(new Error('jaringan putus'));
    renderKartu('complaintId=PGD1&opdId=22&opdName=Bappeda');

    klikLanjut();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/surveys?opdId=22'));
  });

  /**
   * Pengaduan "Lainnya (belum tahu tujuannya)" dikirim tanpa `opdId`. Tak ada
   * instansi untuk disaring, jadi daftarnya dibuka utuh -- dan tak ada survei
   * utama siapa pun untuk dicari, sehingga permintaannya pun tak perlu dikirim.
   */
  it('tanpa instansi tujuan membuka daftar survei utuh', async () => {
    renderKartu('complaintId=PGD3');

    klikLanjut();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/surveys'));
    expect(getActiveSurveys).not.toHaveBeenCalled();
  });
});

/**
 * Pengaduan "Lainnya (belum tahu tujuannya)" dikirim tanpa `opdId`, dan baru
 * mendapat instansi ketika Admin Kabupaten meneruskannya lewat
 * ForwardComplaintModal. Sampai saat itu tiketnya belum menuju ke mana pun.
 */
describe('ComplaintSuccessCard -- pengaduan tanpa tujuan', () => {
  it('tidak menyebut instansi mana pun sebagai tujuan', () => {
    renderKartu('complaintId=PGD3');

    expect(screen.queryByText(/instansi terkait/i)).toBeNull();
  });

  /**
   * "Belum ditentukan", bukan tanda hubung: alasannya sama dengan lencana
   * "Belum bertujuan" di ComplaintTable.jsx -- tanda hubung tak dapat dibedakan
   * dari nama instansi yang gagal dimuat.
   */
  it('menyatakan instansinya belum ditentukan', () => {
    renderKartu('complaintId=PGD3');

    expect(screen.getByText('Belum ditentukan')).toBeInTheDocument();
  });

  it('tidak menjanjikan pengaduannya sudah sampai ke suatu instansi', () => {
    renderKartu('complaintId=PGD3');

    expect(
      screen.getByText(/menunggu penentuan instansi yang berwenang menanganinya/i),
    ).toBeInTheDocument();
  });

  /**
   * Kendali. Cabang bertujuan adalah yang paling mudah ikut rusak saat
   * percabangannya ditulis, dan rusaknya tak terlihat dari layar tanpa tujuan.
   */
  it('pengaduan yang bertujuan tetap menyebut nama instansinya', () => {
    renderKartu('complaintId=PGD4&opdId=22&opdName=Dinas%20Kesehatan');

    expect(screen.getAllByText('Dinas Kesehatan').length).toBeGreaterThan(0);
    expect(screen.queryByText('Belum ditentukan')).toBeNull();
  });
});
