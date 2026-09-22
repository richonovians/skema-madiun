import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShareSurveyModal from '../ShareSurveyModal';
import { gambarPosterQr } from '@/features/surveys/utils/posterQrSurvei';
import { simpanBlob } from '@/utils/unduhBerkas';

/**
 * Tautan bagikan dipindah dari `/surveys/:id` (rute khusus peran `responden`,
 * dijaga proxy.js) ke rute yang berada DI LUAR matcher proxy. Satu tautan/QR
 * karena itu berlaku untuk semua orang: pengunjung tanpa sesi tak lagi
 * dipantulkan ke beranda.
 *
 * Alamatnya `/survei/:id` sejak 8 September 2026, sebelumnya `/isi/:id`.
 * Alamat lama tetap hidup sebagai pengalihan permanen, tetapi yang DIBAGIKAN
 * harus yang baru: tautan yang lewat pengalihan menambah satu perjalanan
 * jaringan pada setiap pemindaian QR.
 */
describe('ShareSurveyModal', () => {
  const survei = (over = {}) => ({ id: 42, title: 'SKM Loket', status: 'AKTIF', ...over });

  it('membagikan tautan /survei/:id, bukan rute berpenjaga /surveys/:id', () => {
    render(<ShareSurveyModal survey={survei()} onClose={() => {}} />);

    expect(screen.getByDisplayValue(/\/survei\/42$/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/\/surveys\/42$/)).not.toBeInTheDocument();
  });

  it('TIDAK lagi membagikan alamat lama /isi/:id', () => {
    render(<ShareSurveyModal survey={survei()} onClose={() => {}} />);

    expect(screen.queryByDisplayValue(/\/isi\/42$/)).not.toBeInTheDocument();
  });

  it('survei yang mengizinkan anonim: keterangan tak lagi menuntut login', () => {
    render(<ShareSurveyModal survey={survei({ izinkanAnonim: true })} onClose={() => {}} />);

    expect(screen.getByText(/tanpa login/i)).toBeInTheDocument();
    expect(screen.queryByText(/SSO/i)).not.toBeInTheDocument();
  });

  it('survei biasa: keterangan tetap menyebut SSO (kontrol)', () => {
    render(<ShareSurveyModal survey={survei({ izinkanAnonim: false })} onClose={() => {}} />);

    expect(screen.getByText(/SSO/i)).toBeInTheDocument();
    expect(screen.queryByText(/tanpa login/i)).not.toBeInTheDocument();
  });
  /**
   * Panel keterangan biru menggambarkan tautan yang BERFUNGSI ("dapat diisi
   * tanpa login" / "perlu masuk lewat SSO"). Pada survei yang belum aktif ia
   * terpasang tepat di bawah spanduk kuning yang mengatakan tautannya belum
   * dapat diisi -- dua pernyataan berlawanan dalam satu layar, dan yang bawah
   * terdengar lebih meyakinkan karena berbicara soal cara kerja.
   */
  describe('keterangan cara pengisian', () => {
    it('disembunyikan pada survei draf, menyisakan peringatannya saja', () => {
      render(
        <ShareSurveyModal survey={survei({ status: 'DRAF', izinkanAnonim: true })} onClose={() => {}} />,
      );

      expect(screen.getByText(/masih berstatus draf/i)).toBeInTheDocument();
      expect(screen.queryByText(/dapat diisi tanpa login/i)).not.toBeInTheDocument();
    });

    it('disembunyikan pula pada survei yang sudah ditutup', () => {
      render(
        <ShareSurveyModal survey={survei({ status: 'DITUTUP', izinkanAnonim: false })} onClose={() => {}} />,
      );

      expect(screen.getByText(/sudah ditutup/i)).toBeInTheDocument();
      expect(screen.queryByText(/SSO/i)).not.toBeInTheDocument();
    });

    it('tetap tampil pada survei aktif, sebab di sanalah ia benar (kontrol)', () => {
      render(
        <ShareSurveyModal survey={survei({ status: 'AKTIF', izinkanAnonim: true })} onClose={() => {}} />,
      );

      expect(screen.getByText(/dapat diisi tanpa login/i)).toBeInTheDocument();
      expect(screen.queryByText(/masih berstatus draf/i)).not.toBeInTheDocument();
    });
  });
});

