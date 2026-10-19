import * as path from 'node:path';
import { resolveLampiran, tipeKonten } from './jalur-lampiran';

const DIR = path.resolve('uploads-uji');

describe('resolveLampiran', () => {
  it('menerima jalur lampiran yang wajar dan mengembalikan jalur di dalam direktori', () => {
    const hasil = resolveLampiran(DIR, '/uploads/complaints/abc-foto.png');
    expect(hasil).not.toBeNull();
    expect(path.relative(DIR, hasil as string)).toBe(path.join('complaints', 'abc-foto.png'));
  });

  it('menolak jalur yang keluar dari direktori unggahan', () => {
    expect(resolveLampiran(DIR, '/uploads/../../etc/passwd')).toBeNull();
    expect(resolveLampiran(DIR, '/uploads/complaints/../../../rahasia.env')).toBeNull();
  });

  it('menolak traversal yang disamarkan penyandian persen', () => {
    expect(resolveLampiran(DIR, '/uploads/%2e%2e/%2e%2e/rahasia.env')).toBeNull();
    expect(resolveLampiran(DIR, '/uploads/complaints/%2e%2e%2f%2e%2e%2frahasia.env')).toBeNull();
  });

  it('menolak jalur di luar prefiks /uploads/', () => {
    expect(resolveLampiran(DIR, '/api/v1/users')).toBeNull();
    expect(resolveLampiran(DIR, '/uploadsx/foto.png')).toBeNull();
  });

  it('menolak direktori unggahan itu sendiri', () => {
    expect(resolveLampiran(DIR, '/uploads/')).toBeNull();
  });

  it('menolak byte nol, yang dapat memotong jalur di lapisan bawah', () => {
    expect(resolveLampiran(DIR, '/uploads/foto.png%00.txt')).toBeNull();
  });

  it('menolak penyandian persen yang cacat alih-alih melempar', () => {
    expect(resolveLampiran(DIR, '/uploads/%zz')).toBeNull();
  });
});

describe('tipeKonten', () => {
  it('memetakan empat tipe lampiran yang diizinkan', () => {
    expect(tipeKonten('a.png')).toBe('image/png');
    expect(tipeKonten('a.jpg')).toBe('image/jpeg');
    expect(tipeKonten('a.jpeg')).toBe('image/jpeg');
    expect(tipeKonten('a.webp')).toBe('image/webp');
    expect(tipeKonten('a.pdf')).toBe('application/pdf');
  });

  it('huruf besar pada ekstensi tetap dikenali', () => {
    expect(tipeKonten('a.PNG')).toBe('image/png');
  });

  it('selebihnya octet-stream, bukan tebakan', () => {
    expect(tipeKonten('a.svg')).toBe('application/octet-stream');
    expect(tipeKonten('a.html')).toBe('application/octet-stream');
    expect(tipeKonten('a')).toBe('application/octet-stream');
  });
});
