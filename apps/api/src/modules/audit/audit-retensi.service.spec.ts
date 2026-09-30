import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditRetensiService,
  JAM_JALAN,
  RETENSI_MINIMUM_HARI,
  UKURAN_KELOMPOK,
} from './audit-retensi.service';

/**
 * RETENSI LOG AUDIT (30 September 2026, permintaan pengguna: hapus otomatis
 * setelah dua minggu).
 *
 * EMPAT SIFAT YANG DIJAGA BERKAS INI, dan semuanya ada karena penghapusannya
 * PERMANEN:
 *
 * 1. MATI KECUALI DINYALAKAN. Tanpa `AUDIT_RETENTION_DAYS` tak ada yang
 *    dihapus, dan tak ada timer yang dipasang. Ketiadaan konfigurasi harus
 *    berarti menyimpan data -- kalau bakunya menghapus, satu env yang lupa
 *    disalin ke server baru akan memusnahkan log tanpa ada yang memutuskannya.
 * 2. PALANG NILAI PENDEK. Satu digit hilang mengubah 14 menjadi 1. Nilai di
 *    bawah tujuh hari menolak berjalan kecuali diizinkan tersurat.
 * 3. KERING DULU. Mode kering menghitung tanpa menghapus, supaya dampaknya
 *    dapat dilihat sebelum dijalankan sungguhan.
 * 4. JAM TETAP. Penjadwalnya menuju jam tertentu, bukan 24 jam sejak boot --
 *    kalau tidak, jam pemangkasan bergeser mengikuti kapan server terakhir
 *    di-restart dan bisa jatuh tepat di jam sibuk.
 */
