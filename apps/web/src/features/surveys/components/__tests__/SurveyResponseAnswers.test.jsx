import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyResponseAnswers from '../SurveyResponseAnswers';

/**
 * Laporan pengguna 13 September 2026: "detail soal respon nomornya terbalik
 * dengan nomor soal di survei".
 *
 * Komponen ini dulu menomori jawaban dari POSISI ARRAY (`index + 1`), sehingga
 * urutan apa pun yang dikirim backend langsung menjadi nomor soal. Uji di sini
 * menjaga lapis terakhirnya: yang tampil adalah `nomor` dari adapter, bukan
 * posisi barisnya.
 */
const jawaban = (over = {}) => ({
  questionId: 1,
  nomor: 1,
  questionText: 'Kesesuaian pelayanan',
  questionType: 'Skala Penilaian 1-4',
  nilai: 4,
  teks: null,
  selectedOptionId: null,
  nilaiLabel: null,
  selectedOptionLabel: null,
  ...over,
});

describe('SurveyResponseAnswers', () => {
  it('menampilkan nomor soal dari survei, bukan urutan barisnya', () => {
    render(
      <SurveyResponseAnswers
        answers={[
          jawaban({ questionId: 103, nomor: 3, questionText: 'Kenyamanan ruang' }),
          jawaban({ questionId: 102, nomor: 2, questionText: 'Kecepatan petugas' }),
          jawaban({ questionId: 101, nomor: 1, questionText: 'Kesesuaian pelayanan' }),
        ]}
      />,
    );

    // Baris pertama membawa nomor 3: itulah pembedanya. Penomoran berbasis
    // posisi akan menuliskan 1 di sini.
    expect(screen.getByText('3.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('1.')).toBeInTheDocument();

    const baris = screen.getAllByText(/^[0-9]+\.$/).map((el) => el.textContent);
    expect(baris).toEqual(['3.', '2.', '1.']);
  });

  it('nomor yang melompat ditampilkan apa adanya (pertanyaan ditambah belakangan)', () => {
    render(
      <SurveyResponseAnswers
        answers={[
          jawaban({ questionId: 101, nomor: 1 }),
          jawaban({ questionId: 103, nomor: 3, questionText: 'Kenyamanan ruang' }),
        ]}
      />,
    );

    expect(screen.getAllByText(/^[0-9]+\.$/).map((el) => el.textContent)).toEqual(['1.', '3.']);
  });

  it('pertanyaan yang sudah terhapus jatuh ke nomor urut baris, bukan kosong', () => {
    render(
      <SurveyResponseAnswers
        answers={[jawaban({ questionId: 999, nomor: null, questionText: 'Pertanyaan #999' })]}
      />,
    );

    expect(screen.getByText('1.')).toBeInTheDocument();
  });

  it('tanpa jawaban, menyatakan keadaannya', () => {
    render(<SurveyResponseAnswers answers={[]} />);
    expect(screen.getByText(/tidak ada jawaban tercatat/i)).toBeInTheDocument();
  });
});
