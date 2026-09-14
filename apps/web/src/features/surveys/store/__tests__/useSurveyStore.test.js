import useSurveyStore from '../useSurveyStore';
import { submitSurveyResponse, submitPublicSurveyResponse } from '../../services/surveys.api';
import { tandaiSudahMengisi } from '@/utils/surveyFillMarker';

jest.mock('../../services/surveys.api', () => ({
  submitSurveyResponse: jest.fn().mockResolvedValue({ id: 1 }),
  submitPublicSurveyResponse: jest.fn().mockResolvedValue({ id: 2 }),
}));
jest.mock('@/utils/surveyFillMarker', () => ({
  tandaiSudahMengisi: jest.fn(),
  sudahMengisiDiPeramban: jest.fn().mockReturnValue(false),
}));

const survei = { id: 5, title: 'S', questions: [{ id: 1, type: 'scale_1_to_4' }] };

describe('useSurveyStore — mode anonim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSurveyStore.getState().resetSurvey();
  });

  it('mode bersesi (baku) memakai endpoint berpenjaga', async () => {
    useSurveyStore.getState().initSurvey(survei);
    useSurveyStore.getState().setAnswer(1, '4');

    const hasil = await useSurveyStore.getState().submitSurvey();

    expect(hasil.success).toBe(true);
    expect(submitSurveyResponse).toHaveBeenCalledTimes(1);
    expect(submitPublicSurveyResponse).not.toHaveBeenCalled();
    // Penanda peramban hanya untuk jalur anonim -- responden bersesi sudah
    // dijaga dedupeUserId di backend.
    expect(tandaiSudahMengisi).not.toHaveBeenCalled();
  });

  it('mode anonim memakai endpoint publik dan menandai peramban', async () => {
    useSurveyStore.getState().initSurvey(survei, { anonim: true });
    useSurveyStore.getState().setAnswer(1, '4');

    const hasil = await useSurveyStore.getState().submitSurvey();

    expect(hasil.success).toBe(true);
    expect(submitPublicSurveyResponse).toHaveBeenCalledTimes(1);
    expect(submitSurveyResponse).not.toHaveBeenCalled();
    expect(tandaiSudahMengisi).toHaveBeenCalledWith(5);
  });

  /**
   * Token captcha (14 September 2026). Ia diperoleh belakangan -- widget-nya
   * memanggil balik sesudah pengunjung lolos -- jadi ia TIDAK boleh ikut
   * `dataPublik` yang diisi sekali di gerbang awal. Token Turnstile juga
   * kedaluwarsa dalam hitungan menit, sedangkan mengisi survei bisa lebih lama.
   */
  it('token captcha ikut terkirim pada jalur publik', async () => {
    useSurveyStore.getState().initSurvey(survei, { anonim: true });
    useSurveyStore.getState().setCaptchaToken('token-dari-widget');

    await useSurveyStore.getState().submitSurvey();

    const argumen = submitPublicSurveyResponse.mock.calls[0];
    expect(argumen[3].captchaToken).toBe('token-dari-widget');
  });

  it('pengiriman anonim yang GAGAL tidak menandai peramban', async () => {
    submitPublicSurveyResponse.mockRejectedValueOnce(new Error('jaringan'));
    useSurveyStore.getState().initSurvey(survei, { anonim: true });

    const hasil = await useSurveyStore.getState().submitSurvey();

    expect(hasil.success).toBe(false);
    // Menandai lebih dulu akan mengunci responden dari survei yang belum tersimpan.
    expect(tandaiSudahMengisi).not.toHaveBeenCalled();
  });

  it('resetSurvey mengembalikan mode ke bersesi', () => {
    useSurveyStore.getState().initSurvey(survei, { anonim: true });
    expect(useSurveyStore.getState().isAnonimMode).toBe(true);

    useSurveyStore.getState().resetSurvey();

    expect(useSurveyStore.getState().isAnonimMode).toBe(false);
  });
});