function buat(nilai: { hari?: number | null; izinPendek?: boolean } = {}) {
  const prisma = {
    auditLog: { count: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn((kunci: string) => {
      if (kunci === 'audit.retentionDays') return nilai.hari ?? null;
      if (kunci === 'audit.retentionAllowShort') return nilai.izinPendek ?? false;
      return undefined;
    }),
  } as unknown as ConfigService;
  const service = new AuditRetensiService(prisma, config);
  return { service, prisma, config };
}

/** Waktu SETEMPAT, bukan UTC: penjadwalnya memakai jam server. */
const setempat = (jam: number, menit = 0) => new Date(2026, 8, 30, jam, menit, 0, 0);

describe('AuditRetensiService', () => {
  describe('batasWaktu', () => {
    it('tepat N hari sebelum waktu acuan, sampai milidetiknya', () => {
      const { service } = buat({ hari: 14 });
      const sekarang = new Date('2026-09-30T03:00:00.000Z');

      expect(service.batasWaktu(14, sekarang).toISOString()).toBe('2026-09-16T03:00:00.000Z');
    });

    it('memakai waktu acuan yang diberikan, bukan jam dinding', () => {
      // Penjaga premis: tanpa parameter waktu, uji di atas akan lulus walau
      // hitungannya memakai `new Date()` dan mengabaikan argumennya.
      const { service } = buat({ hari: 14 });

      expect(service.batasWaktu(1, new Date('2020-01-02T00:00:00.000Z')).toISOString()).toBe(
        '2020-01-01T00:00:00.000Z',
      );
    });
  });

  describe('mati kecuali dinyalakan', () => {
    it('tanpa AUDIT_RETENTION_DAYS: tidak menghitung dan tidak menghapus', async () => {
      const { service, prisma } = buat({ hari: null });

      const hasil = await service.pangkas();

      expect(hasil).toEqual({ dijalankan: false, alasan: 'tidak-disetel' });
      expect(prisma.auditLog.count).not.toHaveBeenCalled();
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('palang nilai pendek', () => {
    it(`menolak di bawah ${RETENSI_MINIMUM_HARI} hari, tanpa menghapus apa pun`, async () => {
      const { service, prisma } = buat({ hari: RETENSI_MINIMUM_HARI - 1 });

      const hasil = await service.pangkas();

      expect(hasil).toEqual({
        dijalankan: false,
        alasan: 'terlalu-pendek',
        hari: RETENSI_MINIMUM_HARI - 1,
      });
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });

    it('berjalan bila nilai pendek diizinkan tersurat', async () => {
      const { service, prisma } = buat({ hari: 1, izinPendek: true });
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(3);

      const hasil = await service.pangkas({ kering: true });

      expect(hasil).toMatchObject({ dijalankan: true, hari: 1, jumlah: 3 });
    });

    it(`nilai TEPAT ${RETENSI_MINIMUM_HARI} hari diterima tanpa izin khusus`, async () => {
      // Batas atas palangnya ikut dijaga: `<` versus `<=` di sini adalah
      // perbedaan antara tujuh hari yang sah dan tujuh hari yang ditolak.
      const { service, prisma } = buat({ hari: RETENSI_MINIMUM_HARI });
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const hasil = await service.pangkas({ kering: true });

      expect(hasil).toMatchObject({ dijalankan: true, hari: RETENSI_MINIMUM_HARI });
    });
  });

  describe('mode kering', () => {
    it('menghitung baris kedaluwarsa TANPA menghapusnya', async () => {
      const { service, prisma } = buat({ hari: 14 });
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(42);

      const hasil = await service.pangkas({ kering: true });

      expect(hasil).toMatchObject({ dijalankan: true, kering: true, jumlah: 42 });
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('menghitung dengan batas `timestamp lt`, bukan `lte` maupun rentang lain', async () => {
      const { service, prisma } = buat({ hari: 14 });
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.pangkas({ kering: true, sekarang: new Date('2026-09-30T00:00:00.000Z') });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { timestamp: { lt: new Date('2026-09-16T00:00:00.000Z') } },
      });
    });
  });

  describe('penghapusan sungguhan', () => {
    it('menghapus HANYA baris yang lebih tua dari batas', async () => {
      const { service, prisma } = buat({ hari: 14 });
      (prisma.auditLog.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([]);
      (prisma.auditLog.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const hasil = await service.pangkas({ sekarang: new Date('2026-09-30T00:00:00.000Z') });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { timestamp: { lt: new Date('2026-09-16T00:00:00.000Z') } },
        select: { id: true },
        take: UKURAN_KELOMPOK,
        orderBy: { id: 'asc' },
      });
      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2] } } });
      expect(hasil).toMatchObject({ dijalankan: true, kering: false, jumlah: 2 });
    });

    it('menghapus BERKELOMPOK dan berhenti ketika kelompoknya habis', async () => {
      // Kelompok, bukan satu `deleteMany` besar: halaman Log Aktivitas membaca
      // tabel yang sama, dan satu penghapusan raksasa menahannya lama.
      const { service, prisma } = buat({ hari: 14 });
      const penuh = Array.from({ length: UKURAN_KELOMPOK }, (_, i) => ({ id: i + 1 }));
      (prisma.auditLog.findMany as jest.Mock)
        .mockResolvedValueOnce(penuh)
        .mockResolvedValueOnce([{ id: 99999 }])
        .mockResolvedValueOnce([]);
      (prisma.auditLog.deleteMany as jest.Mock)
        .mockResolvedValueOnce({ count: UKURAN_KELOMPOK })
        .mockResolvedValueOnce({ count: 1 });

      const hasil = await service.pangkas();

      expect(prisma.auditLog.deleteMany).toHaveBeenCalledTimes(2);
      expect(hasil).toMatchObject({ jumlah: UKURAN_KELOMPOK + 1 });
    });

    it('tak memanggil deleteMany sama sekali bila tak ada yang kedaluwarsa', async () => {
      const { service, prisma } = buat({ hari: 14 });
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const hasil = await service.pangkas();

      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
      expect(hasil).toMatchObject({ jumlah: 0 });
    });
  });

  describe('jalankanTerjadwal', () => {
    it('menjalankan pemangkasan SUNGGUHAN, bukan mode kering', async () => {
      // Kalau yang terjadwal ternyata kering, retensinya tak pernah terjadi
      // sementara lognya tetap melaporkan angka -- kegagalan yang paling sulit
      // terlihat dari seluruh fitur ini.
      const { service, prisma } = buat({ hari: 14 });
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.jalankanTerjadwal();

      expect(prisma.auditLog.findMany).toHaveBeenCalled();
      expect(prisma.auditLog.count).not.toHaveBeenCalled();
    });

    it('kegagalan basis data TIDAK dilempar keluar', async () => {
      // Pekerjaan latar yang melempar menjadi unhandled rejection dan dapat
      // menjatuhkan proses API -- retensi tak sepadan dengan itu.
      const { service, prisma } = buat({ hari: 14 });
      (prisma.auditLog.findMany as jest.Mock).mockRejectedValue(new Error('db mati'));

      await expect(service.jalankanTerjadwal()).resolves.toBeUndefined();
    });
  });

  describe('jedaKeJamJalan', () => {
    it(`menuju jam ${JAM_JALAN} hari ini bila belum lewat`, () => {
      const { service } = buat({ hari: 14 });

      expect(service.jedaKeJamJalan(setempat(JAM_JALAN - 2))).toBe(2 * 60 * 60 * 1000);
    });

    it(`menuju jam ${JAM_JALAN} BESOK bila sudah lewat`, () => {
      const { service } = buat({ hari: 14 });

      expect(service.jedaKeJamJalan(setempat(JAM_JALAN + 1))).toBe(23 * 60 * 60 * 1000);
    });

    it('tepat pada jamnya menunggu putaran berikutnya, bukan berjalan dua kali', () => {
      // `<=` versus `<`: dengan `<` jedanya nol dan timer berjalan seketika,
      // lalu memasang timer nol lagi -- pengulangan tanpa henti.
      const { service } = buat({ hari: 14 });

      expect(service.jedaKeJamJalan(setempat(JAM_JALAN))).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('penjadwalan saat boot', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(setempat(JAM_JALAN - 1));
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('TIDAK memasang timer bila retensi tak dinyalakan', () => {
      const { service } = buat({ hari: null });

      service.onApplicationBootstrap();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('memasang satu timer bila retensi dinyalakan', () => {
      const { service } = buat({ hari: 14 });

      service.onApplicationBootstrap();

      expect(jest.getTimerCount()).toBe(1);
      service.onModuleDestroy();
    });

    it('berjalan saat jamnya tiba, lalu MEMASANG JADWAL BERIKUTNYA', async () => {
      // Tanpa pemasangan ulang, retensi berjalan sekali lalu diam selamanya --
      // dan diamnya tak terlihat sampai seseorang memeriksa umur baris tertua.
      const { service, prisma } = buat({ hari: 14 });
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      service.onApplicationBootstrap();

      await jest.advanceTimersByTimeAsync(60 * 60 * 1000);

      expect(prisma.auditLog.findMany).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);
      service.onModuleDestroy();
    });

    it('onModuleDestroy membersihkan timernya', () => {
      const { service } = buat({ hari: 14 });
      service.onApplicationBootstrap();

      service.onModuleDestroy();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('hariRetensi', () => {
    it('null bila tak disetel, angkanya bila disetel', () => {
      expect(buat({ hari: null }).service.hariRetensi()).toBeNull();
      expect(buat({ hari: 30 }).service.hariRetensi()).toBe(30);
    });
  });
});
