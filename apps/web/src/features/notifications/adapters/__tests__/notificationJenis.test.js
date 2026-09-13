import { gayaJenisNotifikasi, JENIS_NOTIFIKASI } from '../notificationJenis';

/**
 * 13 September 2026. Halaman riwayat notifikasi terbaca sebagai dinding teks:
 * "Pengaduan Baru Masuk" muncul tiga kali beruntun dengan bentuk persis sama,
 * sehingga mata tak punya pegangan untuk memindai. Ikon per jenis adalah
 * pembedanya.
 *
 * `type` SUDAH dikirim backend dan diteruskan adapter sejak awal, tapi tak
 * pernah dipakai satu komponen pun.
 */
describe('gayaJenisNotifikasi', () => {
  const SEMUA = Object.keys(JENIS_NOTIFIKASI);

  it('mengenali keempat jenis yang benar-benar dibuat backend', () => {
    expect(SEMUA.sort()).toEqual(
      [
        'complaint_created',
        'complaint_reply',
        'complaint_status_changed',
        'survey_response_created',
      ].sort(),
    );
  });

  it('tiap jenis punya ikon yang berbeda satu sama lain', () => {
    const ikon = SEMUA.map((t) => gayaJenisNotifikasi(t).Ikon);
    expect(new Set(ikon).size).toBe(SEMUA.length);
  });

  /**
   * Warna boleh berbagi rona antar jenis yang serumpun -- palet proyek ini
   * hanya punya tiga rona -- tetapi pasangan ikon+warna harus tetap unik,
   * sebab itulah yang dilihat pengguna sebagai "baris ini beda".
   */
  it('pasangan ikon+warna unik untuk tiap jenis', () => {
    const pasangan = SEMUA.map((t) => {
      const g = gayaJenisNotifikasi(t);
      return `${g.Ikon.displayName ?? g.Ikon.name}|${g.kelasIkon}`;
    });
    expect(new Set(pasangan).size).toBe(SEMUA.length);
  });

  it('tiap jenis punya label yang dapat dibacakan pembaca layar', () => {
    for (const t of SEMUA) {
      expect(gayaJenisNotifikasi(t).label).toMatch(/\S/);
    }
  });

  /**
   * Jenis baru akan muncul lagi: `survey_response_created` sendiri baru
   * ditambahkan hari ini. Yang belum dikenal harus tetap tampil wajar, bukan
   * meledak atau meninggalkan lingkaran kosong.
   */
  it.each([['jenis_yang_belum_ada'], [undefined], [null], ['']])(
    'jenis tak dikenal (%s) jatuh ke gaya cadangan, bukan galat',
    (t) => {
      const gaya = gayaJenisNotifikasi(t);
      expect(gaya.Ikon).toBeTruthy();
      expect(gaya.kelasIkon).toMatch(/\S/);
      expect(gaya.label).toMatch(/\S/);
    },
  );

  it('gaya cadangan tidak menyamar sebagai salah satu jenis yang dikenal', () => {
    const cadangan = gayaJenisNotifikasi('jenis_yang_belum_ada');
    const dikenal = SEMUA.map((t) => gayaJenisNotifikasi(t).Ikon);
    expect(dikenal).not.toContain(cadangan.Ikon);
  });
});
