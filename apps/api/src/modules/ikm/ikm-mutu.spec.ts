import { IkmMutu } from '@prisma/client';
import { mutuFromNilai } from './ikm.service';

/**
 * Batas tabel konversi mutu PermenPANRB 14/2017 (TC-IKM-011 dan TC-IKM-012).
 *
 * Sampai 18 November 2026 kedua kasus itu hanya dibaca dari kode: uji yang ada
 * menembak IKM 25 dan 100, jauh dari batas mana pun, sehingga `<=` yang
 * berubah menjadi `<` tak akan memerahkan apa pun. Nilai di sini persis di
 * kedua sisi tiap batas, pada presisi dua desimal yang memang diserahkan
 * pemanggilnya (`round(nilaiIkmRaw * 25, 2)`).
 */
describe('mutuFromNilai: batas tabel konversi', () => {
  it.each([
    // D | C
    [64.99, IkmMutu.D],
    [65.0, IkmMutu.C],
    // C | B (TC-IKM-011)
    [76.6, IkmMutu.C],
    [76.61, IkmMutu.B],
    // B | A (TC-IKM-012)
    [88.3, IkmMutu.B],
    [88.31, IkmMutu.A],
  ])('IKM %s -> mutu %s', (nilai, mutu) => {
    expect(mutuFromNilai(nilai)).toBe(mutu);
  });
});
