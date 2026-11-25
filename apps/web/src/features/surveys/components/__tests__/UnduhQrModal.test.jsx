import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UnduhQrModal from '../UnduhQrModal';
import { gambarPosterQr } from '@/features/surveys/utils/posterQrSurvei';
import { simpanBlob } from '@/utils/unduhBerkas';

/**
 * MODAL PILIHAN UNDUHAN QR (25 November 2026, permintaan pengguna).
 *
 * Sebelumnya tombol "Unduh QR" di modal Bagikan langsung menurunkan poster,
 * dan QR polos tak dapat diunduh sama sekali. Modal ini memberi dua pilihan --
 * QR polos dan QR dengan desain -- dan memperlihatkan poster survei ITU SENDIRI
 * sebagai pratinjau, sehingga yang dilihat sama dengan yang turun.
 *
 * `gambarPosterQr` dipalsukan karena jsdom tak punya canvas sungguhan; poster
 * utuhnya diperiksa di peramban lewat Playwright.
 */
jest.mock('@/features/surveys/utils/posterQrSurvei', () => ({
  __esModule: true,
  gambarPosterQr: jest.fn(),
}));
jest.mock('@/utils/unduhBerkas', () => ({
  __esModule: true,
  simpanBlob: jest.fn(),
}));

// PNG 1x1 yang sah; isinya dibandingkan dengan blob yang disimpan tombol polos.
const QR_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const QR_DATA_URL = `data:image/png;base64,${QR_BASE64}`;

const posterBlob = new Blob(['poster'], { type: 'image/png' });

const survei = { id: 42, title: 'SKM Loket', status: 'AKTIF' };

const bukaModal = (props = {}) =>
  render(
    <UnduhQrModal
      survey={survei}
      url="http://skema.local/survei/42"
      qrDataUrl={QR_DATA_URL}
      namaInstansi="Dinas Komunikasi dan Informatika"
      onClose={() => {}}
      {...props}
    />,
  );

/** Baca isi Blob sebagai byte; jsdom belum tentu punya `Blob#arrayBuffer`. */
const bacaByte = (blob) =>
  new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(new Uint8Array(fr.result));
    fr.readAsArrayBuffer(blob);
  });

describe('UnduhQrModal', () => {
  const asliBuat = URL.createObjectURL;
  const asliCabut = URL.revokeObjectURL;

  beforeEach(() => {
    gambarPosterQr.mockReset();
    gambarPosterQr.mockResolvedValue(posterBlob);
    simpanBlob.mockReset();
    // jsdom tak punya createObjectURL sama sekali.
    URL.createObjectURL = jest.fn(() => 'blob:pratinjau-poster');
    URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    URL.createObjectURL = asliBuat;
    URL.revokeObjectURL = asliCabut;
  });

  it('ber-role dialog modal, dinamai "Unduh QR" dan judul surveinya', async () => {
    bukaModal();

    const dialog = screen.getByRole('dialog', { name: /unduh qr.*skm loket/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await screen.findByAltText(/pratinjau poster qr/i);
  });

  it('menyusun poster dari judul, instansi, URL, dan QR survei ini', async () => {
    bukaModal();

    await waitFor(() => expect(gambarPosterQr).toHaveBeenCalledTimes(1));
    expect(gambarPosterQr).toHaveBeenCalledWith({
      qrDataUrl: QR_DATA_URL,
      judul: 'SKM Loket',
      instansi: 'Dinas Komunikasi dan Informatika',
      url: 'http://skema.local/survei/42',
    });
  });

  it('menampilkan poster survei ini sebagai pratinjau', async () => {
    bukaModal();

    const gambar = await screen.findByAltText(/pratinjau poster qr/i);
    expect(gambar).toHaveAttribute('src', 'blob:pratinjau-poster');
    expect(URL.createObjectURL).toHaveBeenCalledWith(posterBlob);
  });

  it('melepas URL pratinjau saat modal ditutup', async () => {
    const { unmount } = bukaModal();
    await screen.findByAltText(/pratinjau poster qr/i);

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pratinjau-poster');
  });

  it('"QR dengan Desain" menyimpan poster pratinjau tanpa menggambarnya ulang', async () => {
    bukaModal();
    const tombol = screen.getByRole('button', { name: /unduh qr dengan desain/i });
    await waitFor(() => expect(tombol).toBeEnabled());

    fireEvent.click(tombol);

    await waitFor(() => expect(simpanBlob).toHaveBeenCalledTimes(1));
    expect(simpanBlob).toHaveBeenCalledWith(posterBlob, 'qr-survei-42-poster.png');
    expect(gambarPosterQr).toHaveBeenCalledTimes(1);
  });

  it('"QR Polos" menyimpan gambar QR apa adanya, bukan posternya', async () => {
    bukaModal();
    await screen.findByAltText(/pratinjau poster qr/i);

    fireEvent.click(screen.getByRole('button', { name: /unduh qr polos/i }));

    await waitFor(() => expect(simpanBlob).toHaveBeenCalledTimes(1));
    const [blob, nama] = simpanBlob.mock.calls[0];
    expect(nama).toBe('qr-survei-42-polos.png');
    expect(blob).not.toBe(posterBlob);
    expect(blob.type).toBe('image/png');
    const harapan = Uint8Array.from(atob(QR_BASE64), (c) => c.charCodeAt(0));
    expect(await bacaByte(blob)).toEqual(harapan);
  });

  /**
   * Poster yang gagal disusun hanya mematikan pilihan berdesain. QR polos tak
   * bergantung pada canvas sama sekali, jadi ia tetap harus dapat diunduh.
   */
  it('poster gagal: pesan tampil, dan QR polos tetap dapat diunduh', async () => {
    gambarPosterQr.mockRejectedValue(new Error('canvas ditolak'));
    bukaModal();

    expect(await screen.findByRole('alert')).toHaveTextContent(/gagal menyiapkan poster.*canvas ditolak/i);

    fireEvent.click(screen.getByRole('button', { name: /unduh qr polos/i }));
    await waitFor(() => expect(simpanBlob).toHaveBeenCalledTimes(1));
    expect(simpanBlob.mock.calls[0][1]).toBe('qr-survei-42-polos.png');
  });

  it('poster gagal: "QR dengan Desain" mencoba menyusun ulang lalu menyimpannya', async () => {
    gambarPosterQr.mockRejectedValueOnce(new Error('canvas ditolak'));
    bukaModal();
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: /unduh qr dengan desain/i }));

    await waitFor(() => expect(simpanBlob).toHaveBeenCalledWith(posterBlob, 'qr-survei-42-poster.png'));
    expect(gambarPosterQr).toHaveBeenCalledTimes(2);
  });

  it('tombol "Tutup" dan Escape memanggil onClose', async () => {
    const onClose = jest.fn();
    bukaModal({ onClose });
    await screen.findByAltText(/pratinjau poster qr/i);

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