/**
 * UNDUHAN QR ADALAH POSTER, BUKAN QR POLOS (permintaan pengguna 22 September
 * 2026).
 *
 * Berkas lama hanya berisi kotak QR. Dicetak dan ditempel di loket, gambar itu
 * tak memberi tahu apa pun: yang lewat tak tahu survei apa, milik instansi
 * mana, dan tak punya jalan lain bila kameranya menolak memindai.
 *
 * `gambarPosterQr` dipalsukan di sini karena ia menggambar di canvas, dan jsdom
 * tak punya canvas sungguhan. Yang diuji bagian yang memang milik modal ini:
 * data apa yang diserahkan ke penyusun poster, dan apa yang terjadi pada
 * hasilnya. Poster utuhnya diperiksa uji Playwright.
 */
jest.mock('@/features/surveys/utils/posterQrSurvei', () => ({
  __esModule: true,
  gambarPosterQr: jest.fn(),
}));
jest.mock('@/utils/unduhBerkas', () => ({
  __esModule: true,
  simpanBlob: jest.fn(),
}));
jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,QRPOLOS')) },
}));

describe('ShareSurveyModal — unduhan poster QR', () => {
  const posterBlob = new Blob(['poster'], { type: 'image/png' });

  const bukaModal = async (over = {}, props = {}) => {
    gambarPosterQr.mockResolvedValue(posterBlob);
    render(
      <ShareSurveyModal
        survey={{ id: 42, title: 'SKM Loket', status: 'AKTIF', ...over }}
        namaInstansi="Dinas Komunikasi dan Informatika"
        onClose={() => {}}
        {...props}
      />,
    );
    // Menunggu tombolnya AKTIF, bukan sekadar ada. Tombolnya dirender sejak
    // awal dalam keadaan nonaktif sampai QR selesai dibuat di effect yang
    // asinkron; menunggu keberadaannya saja membuat uji ini mengklik tombol
    // mati dan gagal bergantung pada kecepatan mesin.
    const tombol = screen.getByRole('button', { name: /unduh qr/i });
    await waitFor(() => expect(tombol).toBeEnabled());
    return tombol;
  };

  beforeEach(() => {
    gambarPosterQr.mockReset();
    simpanBlob.mockReset();
  });

  it('menyerahkan judul, instansi, dan URL survei ke penyusun poster', async () => {
    const tombol = await bukaModal();

    fireEvent.click(tombol);

    await waitFor(() => expect(gambarPosterQr).toHaveBeenCalledTimes(1));
    expect(gambarPosterQr).toHaveBeenCalledWith(
      expect.objectContaining({
        judul: 'SKM Loket',
        instansi: 'Dinas Komunikasi dan Informatika',
        url: expect.stringMatching(/\/survei\/42$/),
        qrDataUrl: 'data:image/png;base64,QRPOLOS',
      }),
    );
  });

  it('menyimpan poster yang tersusun, bukan QR polosnya', async () => {
    const tombol = await bukaModal();

    fireEvent.click(tombol);

    await waitFor(() => expect(simpanBlob).toHaveBeenCalledTimes(1));
    expect(simpanBlob).toHaveBeenCalledWith(posterBlob, 'qr-survei-42.png');
  });

  /**
   * Kegagalan menyusun poster harus TERLIHAT. Tanpa ini, tombol yang diklik
   * tanpa hasil apa pun terbaca sebagai peramban yang lambat, dan penggunanya
   * menunggu berkas yang tak akan pernah turun.
   */
  it('menampilkan pesan bila poster gagal disusun, dan tak menyimpan apa pun', async () => {
    const tombol = await bukaModal();
    gambarPosterQr.mockRejectedValue(new Error('canvas ditolak'));

    fireEvent.click(tombol);

    expect(await screen.findByText(/gagal menyiapkan poster/i)).toBeInTheDocument();
    expect(simpanBlob).not.toHaveBeenCalled();
  });

  /**
   * KONTROL: tanpa ini, sebuah komponen yang TIDAK PERNAH memanggil penyusun
   * poster akan membuat uji kegagalan di atas hijau tanpa alasan.
   */
  it('KONTROL: poster disusun sekali per klik', async () => {
    const tombol = await bukaModal();

    fireEvent.click(tombol);
    await waitFor(() => expect(gambarPosterQr).toHaveBeenCalledTimes(1));

    fireEvent.click(tombol);
    await waitFor(() => expect(gambarPosterQr).toHaveBeenCalledTimes(2));
  });
});
