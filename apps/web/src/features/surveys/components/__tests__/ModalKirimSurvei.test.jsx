import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import ModalKirimSurvei from '../ModalKirimSurvei';
import useSurveyStore from '../../store/useSurveyStore';

jest.mock('../../store/useSurveyStore');

/**
 * TurnstileWidget diganti tiruan: jsdom tak menjalankan skrip Cloudflare, dan
 * uji yang menghubungi jaringan akan gagal di mesin tanpa internet serta lambat
 * di mesin yang punya. Yang diuji di sini adalah MODALNYA -- kapan tombol kirim
 * boleh ditekan, dan apakah token benar-benar sampai ke store.
 */
jest.mock('../TurnstileWidget', () => {
  const ReactTiruan = require('react');
  // Dihitung di dalam factory, bukan di luar: `jest.mock` diangkat ke atas
  // seluruh impor, jadi variabel modul uji belum tentu sudah terisi saat
  // factory ini dijalankan.
  let pemasangan = 0;

  return {
    __esModule: true,
    default: ({ onToken, onError }) => {
      // Nomor pemasangan dipakai uji "muat ulang" untuk membuktikan widgetnya
      // benar-benar DIPASANG ULANG, bukan sekadar peringatannya yang hilang.
      const nomor = ReactTiruan.useMemo(() => ++pemasangan, []);
      return (
        <div>
          <span data-testid="pemasangan-captcha">{nomor}</span>
          <button type="button" onClick={() => onToken('token-dari-cloudflare')}>
            selesaikan captcha
          </button>
          <button type="button" onClick={() => onError?.()}>
            picu galat captcha
          </button>
        </div>
      );
    },
  };
});

const asalEnv = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

