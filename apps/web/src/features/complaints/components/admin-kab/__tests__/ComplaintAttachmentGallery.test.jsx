import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ComplaintAttachmentGallery from '../ComplaintAttachmentGallery';
import { unduhDariUrl } from '@/utils/unduhBerkas';

jest.mock('@/utils/unduhBerkas', () => ({
  ...jest.requireActual('@/utils/unduhBerkas'),
  unduhDariUrl: jest.fn(),
}));

/**
 * Laporan pengguna 7 September 2026: "pada halaman admin saya tidak bisa
 * melihat dan mendownload gambarnya meskipun tidak menampilkan 403."
 *
 * Sebabnya BUKAN penjaga URL bertanda tangan (T1) -- diukur di peramban,
 * thumbnail-nya justru berhasil dimuat (naturalWidth 1331). Sebabnya kedua
 * tombol di kartu lampiran ini TAK PERNAH punya handler sama sekali: `<button>`
 * kosong tanpa `onClick` maupun `href`. Karena itu tak ada 403 -- tak ada
 * permintaan yang pernah dikirim. Komponen ini memang "dibangun dgn kontrak
 * dummy lama" (komentar di halamannya sendiri).
 *
 * PDF lebih buruk lagi: tanpa `<img>` DAN tanpa aksi apa pun, ia sama sekali
 * tak dapat dibuka dari halaman admin.
 */
const gambar = {
  id: 1,
  name: 'Probis_Pengaduan.png',
  type: 'image',
  size: '131 KB',
  url: 'http://localhost:3001/uploads/complaints/abc-Probis_Pengaduan.png?exp=1&sig=zz',
};
const pdf = {
  id: 2,
  name: 'Dokumen_Testing.pdf',
  type: 'document',
  size: '92 KB',
  url: 'http://localhost:3001/uploads/complaints/def-Dokumen_Testing.pdf?exp=1&sig=yy',
};

const tampilkan = (attachments) =>
  render(<ComplaintAttachmentGallery complaint={{ attachments }} />);

beforeEach(() => jest.clearAllMocks());

describe('ComplaintAttachmentGallery — melihat', () => {
  it('lampiran gambar tampil sebagai <img> dengan URL bertanda tangannya utuh', () => {
    tampilkan([gambar]);

    const img = screen.getByAltText('Probis_Pengaduan.png');
    // Memotong kueri di sini berarti gambarnya dijawab 403.
    expect(img).toHaveAttribute('src', gambar.url);
  });

  it('mengeklik gambar membukanya besar (lightbox)', () => {
    tampilkan([gambar]);

    // Sebelum diklik hanya ada SATU gambar: thumbnail-nya.
    expect(screen.getAllByAltText('Probis_Pengaduan.png')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /lihat.*Probis_Pengaduan\.png/i }));

    expect(screen.getAllByAltText('Probis_Pengaduan.png')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /tutup/i })).toBeInTheDocument();
  });

  it('lightbox dapat ditutup lagi', () => {
    tampilkan([gambar]);
    fireEvent.click(screen.getByRole('button', { name: /lihat.*Probis_Pengaduan\.png/i }));

    fireEvent.click(screen.getByRole('button', { name: /tutup/i }));

    expect(screen.getAllByAltText('Probis_Pengaduan.png')).toHaveLength(1);
  });

  it('PDF tak punya <img> tapi TETAP dapat dibuka di tab baru', () => {
    const buka = jest.fn();
    window.open = buka;
    tampilkan([pdf]);

    expect(screen.queryByAltText('Dokumen_Testing.pdf')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /buka.*Dokumen_Testing\.pdf/i }));

    expect(buka).toHaveBeenCalledWith(pdf.url, '_blank', 'noopener,noreferrer');
  });
});

describe('ComplaintAttachmentGallery — mengunduh', () => {
  it('tombol unduh memanggil pengunduh dengan URL & nama berkasnya', async () => {
    unduhDariUrl.mockResolvedValue(undefined);
    tampilkan([gambar]);

    fireEvent.click(screen.getByRole('button', { name: /unduh.*Probis_Pengaduan\.png/i }));

    await waitFor(() => expect(unduhDariUrl).toHaveBeenCalledWith(gambar.url, gambar.name));
  });

  it('tombol unduh PDF juga bekerja', async () => {
    unduhDariUrl.mockResolvedValue(undefined);
    tampilkan([pdf]);

    fireEvent.click(screen.getByRole('button', { name: /unduh.*Dokumen_Testing\.pdf/i }));

    await waitFor(() => expect(unduhDariUrl).toHaveBeenCalledWith(pdf.url, pdf.name));
  });

  it('unduhan gagal -> pesannya DITAMPILKAN, bukan ditelan diam-diam', async () => {
    // Inilah yang membedakan perbaikan ini dari keadaan lama: dulu tak terjadi
    // apa-apa dan pengguna tak tahu apakah sistemnya bekerja.
    unduhDariUrl.mockRejectedValue(new Error('Tautan lampiran sudah kedaluwarsa.'));
    tampilkan([gambar]);

    fireEvent.click(screen.getByRole('button', { name: /unduh/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/kedaluwarsa/i);
  });

  it('tombolnya dilumpuhkan selagi mengunduh, supaya tak diklik berkali-kali', async () => {
    let lepaskan;
    unduhDariUrl.mockImplementation(() => new Promise((r) => (lepaskan = r)));
    tampilkan([gambar]);

    const tombol = screen.getByRole('button', { name: /unduh/i });
    fireEvent.click(tombol);

    await waitFor(() => expect(tombol).toBeDisabled());
    lepaskan();
    await waitFor(() => expect(tombol).toBeEnabled());
  });
});

describe('ComplaintAttachmentGallery — dasar', () => {
  it('tanpa lampiran -> tak merender apa pun', () => {
    const { container } = tampilkan([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('setiap tombol ikon punya nama yang dapat dibaca', () => {
    // Sebelumnya seluruh tombol di sini ikon-saja TANPA label: pembaca layar
    // hanya menyebut "tombol", dan pengguna papan tuliskunci tak tahu mana yang mana.
    tampilkan([gambar, pdf]);

    for (const b of screen.getAllByRole('button')) {
      expect(b).toHaveAccessibleName();
    }
  });
});
