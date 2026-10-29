import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyProgress from '../SurveyProgress';
import useSurveyStore from '../../store/useSurveyStore';

jest.mock('../../store/useSurveyStore');

/**
 * BUG-056: penunjuk langkah kuesioner harus tetap JUDUL. PR #5 menurunkannya
 * dari `<h2>` menjadi dua `<p>`, sehingga pembaca layar kehilangan penanda
 * posisi dan `isi-survei.spec.js` tak lagi menemukannya. Tampilannya boleh
 * kecil; perannya yang dijaga di sini.
 */
describe('SurveyProgress', () => {
  it('menyebut posisi pengisi sebagai judul "Pertanyaan X dari Y"', () => {
    useSurveyStore.mockReturnValue({
      currentStepIndex: 1,
      surveyData: { questions: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    });

    render(<SurveyProgress />);

    expect(screen.getByRole('heading', { name: 'Pertanyaan 2 dari 3' })).toBeInTheDocument();
  });
});