describe('ModalKirimSurvei', () => {
  const mockSubmit = jest.fn();
  const mockSetToken = jest.fn();
  const mockBatal = jest.fn();

  const pasangStore = (ubahan = {}) =>
    useSurveyStore.mockReturnValue({
      submitSurvey: mockSubmit,
      isSubmitting: false,
      submitError: null,
      submitErrorCode: null,
      captchaToken: null,
      setCaptchaToken: mockSetToken,
      ...ubahan,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = asalEnv;
  });

  const tombolKirim = () => screen.getByRole('button', { name: /kirim survei/i });

  it('tertutup tidak merender apa pun', () => {
    pasangStore();
    const { container } = render(<ModalKirimSurvei isOpen={false} onBatal={mockBatal} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('terbuka: fokus dipindahkan ke dalam dialognya (BUG-015 bagian 2)', () => {
    pasangStore();

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);

    // `useFocusTrap` terpasang. Diperiksa di sini, bukan di pagar kaitnya:
    // modal ini menuntut store dan widget Turnstile tiruan, dan tiruan itu sudah
    // ada di berkas ini.
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('tombol kirim MATI selama captcha belum diselesaikan', () => {
    pasangStore({ captchaToken: null });

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);

    expect(tombolKirim()).toBeDisabled();
    fireEvent.click(tombolKirim());
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('tombol kirim HIDUP begitu tokennya ada, dan mengirim sekali', () => {
    pasangStore({ captchaToken: 'token-dari-cloudflare' });

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);

    expect(tombolKirim()).not.toBeDisabled();
    fireEvent.click(tombolKirim());
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('token dari widget diteruskan ke store', () => {
    pasangStore();

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);
    fireEvent.click(screen.getByText('selesaikan captcha'));

    expect(mockSetToken).toHaveBeenCalledWith('token-dari-cloudflare');
  });

  /**
   * KONTROL yang menjaga mesin pengembang. Tanpa site key, TurnstileWidget tak
   * merender apa pun dan tokennya tak akan pernah datang; tombol yang dikunci
   * ke token tanpa syarat akan mati selamanya dan survei jadi tak dapat dikirim
   * sama sekali di setiap mesin yang tak punya kunci Cloudflare.
   */
  it('tanpa site key tombol kirim TETAP hidup', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '';
    pasangStore({ captchaToken: null });

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);

    expect(tombolKirim()).not.toBeDisabled();
    fireEvent.click(tombolKirim());
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  /**
   * Galat pengiriman harus tampil DI DALAM modal. Pesan yang dirender di
   * belakang overlay tak terbaca sama sekali, dan pengisinya hanya melihat
   * tombol yang seolah tak bereaksi.
   */
  it('galat pengiriman tampil di dalam modal', () => {
    pasangStore({
      captchaToken: 'token-dari-cloudflare',
      submitError: 'Verifikasi captcha gagal. Muat ulang halaman lalu coba lagi.',
    });

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/verifikasi captcha gagal/i);
  });

  it('sedang mengirim: tombol mati dan berbunyi "Mengirim..."', () => {
    pasangStore({ captchaToken: 'token-dari-cloudflare', isSubmitting: true });

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);

    expect(screen.getByRole('button', { name: /mengirim/i })).toBeDisabled();
  });

  it('tombol batal menutup modal tanpa mengirim', () => {
    pasangStore({ captchaToken: 'token-dari-cloudflare' });

    render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);
    fireEvent.click(screen.getByRole('button', { name: /batal/i }));

    expect(mockBatal).toHaveBeenCalledTimes(1);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  /**
   * ── BUG-016: kegagalan captcha harus terbaca, dan harus ada jalan keluar ──
   *
   * Sebelum 20 Oktober 2026 modal ini mengunci tombol kirimnya dari
   * `captchaTersedia() && !captchaToken` dan tak punya jalur lain sama sekali.
   * Token kosong karena GAGAL tak dapat dibedakan dari token kosong karena
   * BELUM, sehingga pengisi yang tokennya tak pernah terbit melihat survei
   * penuh dengan tombol mati dan layar diam. Dipantau 40 detik pada sesi C-16.
   */
  describe('BUG-016 kegagalan captcha', () => {
    const peringatan = () => screen.queryByRole('alert');

    /**
     * KENDALI, dan inilah uji yang membuat pagar di berkas ini mudah berbohong.
     * Keadaan "token belum ada" juga keadaan dua detik pertama SETIAP pengisian
     * yang sehat. Peringatan yang muncul di sini berarti perbaikannya salah,
     * bukan berhasil.
     */
    it('kendali — keadaan awal tidak memunculkan peringatan apa pun', () => {
      pasangStore({ captchaToken: null });

      render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);

      expect(peringatan()).not.toBeInTheDocument();
      expect(tombolKirim()).toBeDisabled();
    });

    it('galat widget memunculkan peringatan beserta tombol muat ulang', () => {
      pasangStore({ captchaToken: null });

      render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);
      fireEvent.click(screen.getByText('picu galat captcha'));

      expect(peringatan()).toHaveTextContent(/verifikasi keamanan gagal/i);
      expect(screen.getByRole('button', { name: /muat ulang verifikasi/i })).toBeEnabled();
    });

    /**
     * Inilah kasus yang SESUNGGUHNYA dilaporkan, dan `onError` saja tak
     * menutupnya. Pada sesi C-16 tak ada satu pun iframe Cloudflare yang
     * terbit: bila skripnya diblokir total, `error-callback` tak pernah
     * dipanggil sama sekali, sehingga tanpa tenggat modal tetap diam selamanya.
     */
    it('tanpa token selama 15 detik dianggap gagal, walau tak ada callback galat', () => {
      jest.useFakeTimers();
      try {
        pasangStore({ captchaToken: null });

        render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);
        expect(peringatan()).not.toBeInTheDocument();

        act(() => {
          jest.advanceTimersByTime(15_000);
        });

        expect(peringatan()).toHaveTextContent(/verifikasi keamanan gagal/i);
      } finally {
        jest.useRealTimers();
      }
    });

    /**
     * Pewaktunya tak boleh berjalan di mesin tanpa kunci Cloudflare: di sana
     * captcha memang tidak dipasang, tombol kirimnya sudah hidup, dan
     * peringatan yang muncul hanya menakuti tanpa sebab.
     */
    it('tanpa site key, tenggat 15 detik tidak memunculkan peringatan', () => {
      jest.useFakeTimers();
      try {
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '';
        pasangStore({ captchaToken: null });

        render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);
        act(() => {
          jest.advanceTimersByTime(15_000);
        });

        expect(peringatan()).not.toBeInTheDocument();
      } finally {
        jest.useRealTimers();
      }
    });

    it('muat ulang menghapus peringatannya DAN memasang ulang widgetnya', () => {
      pasangStore({ captchaToken: null });

      render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);
      const pemasanganAwal = screen.getByTestId('pemasangan-captcha').textContent;

      fireEvent.click(screen.getByText('picu galat captcha'));
      expect(peringatan()).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /muat ulang verifikasi/i }));

      expect(peringatan()).not.toBeInTheDocument();
      // Bukan sekadar peringatan yang hilang: widgetnya harus benar-benar
      // dipasang ulang, sebab itulah yang meminta tantangan baru ke Cloudflare
      // dan yang mengosongkan token basi lewat blok pembersihnya sendiri.
      expect(screen.getByTestId('pemasangan-captcha').textContent).not.toBe(pemasanganAwal);
    });

    /**
     * Tombolnya TETAP terkunci, dan itu keputusan yang disengaja. Membukanya
     * hanya memindahkan kegagalan ke `403 CAPTCHA_TIDAK_SAH` dari server, dan
     * yang diminta laporan BUG-016 adalah pemberitahuan beserta jalan keluar,
     * bukan tombol yang menipu.
     */
    it('tombol kirim tetap terkunci sesudah galat captcha', () => {
      pasangStore({ captchaToken: null });

      render(<ModalKirimSurvei isOpen onBatal={mockBatal} />);
      fireEvent.click(screen.getByText('picu galat captcha'));

      expect(tombolKirim()).toBeDisabled();
      fireEvent.click(tombolKirim());
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });
});
