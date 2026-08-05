import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SurveyNavigation from '../SurveyNavigation';
import useSurveyStore from '../../store/useSurveyStore';

// Mock Zustand store
jest.mock('../../store/useSurveyStore');

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
});
