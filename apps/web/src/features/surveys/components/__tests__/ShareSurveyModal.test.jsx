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
 * "UNDUH QR" MEMBUKA MODAL PILIHAN, TIDAK LANGSUNG MENGUNDUH (25 November 2026,
 * permintaan pengguna).
 *
 * Sampai hari itu tombolnya langsung menurunkan poster (22 September 2026) dan
 * QR polos tak dapat diunduh sama sekali. Kini ia membuka `UnduhQrModal`, yang
 * memuat pratinjau poster dan dua pilihan unduhan; perilaku unduhannya sendiri
 * diuji di UnduhQrModal.test.jsx.
 *
 * `gambarPosterQr` dipalsukan karena jsdom tak punya canvas sungguhan.
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

describe('ShareSurveyModal — tombol Unduh QR', () => {
  const posterBlob = new Blob(['poster'], { type: 'image/png' });
  const asliBuat = URL.createObjectURL;
  const asliCabut = URL.revokeObjectURL;

  const bukaModal = async (props = {}) => {
    render(
      <ShareSurveyModal
        survey={{ id: 42, title: 'SKM Loket', status: 'AKTIF' }}
        namaInstansi="Dinas Komunikasi dan Informatika"
        onClose={() => {}}
        {...props}
      />,
    );
    // Menunggu tombolnya AKTIF, bukan sekadar ada. Tombolnya dirender sejak
    // awal dalam keadaan nonaktif sampai QR selesai dibuat di effect yang
    // asinkron; menunggu keberadaannya saja membuat uji ini mengklik tombol
    // mati dan gagal bergantung pada kecepatan mesin.
    const tombol = screen.getByRole('button', { name: /^unduh qr$/i });
    await waitFor(() => expect(tombol).toBeEnabled());
    return tombol;
  };

  beforeEach(() => {
    gambarPosterQr.mockReset();
    gambarPosterQr.mockResolvedValue(posterBlob);
    simpanBlob.mockReset();
    // jsdom tak punya createObjectURL; modal pilihan memakainya untuk pratinjau.
    URL.createObjectURL = jest.fn(() => 'blob:pratinjau-poster');
    URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    URL.createObjectURL = asliBuat;
    URL.revokeObjectURL = asliCabut;
  });

  it('membuka modal pilihan dan tidak langsung mengunduh apa pun', async () => {
    const tombol = await bukaModal();

    fireEvent.click(tombol);

    expect(await screen.findByRole('dialog', { name: /unduh qr.*skm loket/i })).toBeInTheDocument();
    await screen.findByAltText(/pratinjau poster qr/i);
    expect(simpanBlob).not.toHaveBeenCalled();
  });

  it('menyerahkan QR, URL, dan nama instansi yang sama ke modal pilihan', async () => {
    const tombol = await bukaModal();

    fireEvent.click(tombol);

    await waitFor(() => expect(gambarPosterQr).toHaveBeenCalledTimes(1));
    expect(gambarPosterQr).toHaveBeenCalledWith({
      qrDataUrl: 'data:image/png;base64,QRPOLOS',
      judul: 'SKM Loket',
      instansi: 'Dinas Komunikasi dan Informatika',
      url: expect.stringMatching(/\/survei\/42$/),
    });
  });

  /**
   * Kedua modal mendengarkan Escape di `window`. Tanpa penahan, satu Escape
   * menutup keduanya sekaligus dan pengguna terlempar ke halaman, padahal ia
   * hanya ingin membatalkan pilihan unduhan.
   */
  it('Escape saat modal pilihan terbuka hanya menutup modal pilihan', async () => {
    const onClose = jest.fn();
    const tombol = await bukaModal({ onClose });
    fireEvent.click(tombol);
    await screen.findByAltText(/pratinjau poster qr/i);

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /unduh qr/i })).not.toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /bagikan survei/i })).toBeInTheDocument();
  });

  it('KONTROL: Escape tanpa modal pilihan tetap menutup modal Bagikan', async () => {
    const onClose = jest.fn();
    await bukaModal({ onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/**
 * MODAL BAGIKAN SEBAGAI DIALOG (26 Oktober 2026).
 *
 * Ditemukan sebagai pengamatan samping BUG-035: ketika uji E2E-nya dibetulkan,
 * modal ini terpaksa dicari lewat teks judulnya, sebab ia tak punya
 * `role="dialog"`. Bagi pembaca layar ia hanya sepasang <div> -- tanpa tanda
 * bahwa halaman di belakangnya sedang tak dapat dipakai, dan tanpa nama.
 * Tombol silangnya juga tak bernama (isinya hanya ikon), dan fokus tak pernah
 * masuk ke dalam modal maupun dikurung di sana. Ketiganya sudah dibereskan di
 * dialog lain lewat BUG-015; modal ini terlewat.
 */
describe('ShareSurveyModal sebagai dialog', () => {
  const survei = { id: 42, title: 'SKM Loket', status: 'AKTIF' };
  // QR dibuat asinkron; menunggunya mencegah pembaruan state sesudah uji usai.
  const qrSelesai = () => screen.findByAltText(/QR code tautan pengisian survei/);

  it('ber-role dialog modal, dinamai judul surveinya', async () => {
    render(<ShareSurveyModal survey={survei} onClose={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: /bagikan survei.*skm loket/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await qrSelesai();
  });

  it('tombol silang bernama "Tutup" dan menutup modal', async () => {
    const onClose = jest.fn();
    render(<ShareSurveyModal survey={survei} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await qrSelesai();
  });

  it('fokus berpindah ke dalam dialog begitu ia terbuka', async () => {
    render(<ShareSurveyModal survey={survei} onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toHaveFocus();
    await qrSelesai();
  });

  it('Tab dari elemen terfokus terakhir melingkar kembali ke yang pertama', async () => {
    render(<ShareSurveyModal survey={survei} onClose={() => {}} />);
    // Ditunggu LEBIH DULU: tombol unduh baru aktif sesudah QR jadi, dan ia
    // anggota terakhir lingkaran fokus.
    await qrSelesai();

    const dialog = screen.getByRole('dialog');
    const terfokus = Array.from(
      dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'),
    );
    const pertama = terfokus[0];
    const terakhir = terfokus[terfokus.length - 1];

    terakhir.focus();
    fireEvent.keyDown(terakhir, { key: 'Tab' });

    expect(pertama).toHaveFocus();
  });
});
