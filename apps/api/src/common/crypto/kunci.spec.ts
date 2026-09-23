import { bacaKunci, KUNCI_UJI } from './kunci';

const SAH = 'f'.repeat(64);

describe('bacaKunci', () => {
  it('mengubah 64 karakter heksadesimal menjadi 32 byte', () => {
    const kunci = bacaKunci(SAH, 'DATA_ENCRYPTION_KEY', 'production');
    expect(kunci).toHaveLength(32);
    expect(kunci.toString('hex')).toBe(SAH);
  });

  it('kosong di NODE_ENV=test jatuh ke kunci uji tetap', () => {
    expect(bacaKunci('', 'DATA_ENCRYPTION_KEY', 'test').toString('hex')).toBe(KUNCI_UJI);
  });

  it('kosong di production melempar dan menyebut nama variabelnya', () => {
    expect(() => bacaKunci('', 'DATA_ENCRYPTION_KEY', 'production')).toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it('kosong di development melempar juga, bukan diam-diam memakai kunci uji', () => {
    expect(() => bacaKunci('', 'BACKUP_ENCRYPTION_KEY', 'development')).toThrow(
      /BACKUP_ENCRYPTION_KEY/,
    );
  });

  it('panjang yang salah melempar, bukan dipotong diam-diam', () => {
    expect(() => bacaKunci('ff', 'DATA_ENCRYPTION_KEY', 'production')).toThrow();
    expect(() => bacaKunci('f'.repeat(63), 'DATA_ENCRYPTION_KEY', 'production')).toThrow();
    expect(() => bacaKunci('f'.repeat(65), 'DATA_ENCRYPTION_KEY', 'production')).toThrow();
  });

  it('karakter di luar heksadesimal melempar', () => {
    expect(() => bacaKunci('g'.repeat(64), 'DATA_ENCRYPTION_KEY', 'production')).toThrow();
  });

  it('pesan galatnya menunjuk cara membuat kunci dan dokumen risikonya', () => {
    expect(() => bacaKunci('', 'DATA_ENCRYPTION_KEY', 'production')).toThrow(
      /openssl rand -hex 32/,
    );
    expect(() => bacaKunci('', 'DATA_ENCRYPTION_KEY', 'production')).toThrow(
      /enkripsi-at-rest\.md/,
    );
  });
});
