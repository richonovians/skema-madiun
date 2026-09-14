import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SurveyNavigation from '../SurveyNavigation';
import useSurveyStore from '../../store/useSurveyStore';

// Mock Zustand store
jest.mock('../../store/useSurveyStore');

// Dipakai ModalKirimSurvei yang dibuka tombol "Selesaikan"; jsdom tak
// menjalankan skrip Cloudflare dan uji tak boleh menyentuh jaringan.
jest.mock('../TurnstileWidget', () => ({
  __esModule: true,
  default: () => <div data-testid="turnstile-tiruan" />,
}));

describe('SurveyNavigation Component (TC-FE-008)', () => {
  const mockSubmitSurvey = jest.fn();
  const mockNextStep = jest.fn();
  const mockPrevStep = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-FE-008: Menampilkan loading state dan cegah double-submit', () => {
    // Setup state untuk berada di pertanyaan terakhir dan sedang melakukan submit
    useSurveyStore.mockReturnValue({
      currentStepIndex: 1,
      surveyData: {
        questions: [{ id: 'q1', text: 'Tanya 1' }, { id: 'q2', text: 'Tanya 2' }]
      },
      answers: { 'q1': '3', 'q2': '4' },
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      submitSurvey: mockSubmitSurvey,
      isSubmitting: true, // Sedang loading submit
      submitError: null,
    });

    render(<SurveyNavigation />);

    // Tombol submit harusnya berubah teksnya menjadi "Mengirim..."
    const submitBtn = screen.getByRole('button', { name: /mengirim/i });
    expect(submitBtn).toBeInTheDocument();
    
    // Tombol submit harus dalam state disabled sehingga mencegah double-submit
    expect(submitBtn).toBeDisabled();
    
    // Klik tombol submit (seharusnya tidak memanggil fungsi jika disabled)
    fireEvent.click(submitBtn);
    expect(mockSubmitSurvey).not.toHaveBeenCalled();
  });

  it('bisa disubmit ketika belum loading (Happy Path)', () => {
    // Setup state tidak loading
    useSurveyStore.mockReturnValue({
      currentStepIndex: 1,
      surveyData: {
        questions: [{ id: 'q1', text: 'Tanya 1' }, { id: 'q2', text: 'Tanya 2' }]
      },
      answers: { 'q1': '3', 'q2': '4' },
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      submitSurvey: mockSubmitSurvey,
      isSubmitting: false, // Tidak loading
      submitError: null,
    });

    render(<SurveyNavigation />);

    const submitBtn = screen.getByRole('button', { name: /kirim survei/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
    
    fireEvent.click(submitBtn);
    expect(mockSubmitSurvey).toHaveBeenCalledTimes(1);
  });

  /**
   * Permintaan pengguna 14 September 2026: kalimat "Buka halaman Persetujuan
   * terlebih dahulu" pada penolakan 403 jadi TOMBOL.
   *
   * Dikenali lewat `submitErrorCode`, bukan bunyi `submitError` -- pesan dapat
   * diubah kapan saja tanpa ada yang memerah.
   */
  describe('penolakan karena persetujuan PDP', () => {
    const pasangGalat = (submitError, submitErrorCode) =>
      useSurveyStore.mockReturnValue({
        currentStepIndex: 1,
        surveyData: {
          questions: [
            { id: 'q1', text: 'Tanya 1' },
            { id: 'q2', text: 'Tanya 2' },
          ],
        },
        answers: { q1: '3', q2: '4' },
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        submitSurvey: mockSubmitSurvey,
        isSubmitting: false,
        submitError,
        submitErrorCode,
      });

    it('menawarkan tombol menuju halaman persetujuan', () => {
      pasangGalat(
        'Anda perlu memberikan persetujuan pemrosesan data pribadi sebelum mengirim data.',
        'CONSENT_REQUIRED',
      );

      render(<SurveyNavigation />);

      expect(screen.getByRole('link', { name: /persetujuan/i })).toHaveAttribute(
        'href',
        '/persetujuan',
      );
    });

    /**
     * PASANGAN yang membuat uji di atas berarti: tombol yang muncul pada galat
     * APA PUN akan tetap hijau di sana, sambil menyuruh responden membuka
     * halaman persetujuan ketika masalahnya sebenarnya jaringan putus.
     */
    it('galat biasa TIDAK menawarkan tombol itu', () => {
      pasangGalat('Gagal mengirim survei. Silakan coba lagi.', null);

      render(<SurveyNavigation />);

      expect(screen.getByText(/gagal mengirim survei/i)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /persetujuan/i })).not.toBeInTheDocument();
    });
  });
  /**
   * Permintaan pengguna 14 September 2026: di pertanyaan terakhir jalur TANPA
   * AKUN, tombolnya berbunyi "Selesaikan" dan membuka modal berisi captcha --
   * pengirimannya baru terjadi dari dalam modal itu.
   */
  describe('langkah terakhir pada jalur tanpa akun', () => {
    const pasangTanpaAkun = (ubahan = {}) =>
      useSurveyStore.mockReturnValue({
        currentStepIndex: 1,
        surveyData: {
          questions: [
            { id: 'q1', text: 'Tanya 1' },
            { id: 'q2', text: 'Tanya 2' },
          ],
        },
        answers: { q1: '3', q2: '4' },
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        submitSurvey: mockSubmitSurvey,
        isSubmitting: false,
        submitError: null,
        submitErrorCode: null,
        isAnonimMode: true,
        captchaToken: null,
        setCaptchaToken: jest.fn(),
        ...ubahan,
      });

    it('berlabel "Selesaikan" dan menekannya TIDAK langsung mengirim', () => {
      pasangTanpaAkun();

      render(<SurveyNavigation />);
      const tombol = screen.getByRole('button', { name: /selesaikan/i });
      fireEvent.click(tombol);

      expect(mockSubmitSurvey).not.toHaveBeenCalled();
    });

    it('menekannya memunculkan modal verifikasi', () => {
      pasangTanpaAkun();

      render(<SurveyNavigation />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /selesaikan/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('turnstile-tiruan')).toBeInTheDocument();
    });

    /**
     * PASANGAN yang membuat kedua uji di atas berarti. Modal yang muncul bagi
     * SEMUA pengisi juga akan meluluskan keduanya, sambil memaksa pengguna
     * berlogin melewati verifikasi yang memang tak pernah berlaku baginya --
     * captcha hanya ada di jalur publik.
     */
    it('KONTROL: dengan akun tetap "Kirim Survei" dan langsung mengirim', () => {
      pasangTanpaAkun({ isAnonimMode: false });

      render(<SurveyNavigation />);
      fireEvent.click(screen.getByRole('button', { name: /kirim survei/i }));

      expect(mockSubmitSurvey).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('bukan langkah terakhir: tetap "Selanjutnya", tak ada modal', () => {
      pasangTanpaAkun({ currentStepIndex: 0 });

      render(<SurveyNavigation />);
      fireEvent.click(screen.getByRole('button', { name: /selanjutnya/i }));

      expect(mockNextStep).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
