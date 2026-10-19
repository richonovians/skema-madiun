import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdSource } from './interfaces/opd-source.interface';
import { OpdService } from './opd.service';

const opdRow = {
  id: 1,
  externalId: 'HD-001',
  nama: 'Dinas Kesehatan',
  kode: 'DINKES',
  jenisLayanan: 'Kesehatan',
  penanggungJawab: 'Kepala Dinas Kesehatan',
  isActive: true,
  syncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Pelanggaran unique dari Postgres, bentuk yang sama seperti yang Prisma lempar. */
const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('OpdService', () => {
  const prisma = {
    opd: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    survey: { groupBy: jest.fn() },
    complaint: { groupBy: jest.fn() },
    user: { groupBy: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const opdSource = { fetchOpdList: jest.fn() };
  const service = new OpdService(prisma, opdSource as unknown as OpdSource);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.opd.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.survey.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.complaint.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.user.groupBy as jest.Mock).mockResolvedValue([]);
  });

  it('findAll mengembalikan PaginatedResult dengan meta yang benar', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].kode).toBe('DINKES');
    expect(result.pagination).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('findAll (INT-10) menyisipkan activeSurveys & openComplaints dari groupBy per OPD', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);
    (prisma.survey.groupBy as jest.Mock).mockResolvedValue([{ opdId: 1, _count: { _all: 3 } }]);
    (prisma.complaint.groupBy as jest.Mock).mockResolvedValue([{ opdId: 1, _count: { _all: 5 } }]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items[0].activeSurveys).toBe(3);
    expect(result.items[0].openComplaints).toBe(5);
    expect(prisma.survey.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ opdId: { in: [1] }, status: 'aktif' }),
      }),
    );
    expect(prisma.complaint.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          opdId: { in: [1] },
          status: { in: ['diterima', 'diproses'] },
        }),
      }),
    );
  });

  it('findAll: OPD tanpa survei/pengaduan aktif → default 0 (bukan undefined)', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);
    // groupBy default (dari beforeEach) mengembalikan [] — tak ada baris untuk opdId manapun.

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items[0].activeSurveys).toBe(0);
    expect(result.items[0].openComplaints).toBe(0);
  });

  it('findAll: halaman kosong tidak memanggil groupBy sama sekali', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

    await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(prisma.survey.groupBy).not.toHaveBeenCalled();
    expect(prisma.complaint.groupBy).not.toHaveBeenCalled();
  });

  /**
   * JUMLAH ADMIN PER OPD (4 Oktober 2026, permintaan pengguna: "tambah
   * notifikasi jika opd tersebut belum ada adminnya").
   *
   * OPD tanpa admin bukan kejadian langka melainkan keadaan BAKU: daftar OPD
   * disinkronkan dari Helpdesk dan bersifat baca saja, jadi tiap OPD baru masuk
   * tanpa seorang pun yang mengelolanya. Selama tak terlihat, akibatnya diam:
   * pengaduan yang ditujukan ke sana tak pernah dibaca, dan surveinya tak
   * pernah disusun. Admin Kabupaten adalah satu-satunya yang dapat
   * membereskannya, dan ia perlu melihatnya.
   *
   * `roles: { has: opd }`, bukan `role: opd`: kolomnya larik sejak peran jamak
   * (15 September 2026). Memeriksa kesamaan pada larik tak akan cocok dengan
   * akun yang memegang peran opd bersama peran lain, dan akun itu TETAP seorang
   * admin bagi OPD-nya.
   *
   * Hanya akun AKTIF yang dihitung. Akun yang dinonaktifkan tak dapat masuk,
   * jadi menghitungnya membuat OPD tanpa pengelola terlihat seperti terkelola.
   */
  it('findAll menyisipkan adminCount per OPD', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);
    (prisma.user.groupBy as jest.Mock).mockResolvedValue([{ opdId: 1, _count: { _all: 2 } }]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items[0].adminCount).toBe(2);
    expect(prisma.user.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          opdId: { in: [1] },
          roles: { has: 'opd' },
          isActive: true,
        }),
      }),
    );
  });

  it('findAll: OPD tanpa admin → adminCount 0, bukan undefined', async () => {
    // Pagar utama perubahan ini. `undefined` di tampilan terbaca sebagai
    // "belum dimuat" dan tak menimbulkan peringatan apa pun, sehingga OPD yang
    // benar-benar tak punya admin justru lolos dari pemberitahuan yang
    // seluruh perubahan ini dibuat untuknya.
    (prisma.$transaction as jest.Mock).mockResolvedValue([[opdRow], 1]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListOpdQueryDto);

    expect(result.items[0].adminCount).toBe(0);
  });

  it('findOne melempar NotFoundException bila OPD tidak ada', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('findOne mengembalikan OpdEntity bila ada', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue(opdRow);

    const result = await service.findOne(1);

    expect(result.kode).toBe('DINKES');
    expect(result.externalId).toBe('HD-001');
  });

  it('syncFromSource: create untuk OPD baru, update untuk yang sudah ada', async () => {
    opdSource.fetchOpdList.mockResolvedValue([
      { externalId: 'HD-001', kode: 'DINKES', nama: 'Dinas Kesehatan' },
      { externalId: 'HD-002', kode: 'DISDIK', nama: 'Dinas Pendidikan' },
    ]);
    (prisma.opd.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null);

    const report = await service.syncFromSource();

    expect(report.fetched).toBe(2);
    expect(report.updated).toBe(1);
    expect(report.created).toBe(1);
    expect(report.skipped).toBe(0);
    expect(prisma.opd.update).toHaveBeenCalledTimes(1);
    expect(prisma.opd.create).toHaveBeenCalledTimes(1);
  });

  it('syncFromSource: melewati record tak lengkap (skipped) & tidak menonaktifkan apa pun', async () => {
    opdSource.fetchOpdList.mockResolvedValue([{ externalId: '', kode: 'X', nama: 'Y' }]);

    const report = await service.syncFromSource();

    expect(report.skipped).toBe(1);
    expect(report.created).toBe(0);
    expect(report.updated).toBe(0);
    // seenExternalIds kosong → guard mencegah updateMany (hindari mass-deactivate).
    expect(prisma.opd.updateMany).not.toHaveBeenCalled();
  });

  it('OPD-4: menonaktifkan OPD tersinkron yang hilang dari source (bukan menghapus)', async () => {
    opdSource.fetchOpdList.mockResolvedValue([
      { externalId: 'HD-001', kode: 'DINKES', nama: 'Dinas Kesehatan' },
    ]);
    (prisma.opd.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
    (prisma.opd.updateMany as jest.Mock).mockResolvedValueOnce({ count: 2 });

    const report = await service.syncFromSource();

    expect(report.deactivated).toBe(2);
    expect(prisma.opd.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, externalId: { notIn: ['HD-001'] } }),
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });

  it('OPD-6: melempar ServiceUnavailableException & tidak menyentuh DB saat source gagal', async () => {
    opdSource.fetchOpdList.mockRejectedValue(new Error('Helpdesk down'));

    await expect(service.syncFromSource()).rejects.toThrow(ServiceUnavailableException);
    expect(prisma.opd.create).not.toHaveBeenCalled();
    expect(prisma.opd.update).not.toHaveBeenCalled();
    expect(prisma.opd.updateMany).not.toHaveBeenCalled();
  });

  it('OPD-5: mencatat ringkasan sinkronisasi via Logger', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    opdSource.fetchOpdList.mockResolvedValue([
      { externalId: 'HD-001', kode: 'DINKES', nama: 'Dinas Kesehatan' },
    ]);
    (prisma.opd.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });

    await service.syncFromSource();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Sinkronisasi OPD selesai'));
    logSpy.mockRestore();
  });

  /**
   * BALAPAN BACA-LALU-TULIS PADA SINKRONISASI OPD (9 Oktober 2026, pilihan
   * pengguna: jalur B).
   *
   * `findFirst` lalu `create` adalah baca-lalu-tulis. Dua sinkronisasi yang
   * berjalan bersamaan dapat sama-sama tak menemukan baris lalu sama-sama
   * menyisipkan `externalId` yang sama; Postgres menolak yang kedua dengan
   * pelanggaran unique, dan sebelum perbaikan ini galat itu naik sebagai 500
   * dengan sinkronisasi separuh jalan.
   *
   * KOREKSI atas penilaian saya sendiri yang lebih dini: saya sempat
   * menyatakan balapan ini dapat menonaktifkan 53 OPD. Itu tidak benar.
   * `external_id` dan `kode` keduanya `@unique`, jadi basis data menolak baris
   * ganda; langkah penonaktifan idempoten sebab kedua jalanan menarik daftar
   * yang sama; dan tombolnya sudah `disabled={isSyncing}` di antarmuka.
   * Kerusakan yang sebenarnya hanyalah 500 yang membingungkan.
   *
   * MENGAPA BUKAN SATU `ON CONFLICT`: tabel `opd` punya DUA unique terpisah
   * (`external_id` dan `kode`), sedangkan satu klausa `ON CONFLICT` hanya
   * dapat menargetkan satu constraint. Aturannya pun menuntut keduanya --
   * baris ber-`kode` sama SENGAJA diadopsi agar tak bentrok. Jadi pola yang
   * dipakai: sisipkan secara optimis, dan bila constraint MANA PUN berbunyi,
   * baca ulang lalu perbarui.
   *
   * YANG MEMBUAT BACA ULANGNYA DIJAMIN MENEMUKAN BARIS: Postgres menahan
   * `INSERT` kedua pada indeks unique sampai transaksi pertama selesai, dan
   * baru melempar galat duplikat SESUDAH yang pertama commit. Saat kita
   * menangkap P2002, barisnya karena itu sudah terlihat.
   */
  describe('syncFromSource tahan balapan', () => {
    /**
     * `mockReset`, BUKAN mengandalkan `jest.clearAllMocks()` di beforeEach
     * terluar: `clearAllMocks` hanya membuang catatan panggilan, sedangkan
     * antrean `mockResolvedValueOnce` yang TAK TERPAKAI tetap tinggal dan
     * bocor ke uji berikutnya. Terukur, bukan diduga: percobaan pertama uji
     * ini membuat nilai `{ id: 7 }` yang tak terpakai di uji pertama diambil
     * oleh uji kedua, sehingga uji kedua menempuh jalur UPDATE dan lulus
     * karena alasan yang salah.
     */
    beforeEach(() => {
      (prisma.opd.findFirst as jest.Mock).mockReset();
      (prisma.opd.create as jest.Mock).mockReset();
      (prisma.opd.update as jest.Mock).mockReset();
    });

    const satuItem = () => {
      opdSource.fetchOpdList.mockResolvedValue([
        { externalId: 'HD-001', kode: 'DINKES', nama: 'Dinas Kesehatan' },
      ]);
    };

    it('create bentrok unique -> baca ulang & perbarui, bukan 500', async () => {
      satuItem();
      (prisma.opd.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // jalanan ini belum melihat barisnya
        .mockResolvedValueOnce({ id: 7 }); // jalanan lain sudah menyisipkannya
      (prisma.opd.create as jest.Mock).mockRejectedValueOnce(p2002());

      const report = await service.syncFromSource();

      expect(prisma.opd.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
      expect(report.updated).toBe(1);
      expect(report.created).toBe(0);
      expect(report.skipped).toBe(0);
    });

    /**
     * Kalau baris itu TETAP tak ada, yang berbunyi bukan balapan yang kita
     * duga -- mungkin `kode` bentrok dengan baris yang `OR`-nya tak mencakup,
     * atau constraint lain. Menelannya akan menyembunyikan cacat sungguhan
     * dan melaporkan sinkronisasi sukses yang tak menulis apa pun.
     */
    it('bentrok tetapi baca ulang tak menemukan apa pun -> galatnya dilempar', async () => {
      satuItem();
      (prisma.opd.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.opd.create as jest.Mock).mockRejectedValueOnce(p2002());

      await expect(service.syncFromSource()).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    /**
     * BARISNYA SENGAJA DIBUAT ADA pada baca ulang. Versi pertama uji ini
     * memakai `null`, dan itu membuatnya HAMPA -- terbukti lewat mutasi:
     * membuang penjaga jenis galat tetap meluluskannya, sebab penjaga kedua
     * ("baca ulang kosong") menangkapnya. Dengan barisnya ada, satu-satunya
     * yang menahan galat ini adalah penjaga jenisnya sendiri.
     */
    it('galat yang BUKAN pelanggaran unique -> dilempar, tidak jadi pembaruan', async () => {
      satuItem();
      (prisma.opd.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 9 });
      (prisma.opd.create as jest.Mock).mockRejectedValueOnce(new Error('koneksi putus'));

      await expect(service.syncFromSource()).rejects.toThrow('koneksi putus');
      // Hanya bentrok unique yang berarti "orang lain sudah menyisipkannya".
      // Koneksi putus tak mengatakan apa pun tentang baris yang ada.
      expect(prisma.opd.update).not.toHaveBeenCalled();
    });
  });
});
