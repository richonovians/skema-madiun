import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  JAM_JALAN,
  PEMUSNAHAN_MINIMUM_HARI,
  SurveiPemusnahanService,
  UKURAN_KELOMPOK,
} from './survei-pemusnahan.service';

/**
 * PEMUSNAHAN OTOMATIS SURVEI DI SAMPAH (30 September 2026, permintaan pengguna:
 * setahun).
 *
 * LIMA SIFAT YANG DIJAGA BERKAS INI, dan semuanya ada karena pemusnahannya
 * PERMANEN serta ikut membawa jawaban warga:
 *
 * 1. SURVEI BERESPONS TIDAK DISENTUH. Ini keputusan pengguna dan sifat paling
 *    penting di sini. Survei yang sudah terlanjur dijawab warga memuat hasil
 *    pengukuran IKM; ia menunggu keputusan manusia, bukan lewatnya waktu.
 * 2. MENYALA SECARA BAKU, tetapi dapat dimatikan tersurat lewat
 *    `SURVEY_PURGE_ENABLED=false`. Bedanya dari retensi log audit disengaja:
 *    yang diminta memang fitur yang berjalan sendiri.
 * 3. PALANG NILAI PENDEK. Satu digit hilang mengubah 365 menjadi 36. Di bawah
 *    `PEMUSNAHAN_MINIMUM_HARI` ia menolak berjalan kecuali diizinkan tersurat.
 * 4. KERING DULU. Mode kering menghitung tanpa memusnahkan, supaya dampaknya
 *    dapat dilihat sebelum dijalankan sungguhan.
 * 5. SATU LINTASAN, SATU KELOMPOK. Tak ada pengulangan sampai habis, dan itu
 *    disengaja -- lihat alasannya pada uji "tidak mengulang sampai habis".
 */
