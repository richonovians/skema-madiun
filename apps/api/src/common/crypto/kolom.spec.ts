import { randomBytes } from 'node:crypto';
import { AWALAN_KOLOM, dekripsiKolom, enkripsiKolom, kolomTerenkripsi } from './kolom';

const KUNCI = randomBytes(32);

describe('kolom', () => {
  it('pulang-pergi mengembalikan teks yang sama', () => {
    const teks = 'Pungli oleh Pak Budi di loket 3, saya diminta Rp50.000';
    expect(dekripsiKolom(enkripsiKolom(teks, KUNCI), KUNCI)).toBe(teks);
  });

  it('teks panjang dan berhuruf non-ASCII tetap utuh', () => {
    const teks = `${'Keluhan warga — panjang sekali. '.repeat(200)}naïve café 日本語`;
    expect(dekripsiKolom(enkripsiKolom(teks, KUNCI), KUNCI)).toBe(teks);
  });

  it('hasilnya berawalan enc:v1: dan tak memuat teks aslinya', () => {
    const hasil = enkripsiKolom('Pak Budi di loket 3', KUNCI);
    expect(hasil.startsWith(AWALAN_KOLOM)).toBe(true);
    expect(hasil).not.toContain('Pak Budi');
    expect(hasil).not.toContain('loket');
  });

  it('teks yang sama menghasilkan blob berbeda tiap kali', () => {
    expect(enkripsiKolom('sama', KUNCI)).not.toBe(enkripsiKolom('sama', KUNCI));
  });

  it('teks polos lama dikembalikan apa adanya', () => {
    expect(dekripsiKolom('pengaduan lama sebelum enkripsi', KUNCI)).toBe(
      'pengaduan lama sebelum enkripsi',
    );
  });

  it('teks kosong tetap kosong, bukan blob', () => {
    expect(enkripsiKolom('', KUNCI)).toBe('');
    expect(dekripsiKolom('', KUNCI)).toBe('');
  });

  it('blob yang dirusak melempar, bukan mengembalikan sampah', () => {
    const utuh = enkripsiKolom('rahasia', KUNCI);
    const rusak = `${utuh.slice(0, -4)}AAAA`;
    expect(() => dekripsiKolom(rusak, KUNCI)).toThrow();
  });

  it('kunci yang salah melempar', () => {
    const blob = enkripsiKolom('rahasia', KUNCI);
    expect(() => dekripsiKolom(blob, randomBytes(32))).toThrow();
  });

  it('kolomTerenkripsi membedakan blob dari teks polos', () => {
    expect(kolomTerenkripsi(enkripsiKolom('x', KUNCI))).toBe(true);
    expect(kolomTerenkripsi('teks biasa')).toBe(false);
    expect(kolomTerenkripsi('')).toBe(false);
  });

  it('mengenkripsi dua kali tidak melapis ganda', () => {
    // Skrip migrasi berjalan ulang-alik; melapis akan membuat teks terbaca
    // sebagai `enc:v1:` di dalam `enc:v1:` dan dekripsi satu lapis mengembalikan
    // blob, bukan teks.
    const sekali = enkripsiKolom('rahasia warga', KUNCI);
    const duaKali = enkripsiKolom(sekali, KUNCI);
    expect(duaKali).toBe(sekali);
  });
});
