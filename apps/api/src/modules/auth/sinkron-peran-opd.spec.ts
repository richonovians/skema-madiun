import { JenisPengguna, Role } from '@prisma/client';
import { peranSetelahSinkron } from './sinkron-peran-opd';

/**
 * Pencabutan peran `opd` saat login (6 Oktober 2026).
 *
 * PERMINTAAN PENGGUNA: "jika opd id berganti maka yang semula menjadi admin opd
 * lama akan otomatis hangus dan berganti menjadi masyarakat biasa, sampai admin
 * kab mengatur menjadi admin opd lagi."
 *
 * YANG DIJAGA UJI INI, dan mengapa segitu banyak untuk satu fungsi: berkas ini
 * satu-satunya tempat SSO boleh MENURUNKAN hak seseorang. Keputusan 27 Agustus
 * 2026 menolak sinkronisasi peran pada setiap login justru karena klaim yang
 * hilang akan mencabut hak setiap Admin OPD sekaligus, dan kegagalan itu
 * SENYAP. Aturan di sini hidup bersama keputusan itu dengan satu syarat keras:
 * klaim yang TIDAK ADA tidak pernah mencabut apa pun. Beberapa uji di bawah ada
 * khusus untuk menjaga syarat itu, bukan untuk menjaga pencabutannya.
 */
describe('peranSetelahSinkron', () => {
  const dasar = {
    roles: [Role.opd, Role.responden],
    opdIdTersimpan: 16,
    opdIdDariKlaim: null,
    jenisPenggunaDariKlaim: null,
  };

  describe('mencabut', () => {
    it('mencabut peran opd ketika klaim OPD menunjuk instansi yang BERBEDA', () => {
      const hasil = peranSetelahSinkron({ ...dasar, opdIdDariKlaim: 28 });
      expect(hasil.roles).toEqual([Role.responden]);
      expect(hasil.alasan).toBe('opd-berganti');
    });

    it('mencabut peran opd ketika Helpdesk menyatakan orangnya bukan ASN lagi', () => {
      const hasil = peranSetelahSinkron({
        ...dasar,
        jenisPenggunaDariKlaim: JenisPengguna.masyarakat,
      });
      expect(hasil.roles).toEqual([Role.responden]);
      expect(hasil.alasan).toBe('bukan-asn');
    });

    it('menyisakan responden ketika opd satu-satunya peran yang dipunyai', () => {
      // Akun tanpa satu pun peran tak dapat masuk ke mana pun; `responden`
      // adalah jaring pengamannya, bentuk yang sama dengan resolveRolesAndOpd.
      const hasil = peranSetelahSinkron({
        ...dasar,
        roles: [Role.opd],
        opdIdDariKlaim: 28,
      });
      expect(hasil.roles).toEqual([Role.responden]);
    });

    it('TIDAK menyentuh peran lain yang dipegang akun yang sama', () => {
      // Pemegang kabupaten+opd kehilangan HANYA opd. Menjatuhkannya menjadi
      // responden akan mencabut hak tertinggi seseorang karena sebab yang tak
      // ada urusannya dengan hak itu.
      const hasil = peranSetelahSinkron({
        ...dasar,
        roles: [Role.kabupaten, Role.opd, Role.responden],
        opdIdDariKlaim: 28,
      });
      expect(hasil.roles).toEqual([Role.kabupaten, Role.responden]);
    });

    it('menyebut `bukan-asn` ketika kedua sebab terjadi sekaligus', () => {
      // Pernyataan "bukan ASN" lebih mendasar daripada "pindah instansi":
      // orang yang bukan ASN tak punya instansi mana pun untuk dikelola.
      const hasil = peranSetelahSinkron({
        ...dasar,
        opdIdDariKlaim: 28,
        jenisPenggunaDariKlaim: JenisPengguna.masyarakat,
      });
      expect(hasil.alasan).toBe('bukan-asn');
    });
  });

  describe('TIDAK mencabut', () => {
    it('membiarkan akun yang memang tak berperan opd', () => {
      const hasil = peranSetelahSinkron({
        ...dasar,
        roles: [Role.responden],
        jenisPenggunaDariKlaim: JenisPengguna.masyarakat,
      });
      expect(hasil.roles).toEqual([Role.responden]);
      expect(hasil.alasan).toBeNull();
    });

    it('membiarkan peran ketika klaim OPD menunjuk instansi yang SAMA', () => {
      const hasil = peranSetelahSinkron({ ...dasar, opdIdDariKlaim: 16 });
      expect(hasil.roles).toEqual([Role.opd, Role.responden]);
      expect(hasil.alasan).toBeNull();
    });

    it('membiarkan peran ketika klaim OPD TIDAK ADA sama sekali', () => {
      // INI uji terpenting di berkas ini. Klaim yang hilang -- scope dicabut,
      // bentuk payload bergeser, konfigurasi salah nama -- tidak boleh
      // mencabut apa pun. Tanpa penjaga ini, satu perubahan di sisi Helpdesk
      // akan melucuti seluruh Admin OPD tanpa suara.
      const hasil = peranSetelahSinkron({ ...dasar, opdIdDariKlaim: null });
      expect(hasil.roles).toEqual([Role.opd, Role.responden]);
      expect(hasil.alasan).toBeNull();
    });

    it('membiarkan peran ketika klaim jenis pengguna TIDAK ADA', () => {
      const hasil = peranSetelahSinkron({ ...dasar, jenisPenggunaDariKlaim: null });
      expect(hasil.alasan).toBeNull();
    });

    it('membiarkan peran ketika Helpdesk menegaskan orangnya ASN', () => {
      const hasil = peranSetelahSinkron({
        ...dasar,
        jenisPenggunaDariKlaim: JenisPengguna.asn,
      });
      expect(hasil.roles).toEqual([Role.opd, Role.responden]);
      expect(hasil.alasan).toBeNull();
    });

    it('tidak menganggap PENGISIAN tautan yang semula kosong sebagai perpindahan', () => {
      // `opdIdTersimpan: null` -> klaim membawa 28. Tak ada instansi lama yang
      // ditinggalkan, jadi tak ada yang berganti. Memperlakukannya sebagai
      // perpindahan akan mencabut peran orang pada login pertamanya.
      const hasil = peranSetelahSinkron({
        ...dasar,
        opdIdTersimpan: null,
        opdIdDariKlaim: 28,
      });
      expect(hasil.roles).toEqual([Role.opd, Role.responden]);
      expect(hasil.alasan).toBeNull();
    });
  });
});
