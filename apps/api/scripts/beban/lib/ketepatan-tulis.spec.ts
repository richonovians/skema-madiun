import {
  bacaTungguUlang,
  buatPemutar,
  nilaiKetepatan,
  puncakSerentak,
  ringkasKode,
} from './ketepatan-tulis';

describe('nilaiKetepatan', () => {
  it('cocok bila selisih baris sama dengan jawaban 2xx', () => {
    expect(nilaiKetepatan('complaints', 100, 150, 50)).toEqual({
      tabel: 'complaints',
      selisih: 50,
      diharapkan: 50,
      cocok: true,
    });
  });

  it('tulisan HILANG: 2xx lebih banyak daripada baris baru', () => {
    expect(nilaiKetepatan('complaints', 100, 149, 50).cocok).toBe(false);
  });

  it('tulisan BERGANDA: baris baru lebih banyak daripada 2xx', () => {
    expect(nilaiKetepatan('complaints', 100, 151, 50).cocok).toBe(false);
  });
});

describe('ringkasKode', () => {
  it('menghitung per kode HTTP, galat jaringan sebagai "galat"', () => {
    expect(ringkasKode([201, 201, 429, 201, null, 429])).toEqual({
      '201': 3,
      '429': 2,
      galat: 1,
    });
  });
});

describe('puncakSerentak', () => {
  it('permintaan beruntun tak pernah tumpang tindih', () => {
    expect(
      puncakSerentak([
        { mulai: 0, selesai: 10 },
        { mulai: 10, selesai: 20 },
        { mulai: 20, selesai: 30 },
      ]),
    ).toBe(1);
  });

  it('permintaan yang semuanya berangkat sebelum satu pun selesai bertumpuk penuh', () => {
    expect(
      puncakSerentak([
        { mulai: 0, selesai: 50 },
        { mulai: 1, selesai: 40 },
        { mulai: 2, selesai: 30 },
        { mulai: 3, selesai: 60 },
      ]),
    ).toBe(4);
  });

  it('tumpang tindih sebagian dihitung pada titik terpadatnya', () => {
    expect(
      puncakSerentak([
        { mulai: 0, selesai: 10 },
        { mulai: 5, selesai: 15 },
        { mulai: 12, selesai: 20 },
      ]),
    ).toBe(2);
  });
});

describe('buatPemutar', () => {
  it('membagi permintaan rata: k putaran penuh memberi tiap akun tepat k kali', () => {
    const ambil = buatPemutar(['a', 'b', 'c']);
    const hitung: Record<string, number> = {};
    for (let i = 0; i < 30; i += 1) {
      const t = ambil();
      hitung[t] = (hitung[t] ?? 0) + 1;
    }
    expect(hitung).toEqual({ a: 10, b: 10, c: 10 });
  });

  it('menolak daftar kosong', () => {
    expect(() => buatPemutar([])).toThrow();
  });
});

describe('bacaTungguUlang', () => {
  it('Retry-After dalam detik menjadi milidetik, ditambah satu detik penyangga', () => {
    expect(bacaTungguUlang('37')).toBe(38_000);
  });

  it('tanpa header atau isinya rusak: satu jendela penuh 60 detik', () => {
    expect(bacaTungguUlang(null)).toBe(60_000);
    expect(bacaTungguUlang('besok')).toBe(60_000);
  });
});
