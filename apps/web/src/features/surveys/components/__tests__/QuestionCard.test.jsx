import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionCard from '../QuestionCard';
import useSurveyStore from '../../store/useSurveyStore';

// Mock Zustand store
jest.mock('../../store/useSurveyStore');

describe('QuestionCard Component (TC-FE-003)', () => {
  const mockSetAnswer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-FE-003: Hanya menampilkan 4 pilihan (nilai 1-4) dan menolak nilai lain', () => {
    useSurveyStore.mockReturnValue({
      currentStepIndex: 0,
      surveyData: {
        questions: [{ id: 'q1', text: 'Bagaimana pelayanan kami?' }]
      },
      answers: {},
      setAnswer: mockSetAnswer,
    });

    render(<QuestionCard />);

    // Memastikan teks pertanyaan muncul
    expect(screen.getByText('1. Bagaimana pelayanan kami?')).toBeInTheDocument();

    // Memastikan persis ada 4 opsi (radio button) yang dirender, mewakili nilai 1, 2, 3, 4
    const radioInputs = screen.getAllByRole('radio');
    expect(radioInputs).toHaveLength(4);

    // Memastikan value masing-masing adalah '1', '2', '3', '4'
    expect(radioInputs[0]).toHaveAttribute('value', '1');
    expect(radioInputs[1]).toHaveAttribute('value', '2');
    expect(radioInputs[2]).toHaveAttribute('value', '3');
    expect(radioInputs[3]).toHaveAttribute('value', '4');

    // Karena tidak ada input text bebas, user secara alami ditolak memasukkan nilai -1 atau 5.
    // Uji pemilihan salah satu opsi (misal nilai 4)
    fireEvent.click(radioInputs[3]);
    expect(mockSetAnswer).toHaveBeenCalledWith('q1', '4');
  });
});
