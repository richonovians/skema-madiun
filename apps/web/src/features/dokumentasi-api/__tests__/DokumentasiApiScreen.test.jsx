import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DokumentasiApiScreen from '../components/DokumentasiApiScreen';
import { getDokumentasiOperasi, getDokumenMentah } from '../services/dokumentasi.api';
import { adaptOpenApi } from '../adapters/openapi.adapter';
import { dokumenOpenApi } from '../__fixtures__/openapi.fixture';

jest.mock('../services/dokumentasi.api', () => ({
  getDokumentasiOperasi: jest.fn(),
  getDokumenMentah: jest.fn(),
}));

/**
 * Data uji dilewatkan adapter SUNGGUHAN, bukan ditulis tangan: bentuk yang
 * digambar komponen karena itu selalu bentuk yang benar-benar diproduksi
 * adapter, bukan tiruan yang bisa diam-diam menyimpang darinya.
 */
const grup = () => adaptOpenApi(dokumenOpenApi);

const bukaSemua = () => fireEvent.click(screen.getByRole('button', { name: /buka semua/i }));

describe('DokumentasiApiScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * Grup TERTUTUP saat halaman dibuka: dokumen sungguhan memuat 15 tag dan 65
   * operasi, jadi yang terlihat pertama kali adalah daftar ringkas tag beserta
   * jumlahnya, bukan gulir sepanjang 64 endpoint.
   */
  it('menggambar daftar tag tertutup beserta jumlah endpointnya', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    render(<DokumentasiApiScreen />);

    expect(await screen.findByText('surveys')).toBeInTheDocument();
    expect(screen.getByText('4 endpoint')).toBeInTheDocument();
    expect(screen.queryByText('Buat paket survei (Admin OPD).')).not.toBeInTheDocument();
  });

  it('membuka seluruh grup lewat satu tombol, dan menutupnya kembali', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');

    bukaSemua();
    expect(screen.getByText('Buat paket survei (Admin OPD).')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tutup semua/i }));
    expect(screen.queryByText('Buat paket survei (Admin OPD).')).not.toBeInTheDocument();
  });

  it('membuka grup satu per satu lewat kepala grupnya', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');

    fireEvent.click(screen.getByRole('button', { name: /grup surveys/i }));
    expect(screen.getByText('Buat paket survei (Admin OPD).')).toBeInTheDocument();
  });

  /**
   * Envelope respons TIDAK terwakili OpenAPI: `ResponseInterceptor` membungkus
   * tiap respons menjadi { success, statusCode, message, data, meta }, sedang
   * skema di dokumen menggambarkan isi `data` saja. Tanpa penjelasan ini
   * halaman mendokumentasikan bentuk yang tak pernah dikirim API.
   */
  it('menjelaskan envelope respons di kepala halaman', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');

    const kepala = screen.getByTestId('penjelasan-envelope').textContent;
    for (const kunci of ['success', 'statusCode', 'message', 'data', 'meta']) {
      expect(kepala).toContain(kunci);
    }
  });

  it('menampilkan keadaan kosong, bukan daftar hampa', async () => {
    getDokumentasiOperasi.mockResolvedValue([]);

    render(<DokumentasiApiScreen />);

    expect(await screen.findByText(/belum ada endpoint yang terdaftar/i)).toBeInTheDocument();
  });

  /**
   * Ditegaskan lewat teks yang SUNGGUH digambar, bukan lewat `role="alert"`:
   * `ErrorState` di repo ini TIDAK memasang role itu (diperiksa 5 Oktober
   * 2026). Menegaskan role yang tak ada akan memerah karena anggapan ujinya
   * salah, bukan karena kodenya salah.
   */
  it('menampilkan galat saat dokumen gagal diambil', async () => {
    getDokumentasiOperasi.mockRejectedValue(new Error('403 Forbidden'));

    render(<DokumentasiApiScreen />);

    expect(await screen.findByText('Gagal memuat dokumentasi API')).toBeInTheDocument();
    expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
  });

  /** Pagar keamanan diulang di tingkat layar: yang tampil harus PENGISI, bukan
   * nilai sesi. Diuji di DOM, bukan hanya di keluaran fungsi snippet. */
  it('menampilkan pengisi token di snippet, bukan nilai sesi', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    const { container } = render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');
    bukaSemua();

    expect(container.textContent).toContain('<token>');
  });

  /**
   * 65 operasi di dokumen sungguhan. Pencarian adalah jawaban atas kepadatan
   * itu, bukan memotong daftarnya -- "semua api" adalah permintaan tersurat
   * pengguna. Karena itu yang diuji PENYARINGANNYA, bukan keberadaan kotaknya:
   * kotak yang ada tapi tak menyaring lulus uji yang hanya mencarinya.
   */
  it('menyaring operasi berdasarkan kata pencarian', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');
    bukaSemua();
    expect(screen.getByText('Buat paket survei (Admin OPD).')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/cari endpoint/i), {
      target: { value: 'Detail satu survei' },
    });

    expect(screen.getByText('Detail satu survei.')).toBeInTheDocument();
    expect(screen.queryByText('Buat paket survei (Admin OPD).')).not.toBeInTheDocument();
  });

  /**
   * Mencari pada halaman yang grupnya tertutup akan terbaca seperti pencarian
   * yang tak menemukan apa pun: jumlahnya berubah, isinya tetap tersembunyi.
   * Karena itu pencarian MEMBUKA grup yang cocok dengan sendirinya, tanpa
   * pengguna perlu mengklik apa pun.
   */
  it('membuka grup yang cocok dengan sendirinya saat mencari', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');

    fireEvent.change(screen.getByLabelText(/cari endpoint/i), {
      target: { value: 'Detail satu survei' },
    });

    expect(screen.getByText('Detail satu survei.')).toBeInTheDocument();
  });

  it('memberi tahu saat pencarian tak menemukan apa pun', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');

    fireEvent.change(screen.getByLabelText(/cari endpoint/i), {
      target: { value: 'zzz-tidak-ada-endpoint-begini' },
    });

    expect(screen.getByText(/tidak ada endpoint yang cocok/i)).toBeInTheDocument();
  });
  /**
   * Menyalin 65 snippet satu per satu bukan cara orang menguji API. Dokumen
   * utuhnya dapat diimpor ke Postman atau Insomnia, dan itu jauh lebih dekat
   * ke maksud "semua api harus bisa dites".
   */
  it('menyediakan unduhan dokumen OpenAPI', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());
    getDokumenMentah.mockResolvedValue({ openapi: '3.0.0', paths: {} });

    const buat = jest.fn(() => 'blob:palsu');
    const cabut = jest.fn();
    global.URL.createObjectURL = buat;
    global.URL.revokeObjectURL = cabut;

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');

    fireEvent.click(screen.getByRole('button', { name: /unduh dokumen openapi/i }));

    await waitFor(() => expect(getDokumenMentah).toHaveBeenCalled());
    await waitFor(() => expect(buat).toHaveBeenCalled());
    // URL objek WAJIB dicabut: tanpa itu blob-nya menggantung sampai tab ditutup.
    await waitFor(() => expect(cabut).toHaveBeenCalledWith('blob:palsu'));
  });

  /**
   * 65 endpoint di balik grup terlipat; tanpa tautan, satu endpoint tak dapat
   * dikirim ke rekan. Hash memuat `/` dan `{}` sehingga WAJIB dikodekan --
   * diuji supaya tak diam-diam patah.
   */
  it('membuka grup yang ditunjuk hash dan menggulir ke endpointnya', async () => {
    getDokumentasiOperasi.mockResolvedValue(grup());
    const id = 'get-/api/v1/surveys';
    window.location.hash = `#${encodeURIComponent(id)}`;

    render(<DokumentasiApiScreen />);
    await screen.findByText('surveys');

    await waitFor(() =>
      expect(screen.getByText('Daftar survei (Kabupaten: semua; Admin OPD: milik OPD-nya).')).toBeInTheDocument(),
    );

    window.location.hash = '';
  });
});