function buat(
  nilai: { hari?: number; nyala?: boolean; izinPendek?: boolean } = {},
  surveyOverride: Partial<Record<string, jest.Mock>> = {},
) {
  const hapusMany = jest.fn().mockResolvedValue({ count: 0 });
  // DIGABUNG, bukan menggantikan. `operasiPemusnahanSurvei` memanggil
  // `survey.delete` saat menyusun daftar operasinya, jadi override yang
  // menukar seluruh objek `survey` akan menghapus metode yang tak ada
  // hubungannya dengan apa yang sedang diuji.
  const prisma = {
    survey: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      ...surveyOverride,
    },
    answer: { deleteMany: hapusMany },
    surveyResponse: { deleteMany: hapusMany },
    questionOption: { deleteMany: hapusMany },
    question: { deleteMany: hapusMany },
    ikmResult: { deleteMany: hapusMany },
    $transaction: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;

  const config = {
    get: jest.fn((kunci: string) => {
      if (kunci === 'survey.purgeDays') return nilai.hari ?? 365;
      if (kunci === 'survey.purgeEnabled') return nilai.nyala ?? true;
      if (kunci === 'survey.purgeAllowShort') return nilai.izinPendek ?? false;
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new SurveiPemusnahanService(prisma, config);
  return { service, prisma, config };
}

/** Waktu SETEMPAT, bukan UTC: penjadwalnya memakai jam server. */
const setempat = (jam: number, menit = 0) => new Date(2026, 8, 30, jam, menit, 0, 0);

describe('SurveiPemusnahanService', () => {
  describe('batasWaktu', () => {
    it('tepat N hari sebelum waktu acuan, sampai milidetiknya', () => {
      const { service } = buat();
      const sekarang = new Date('2026-09-30T04:00:00.000Z');

      expect(service.batasWaktu(365, sekarang).toISOString()).toBe('2025-09-30T04:00:00.000Z');
    });

    it('memakai waktu acuan yang diberikan, bukan jam dinding', () => {
      // Penjaga premis: tanpa parameter waktu, uji di atas tetap lulus walau
      // hitungannya diam-diam memakai `new Date()` dan mengabaikan argumennya.
      const { service } = buat();

      expect(service.batasWaktu(1, new Date('2020-01-02T00:00:00.000Z')).toISOString()).toBe(
        '2020-01-01T00:00:00.000Z',
      );
    });
  });

  describe('saklar mati', () => {
    it('SURVEY_PURGE_ENABLED=false: tidak menghitung dan tidak memusnahkan', async () => {
      const { service, prisma } = buat({ nyala: false });

      const hasil = await service.pangkas();

      expect(hasil).toEqual({ dijalankan: false, alasan: 'dimatikan' });
      expect(prisma.survey.count).not.toHaveBeenCalled();
      expect(prisma.survey.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('hariPemusnahan bernilai null ketika dimatikan', () => {
      expect(buat({ nyala: false }).service.hariPemusnahan()).toBeNull();
    });

    it('MENYALA secara baku: 365 hari tanpa env apa pun', () => {
      expect(buat().service.hariPemusnahan()).toBe(365);
    });
  });

  describe('palang nilai pendek', () => {
    it('menolak di bawah batas minimum, tanpa memusnahkan apa pun', async () => {
      const { service, prisma } = buat({ hari: PEMUSNAHAN_MINIMUM_HARI - 1 });

      const hasil = await service.pangkas();

      expect(hasil).toEqual({
        dijalankan: false,
        alasan: 'terlalu-pendek',
        hari: PEMUSNAHAN_MINIMUM_HARI - 1,
      });
      expect(prisma.survey.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('nilai TEPAT di batas minimum diterima tanpa izin khusus', async () => {
      const { service } = buat({ hari: PEMUSNAHAN_MINIMUM_HARI });

      expect(await service.pangkas()).toMatchObject({ dijalankan: true });
    });

    it('berjalan bila nilai pendek diizinkan tersurat', async () => {
      const { service } = buat({ hari: 1, izinPendek: true });

      expect(await service.pangkas()).toMatchObject({ dijalankan: true, hari: 1 });
    });
  });

  describe('survei berespons TIDAK disentuh', () => {
    it('menyaring dengan responses none, bukan hanya umur', async () => {
      // Sifat terpenting berkas ini. Tanpa saringan ini, sebuah survei yang
      // setahun lalu dibuang -- lengkap dengan ratusan jawaban warga dan hasil
      // IKM-nya -- lenyap tanpa ada manusia yang pernah memutuskannya.
      const { service, prisma } = buat();

      await service.pangkas({ sekarang: new Date('2026-09-30T00:00:00.000Z') });

      const where = (prisma.survey.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where).toEqual({
        deletedAt: { lt: new Date('2025-09-30T00:00:00.000Z') },
        responses: { none: {} },
      });
    });

    it('mode kering memakai saringan yang sama persis', async () => {
      const { service, prisma } = buat();

      await service.pangkas({ kering: true, sekarang: new Date('2026-09-30T00:00:00.000Z') });

      const where = (prisma.survey.count as jest.Mock).mock.calls[0][0].where;
      expect(where).toEqual({
        deletedAt: { lt: new Date('2025-09-30T00:00:00.000Z') },
        responses: { none: {} },
      });
    });

    it('batasnya `lt`, bukan `lte` maupun rentang lain', async () => {
      const { service, prisma } = buat();

      await service.pangkas({ sekarang: new Date('2026-09-30T00:00:00.000Z') });

      const where = (prisma.survey.findMany as jest.Mock).mock.calls[0][0].where;
      expect(Object.keys(where.deletedAt)).toEqual(['lt']);
    });
  });

  describe('mode kering', () => {
    it('menghitung TANPA memusnahkan', async () => {
      const { service, prisma } = buat({}, { count: jest.fn().mockResolvedValue(7) });

      const hasil = await service.pangkas({ kering: true });

      expect(hasil).toMatchObject({ dijalankan: true, kering: true, jumlah: 7 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('pemusnahan sungguhan', () => {
    it('memusnahkan tiap survei dalam transaksinya SENDIRI', async () => {
      // Satu transaksi per survei, bukan satu transaksi untuk semuanya: satu
      // survei bermasalah tak boleh menggagalkan seluruh lintasan malam itu.
      const { service, prisma } = buat(
        {},
        { findMany: jest.fn().mockResolvedValue([{ id: 11 }, { id: 22 }]) },
      );

      const hasil = await service.pangkas();

      expect(hasil).toMatchObject({ dijalankan: true, kering: false, jumlah: 2 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('tidak menyentuh apa pun ketika tak ada yang memenuhi syarat', async () => {
      const { service, prisma } = buat();

      expect(await service.pangkas()).toMatchObject({ jumlah: 0 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('tidak mengulang sampai habis: satu lintasan satu kelompok', async () => {
      // Pengulangan "ambil lalu hapus sampai kosong" akan berputar selamanya
      // bila satu survei gagal dimusnahkan terus-menerus -- ia terus terambil,
      // terus gagal, dan tak pernah berkurang. Sisanya menunggu besok.
      const banyak = Array.from({ length: UKURAN_KELOMPOK }, (_, i) => ({ id: i + 1 }));
      const findMany = jest.fn().mockResolvedValue(banyak);
      const { service } = buat({}, { findMany });

      await service.pangkas();

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany.mock.calls[0][0].take).toBe(UKURAN_KELOMPOK);
    });
  });

  describe('jalankanTerjadwal', () => {
    it('menjalankan yang SUNGGUHAN, bukan mode kering', async () => {
      const { service } = buat();
      const pangkas = jest.spyOn(service, 'pangkas');

      await service.jalankanTerjadwal();

      expect(pangkas).toHaveBeenCalledWith();
    });

    it('menelan galat basis data, tidak melemparnya', async () => {
      // Pekerjaan latar yang melempar menjadi unhandled rejection dan dapat
      // menjatuhkan proses API. Pemusnahan tak sepadan dengan itu.
      const { service } = buat();
      jest.spyOn(service, 'pangkas').mockRejectedValue(new Error('koneksi putus'));

      await expect(service.jalankanTerjadwal()).resolves.toBeUndefined();
    });
  });

  describe('jedaKeJamJalan', () => {
    it('menuju JAM_JALAN hari ini bila belum lewat', () => {
      const { service } = buat();

      expect(service.jedaKeJamJalan(setempat(JAM_JALAN - 1))).toBe(60 * 60 * 1000);
    });

    it('menuju JAM_JALAN besok bila sudah lewat', () => {
      const { service } = buat();

      expect(service.jedaKeJamJalan(setempat(JAM_JALAN + 1))).toBe(23 * 60 * 60 * 1000);
    });

    it('tepat di JAM_JALAN berarti besok, bukan jeda nol', () => {
      // Jeda nol membuat setTimeout menembak seketika, dan penjadwalan ulangnya
      // menembak seketika lagi: satu putaran tanpa henti.
      const { service } = buat();

      expect(service.jedaKeJamJalan(setempat(JAM_JALAN))).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('penjadwalan saat boot', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('TIDAK memasang timer bila pemusnahan dimatikan', () => {
      const { service } = buat({ nyala: false });

      service.onApplicationBootstrap();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('memasang satu timer bila menyala', () => {
      const { service } = buat();

      service.onApplicationBootstrap();

      expect(jest.getTimerCount()).toBe(1);
      service.onModuleDestroy();
    });

    it('berjalan saat jamnya tiba, lalu MEMASANG JADWAL BERIKUTNYA', async () => {
      const { service } = buat();
      const jalan = jest.spyOn(service, 'jalankanTerjadwal').mockResolvedValue(undefined);

      service.onApplicationBootstrap();
      await jest.advanceTimersByTimeAsync(service.jedaKeJamJalan() + 1);

      expect(jalan).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);
      service.onModuleDestroy();
    });

    it('onModuleDestroy membersihkan timernya', () => {
      const { service } = buat();

      service.onApplicationBootstrap();
      service.onModuleDestroy();

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
