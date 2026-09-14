import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalKirimSurvei from '../ModalKirimSurvei';
import useSurveyStore from '../../store/useSurveyStore';

jest.mock('../../store/useSurveyStore');

/**
 * TurnstileWidget diganti tiruan: jsdom tak menjalankan skrip Cloudflare, dan
 * uji yang menghubungi jaringan akan gagal di mesin tanpa internet serta lambat
 * di mesin yang punya. Yang diuji di sini adalah MODALNYA -- kapan tombol kirim
 * boleh ditekan, dan apakah token benar-benar sampai ke store.
 */
jest.mock('../TurnstileWidget', () => ({
  __esModule: true,
  default: ({ onToken }) => (
    <button type="button" onClick={() => onToken('token-dari-cloudflare')}>
      selesaikan captcha
    </button>
  ),
}));

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
});
