import { lolosPolaLike } from './pola-like';

describe('lolosPolaLike', () => {
  it.each([
    ['%', '\\%'],
    ['_', '\\_'],
    ['\\', '\\\\'],
    ['dinke_', 'dinke\\_'],
    ['50%_a\\b', '50\\%\\_a\\\\b'],
  ])('%j menjadi %j', (masuk, keluar) => {
    expect(lolosPolaLike(masuk)).toBe(keluar);
  });

  it('teks tanpa karakter khusus dibiarkan', () => {
    expect(lolosPolaLike("Dinas Kesehatan ' OR 1=1--")).toBe("Dinas Kesehatan ' OR 1=1--");
  });
});
