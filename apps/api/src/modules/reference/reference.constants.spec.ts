import { namaUnsur } from './reference.constants';

describe('namaUnsur', () => {
  it('menerjemahkan kode unsur baku ke nama resminya', () => {
    expect(namaUnsur('U1')).toBe('Persyaratan');
    expect(namaUnsur('U9')).toBe('Penanganan Pengaduan, Saran, dan Masukan');
  });

  it('mengembalikan null untuk kode yang tidak dikenal', () => {
    expect(namaUnsur('X1')).toBeNull();
  });

  it('mengembalikan null untuk kode kosong, null, atau tak ada', () => {
    expect(namaUnsur('')).toBeNull();
    expect(namaUnsur(null)).toBeNull();
    expect(namaUnsur(undefined)).toBeNull();
  });
});
