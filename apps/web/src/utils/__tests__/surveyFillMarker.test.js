import { sudahMengisiDiPeramban, tandaiSudahMengisi } from '../surveyFillMarker';

describe('penanda pengisian survei di peramban', () => {
  beforeEach(() => localStorage.clear());

  it('belum ditandai -> false', () => {
    expect(sudahMengisiDiPeramban(7)).toBe(false);
  });

  it('sesudah ditandai -> true, dan hanya untuk survei itu', () => {
    tandaiSudahMengisi(7);

    expect(sudahMengisiDiPeramban(7)).toBe(true);
    expect(sudahMengisiDiPeramban(8)).toBe(false);
  });

  it('id berupa string dan angka diperlakukan sama (params rute selalu string)', () => {
    tandaiSudahMengisi(7);

    expect(sudahMengisiDiPeramban('7')).toBe(true);
  });

  it('penyimpanan yang melempar (mode privat) tidak menjatuhkan halaman', () => {
    const asliSet = Storage.prototype.setItem;
    const asliGet = Storage.prototype.getItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    Storage.prototype.getItem = () => {
      throw new Error('SecurityError');
    };

    expect(() => tandaiSudahMengisi(9)).not.toThrow();
    // Menolak pengisian karena penanda tak terbaca akan menghukum responden
    // yang sah -- jadi kegagalan baca berarti "belum mengisi".
    expect(sudahMengisiDiPeramban(9)).toBe(false);

    Storage.prototype.setItem = asliSet;
    Storage.prototype.getItem = asliGet;
  });
});
