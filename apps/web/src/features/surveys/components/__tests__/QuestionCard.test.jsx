import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionCard from '../QuestionCard';
import useSurveyStore from '../../store/useSurveyStore';
import { DEFAULT_SCALE_LABELS } from '../../constants/scaleLabels';

/**
 * TC-FE-003 (skala 1-4) + TC-FE-029/030 (uraian & pilihan ganda).
 *
 * DITULIS ULANG 2 September 2026. Versi sebelumnya menganggap kartu ini SELALU
 * merender skala 1-4, karena memang begitulah dulu: opsi 1-4 di-hardcode apa pun
 * tipe pertanyaannya. Sejak pertanyaan Uraian & Pilihan Ganda benar-benar bisa
 * dipakai (INT `feat(web): pertanyaan uraian & pilihan ganda bisa dipakai
 * sungguhan`), kartu bercabang menurut `question.type`, dan fixture lama yang
 * tak punya `type` justru jatuh ke cabang "tipe belum dapat ditampilkan"
 * sehingga tak ada satu pun radio yang dirender.
 *
 * Kode tipe di sini ('scale_1_to_4' | 'text' | 'multiple_choice') berasal dari
 * `adaptFillQuestion`, BUKAN label builder berbahasa Indonesia.
 */

jest.mock('../../store/useSurveyStore');

const givenQuestion = (question, answers = {}) => {
  const setAnswer = jest.fn();
  useSurveyStore.mockReturnValue({
    currentStepIndex: 0,
    surveyData: { questions: [question] },
    answers,
    setAnswer,
  });
  return setAnswer;
};

describe('QuestionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('menomori dan menampilkan teks pertanyaan', () => {
    givenQuestion({ id: 'q1', text: 'Bagaimana pelayanan kami?', type: 'scale_1_to_4' });
    render(<QuestionCard />);

    expect(screen.getByText('1. Bagaimana pelayanan kami?')).toBeInTheDocument();
  });

  describe('Tipe skala 1-4 (TC-FE-003)', () => {
    it('merender tepat 4 opsi bernilai 1-4, sehingga nilai lain tak bisa dipilih lewat UI', () => {
      givenQuestion({ id: 'q1', text: 'Bagaimana pelayanan kami?', type: 'scale_1_to_4' });
      render(<QuestionCard />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(4);
      expect(radios.map((r) => r.getAttribute('value'))).toEqual(['1', '2', '3', '4']);
    });

    it('memakai label baku PermenPANRB bila pertanyaan belum punya opsi tersuai', () => {
      givenQuestion({ id: 'q1', text: 'Bagaimana pelayanan kami?', type: 'scale_1_to_4' });
      render(<QuestionCard />);

      DEFAULT_SCALE_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('memakai label tersuai bila pengelola survei menyesuaikannya, tetapi skor tetap 1-4', () => {
      // Sengaja tak berurutan: `scaleStepsFromOptions` mengurutkan menurut skor,
      // supaya tampilan tidak bergantung pada urutan array dari backend.
      givenQuestion({
        id: 'q1',
        text: 'Bagaimana pelayanan kami?',
        type: 'scale_1_to_4',
        options: [
          { id: 12, nilai: 3, label: 'Puas' },
          { id: 10, nilai: 1, label: 'Sangat Tidak Puas' },
          { id: 13, nilai: 4, label: 'Sangat Puas' },
          { id: 11, nilai: 2, label: 'Tidak Puas' },
        ],
      });
      render(<QuestionCard />);

      const radios = screen.getAllByRole('radio');
      // Yang dikirim tetap SKOR, bukan id opsi — rumus IKM bergantung padanya.
      expect(radios.map((r) => r.getAttribute('value'))).toEqual(['1', '2', '3', '4']);
      expect(screen.getByText('Sangat Tidak Puas')).toBeInTheDocument();
      expect(screen.getByText('Sangat Puas')).toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_SCALE_LABELS[0])).not.toBeInTheDocument();
    });

    it('meneruskan skor yang dipilih ke store', () => {
      const setAnswer = givenQuestion({ id: 'q1', text: 'Pelayanan?', type: 'scale_1_to_4' });
      render(<QuestionCard />);

      fireEvent.click(screen.getAllByRole('radio')[3]);
      expect(setAnswer).toHaveBeenCalledWith('q1', '4');
    });
  });

  describe('Tipe uraian', () => {
    it('merender textarea, bukan skala, dan menyatakan bahwa jawabannya opsional', () => {
      givenQuestion({ id: 'q2', text: 'Saran Anda?', type: 'text' });
      render(<QuestionCard />);

      expect(screen.getByPlaceholderText(/tuliskan jawaban anda/i)).toBeInTheDocument();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
      expect(screen.getByText(/tidak wajib dijawab/i)).toBeInTheDocument();
    });

    it('membatasi panjang jawaban dan menghitung karakter yang sudah diketik', () => {
      givenQuestion({ id: 'q2', text: 'Saran Anda?', type: 'text' }, { q2: 'Halo' });
      render(<QuestionCard />);

      const textarea = screen.getByPlaceholderText(/tuliskan jawaban anda/i);
      expect(textarea).toHaveAttribute('maxLength', '1000');
      expect(screen.getByText(/4\/1000 karakter/i)).toBeInTheDocument();
    });

    it('meneruskan teks yang diketik ke store', () => {
      const setAnswer = givenQuestion({ id: 'q2', text: 'Saran Anda?', type: 'text' });
      render(<QuestionCard />);

      fireEvent.change(screen.getByPlaceholderText(/tuliskan jawaban anda/i), {
        target: { value: 'Pelayanannya cepat' },
      });
      expect(setAnswer).toHaveBeenCalledWith('q2', 'Pelayanannya cepat');
    });
  });

  describe('Tipe pilihan ganda', () => {
    const PILIHAN = {
      id: 'q3',
      text: 'Layanan mana yang Anda gunakan?',
      type: 'multiple_choice',
      options: [
        { id: 21, label: 'Rawat Jalan' },
        { id: 22, label: 'Rawat Inap' },
        { id: 23, label: 'IGD' },
      ],
    };

    it('merender satu opsi per pilihan, berlabel huruf A, B, C', () => {
      givenQuestion(PILIHAN);
      render(<QuestionCard />);

      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(screen.getByText('Rawat Jalan')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('mengirim ID OPSI, bukan nomor urut — inilah yang dulu ditolak backend', () => {
      const setAnswer = givenQuestion(PILIHAN);
      render(<QuestionCard />);

      const radios = screen.getAllByRole('radio');
      expect(radios.map((r) => r.getAttribute('value'))).toEqual(['21', '22', '23']);

      fireEvent.click(radios[1]);
      expect(setAnswer).toHaveBeenCalledWith('q3', '22');
    });

    it('berterus terang ketika opsi jawabannya kosong, bukan menampilkan skala yang salah', () => {
      givenQuestion({ ...PILIHAN, options: [] });
      render(<QuestionCard />);

      expect(screen.getByText(/opsi jawaban pertanyaan ini belum tersedia/i)).toBeInTheDocument();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });
  });

  it('menampilkan peringatan, bukan layar kosong, untuk tipe yang tak dikenal', () => {
    givenQuestion({ id: 'q4', text: 'Pertanyaan masa depan', type: 'matriks' });
    render(<QuestionCard />);

    expect(screen.getByText(/tipe pertanyaan .*matriks.* belum dapat ditampilkan/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
