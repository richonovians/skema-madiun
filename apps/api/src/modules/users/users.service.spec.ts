import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { instanceToPlain } from 'class-transformer';
import { JenisPengguna, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UsersService } from './users.service';

const actor = (actingRole: Role): CurrentUser => ({
  userId: 1,
  roles: [actingRole],
  actingRole,
  opdId: null,
});
const KABUPATEN = actor(Role.kabupaten);
const OPD = actor(Role.opd);
const RESPONDEN = actor(Role.responden);

const userRow = {
  id: 10,
  ssoSubject: 'pending:a@x.go.id',
  nama: 'Admin A',
  email: 'a@x.go.id',
  roles: [Role.opd],
  opdId: 1,
  isActive: true,
  lastLoginAt: null,
  consentAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * `ConfigService` tiruan. HANYA `app.nodeEnv` yang dibaca UsersService, dan
 * kunci itu menentukan hidup-matinya gerbang ASN.
 */
const konfig = (nodeEnv: string): ConfigService =>
  ({
    get: (key: string) => (key === 'app.nodeEnv' ? nodeEnv : undefined),
  }) as unknown as ConfigService;

describe('UsersService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    opd: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new UsersService(prisma, konfig('development'));

  beforeEach(() => jest.clearAllMocks());

  it('findAll mengembalikan PaginatedResult (mengecualikan soft-deleted)', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[userRow], 1]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, KABUPATEN);

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('findAll (INT-11) menyisipkan opdNama dari relasi opd, tanpa membocorkan objek opd mentah', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ ...userRow, opd: { nama: 'Dinas Kesehatan' } }],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, KABUPATEN);

    expect(result.items[0].opdNama).toBe('Dinas Kesehatan');
    expect((result.items[0] as unknown as { opd?: unknown }).opd).toBeUndefined();
  });

  it('findAll: user tanpa opd (responden/kabupaten) → opdNama undefined', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ ...userRow, opdId: null, opd: null }],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, KABUPATEN);

    expect(result.items[0].opdNama).toBeUndefined();
  });

  it('findOne melempar NotFound bila tidak ada', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.findOne(99, KABUPATEN)).rejects.toThrow(NotFoundException);
  });

  it('Superuser membuat Admin OPD → sukses', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(userRow);

    const dto: CreateUserDto = { nama: 'Admin A', email: 'a@x.go.id', roles: [Role.opd], opdId: 1 };
    const result = await service.create(dto, KABUPATEN);

    expect(result.roles).toEqual([Role.opd]);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('Superuser membuat akun kabupaten lain → sukses', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      ...userRow,
      roles: [Role.kabupaten],
      opdId: null,
    });

    const dto: CreateUserDto = { nama: 'K', email: 'k@x.go.id', roles: [Role.kabupaten] };
    const result = await service.create(dto, KABUPATEN);

    expect(result.roles).toEqual([Role.kabupaten]);
  });

  it('membuat Admin OPD tanpa opdId → BadRequest', async () => {
    const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', roles: [Role.opd] };
    await expect(service.create(dto, KABUPATEN)).rejects.toThrow(BadRequestException);
  });

  it('email/ssoSubject duplikat → Conflict', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow);

    const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', roles: [Role.opd], opdId: 1 };
    await expect(service.create(dto, KABUPATEN)).rejects.toThrow(ConflictException);
  });

  it('updateStatus mengubah isActive → sukses', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...userRow, isActive: false });

    const result = await service.updateStatus(10, { isActive: false }, KABUPATEN);

    expect(result.isActive).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isActive: false },
    });
  });

  /**
   * KEBIJAKAN YANG BERUBAH, bukan uji yang rusak (8 September 2026).
   *
   * Judul lama uji ini: "opd → kabupaten, opdId ikut dikosongkan". Itu memang
   * perilaku yang dulu benar — `opdId` dikirim lewat DTO, jadi mengosongkannya
   * bersama pencabutan role adalah kerapian.
   *
   * Sejak `opdId` menjadi data milik Helpdesk, mengosongkannya sebagai EFEK
   * SAMPING penyuntingan role berarti SKEMA menghapus data yang bukan miliknya.
   * Akibatnya nyata: bila orangnya diberi peran `opd` lagi, tautannya sudah
   * lenyap, dan satu-satunya jalan memulihkannya adalah login SSO berikutnya.
   */
  it('update: mencabut role opd TIDAK mengosongkan opdId — itu data Helpdesk', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow); // role: opd, opdId terisi
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...userRow,
      roles: [Role.kabupaten],
    });

    const result = await service.update(10, { roles: [Role.kabupaten] }, KABUPATEN);

    expect(result.roles).toEqual([Role.kabupaten]);
    // Kolom `opdId` TIDAK muncul di badan pembaruan sama sekali. Bedanya dengan
    // "ditulis dengan nilai lama" itu penting: yang tak disebut tak tersentuh,
    // sehingga login SSO tetap satu-satunya penulis kolom itu.
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { roles: [Role.kabupaten] },
    });
  });

  it('update: superuser TIDAK BOLEH mengubah role akun sendiri (cegah self-lockout) → Forbidden', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      id: 1,
      roles: [Role.kabupaten],
    });

    // `opdId` TIDAK lagi dikirim: field itu dibuang dari UpdateUserDto
    // (kepemilikan data Helpdesk, 8 September 2026). Yang diuji di sini gerbang
    // self-lockout, dan ia berjalan SEBELUM normalisasi role -- jadi badan
    // berisi role saja sudah cukup untuk memicunya.
    await expect(service.update(1, { roles: [Role.opd] }, KABUPATEN)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('update: ubah role ke opd tanpa opdId → BadRequest', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      roles: [Role.kabupaten],
      opdId: null,
    });

    await expect(service.update(10, { roles: [Role.opd] }, KABUPATEN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('remove (2026-08-05) soft-delete akun lain → deletedAt+isActive:false, sukses', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow);
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...userRow,
      isActive: false,
      deletedAt: new Date(),
    });

    const result = await service.remove(10, KABUPATEN);

    expect(result.isActive).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { deletedAt: expect.any(Date), isActive: false },
    });
  });

  it('remove: TIDAK BOLEH menghapus akun sendiri (cegah self-lockout) → Forbidden', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...userRow, id: 1 });

    await expect(service.remove(1, KABUPATEN)).rejects.toThrow(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('remove: user tak ada/sudah terhapus → NotFound', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.remove(99, KABUPATEN)).rejects.toThrow(NotFoundException);
  });

  // LAPIS KEDUA, di bawah `@Roles(Role.kabupaten)` di controller. Ia tetap
  // berlaku bila daftar dekorator kelak diperluas keliru -- dan justru itu
  // gunanya, karena perluasan seperti itu tak memunculkan galat apa pun.
  // Gerbang guard-nya diuji di test/users.e2e-spec.ts.
  //
  // Arah ujinya BERBALIK pada 15 September 2026: sebelumnya di sinilah
  // `kabupaten` ditolak, karena manajemen pengguna milik `superuser` seorang.
  describe('pembatasan peran', () => {
    it('findAll oleh Admin OPD -> Forbidden, DB tak disentuh', async () => {
      await expect(
        service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, OPD),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('findOne oleh Admin OPD -> Forbidden sebelum query', async () => {
      await expect(service.findOne(10, OPD)).rejects.toThrow(ForbiddenException);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('create oleh Admin OPD -> Forbidden, tak ada akun dibuat', async () => {
      const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', roles: [Role.opd], opdId: 1 };
      await expect(service.create(dto, OPD)).rejects.toThrow(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('update role oleh Admin OPD -> Forbidden (mengangkat admin bukan haknya)', async () => {
      await expect(service.update(10, { roles: [Role.kabupaten] }, OPD)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updateStatus oleh Admin OPD -> Forbidden', async () => {
      await expect(service.updateStatus(10, { isActive: false }, OPD)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('remove oleh Admin OPD -> Forbidden, akun tak ikut tersoft-delete', async () => {
      await expect(service.remove(10, OPD)).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('responden juga ditolak (bukan cuma Admin OPD)', async () => {
      await expect(
        service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, RESPONDEN),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /**
   * Satu akun, beberapa role (5 September 2026). Aturan yang diuji di sini
   * seluruhnya keputusan pengguna, bukan tafsiran: kombinasi bebas, `responden`
   * boleh diberikan, dan Admin OPD tetap tertaut SATU OPD.
   */
  describe('roles (himpunan)', () => {
    it('menyimpan beberapa role sekaligus', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.create as jest.Mock).mockResolvedValue(userRow);

      await service.create(
        {
          nama: 'Pak A',
          email: 'a2@example.go.id',
          roles: [Role.kabupaten, Role.opd],
          opdId: 1,
        } as CreateUserDto,
        KABUPATEN,
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roles: [Role.kabupaten, Role.opd], opdId: 1 }),
        }),
      );
    });

    it('MENOLAK himpunan role kosong', async () => {
      await expect(
        service.create(
          { nama: 'X', email: 'x@e.go.id', roles: [] } as unknown as CreateUserDto,
          KABUPATEN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('MENOLAK roles memuat opd tanpa opdId', async () => {
      await expect(
        service.create(
          {
            nama: 'X',
            email: 'x@e.go.id',
            roles: [Role.kabupaten, Role.opd],
          } as CreateUserDto,
          KABUPATEN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('MENGOSONGKAN opdId bila roles tak memuat opd', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.create as jest.Mock).mockResolvedValue(userRow);

      await service.create(
        { nama: 'X', email: 'x2@e.go.id', roles: [Role.kabupaten], opdId: 1 } as CreateUserDto,
        KABUPATEN,
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ opdId: null }) }),
      );
    });

    /** Batas lama yang DICABUT atas permintaan pengguna 5 September 2026. */
    it('MENERIMA responden (dulu ditolak ADMIN_ROLES)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(userRow);

      await expect(
        service.create(
          { nama: 'Warga', email: 'w@e.go.id', roles: [Role.responden] } as CreateUserDto,
          KABUPATEN,
        ),
      ).resolves.toBeDefined();
    });

    it('anti-self-lockout: MENOLAK mengubah himpunan role akun sendiri', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...userRow,
        id: 1,
        roles: [Role.kabupaten],
        opdId: null,
      });

      await expect(service.update(1, { roles: [Role.opd] }, KABUPATEN)).rejects.toThrow(
        ForbiddenException,
      );
    });

    /**
     * KONTROL untuk uji di atas: URUTAN yang berbeda BUKAN perubahan. Tanpa uji
     * ini, perbandingan naif (`!==` pada array) akan mengunci pengguna dari
     * menyunting akunnya sendiri padahal tak ada yang berubah.
     */
    it('anti-self-lockout: urutan role berbeda BUKAN perubahan', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...userRow,
        id: 1,
        roles: [Role.kabupaten, Role.opd],
        opdId: 1,
      });
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow);

      await expect(
        service.update(1, { roles: [Role.opd, Role.kabupaten] }, KABUPATEN),
      ).resolves.toBeDefined();
    });

    it('findAll menyaring dengan roles: { has }', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[userRow], 1]);

      await service.findAll({ page: 1, limit: 20, role: Role.opd } as ListUsersQueryDto, KABUPATEN);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roles: { has: Role.opd } }),
        }),
      );
    });
  });

  /**
   * Jumlah akun aktif untuk halaman Manajemen User (permintaan pengguna
   * 6 September 2026). Dipisah dari `GET /dashboard/statistics` supaya halaman
   * itu tak perlu menjalankan selusin groupBy hanya untuk satu angka.
   */
  describe('getStats', () => {
    it('menghitung akun aktif & total, keduanya tanpa yang soft-deleted', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([7, 5]);

      const hasil = await service.getStats(KABUPATEN);

      expect(hasil.totalUsers).toBe(7);
      expect(hasil.activeUsers).toBe(5);
      const panggilan = (prisma.user.count as jest.Mock).mock.calls;
      // Kedua hitungan HARUS mengecualikan akun terhapus: tanpa `deletedAt`,
      // angka di layar terus bertambah walau akunnya sudah dihapus.
      expect(panggilan[0][0]).toEqual({ where: { deletedAt: null } });
      expect(panggilan[1][0]).toEqual({ where: { deletedAt: null, isActive: true } });
    });

    it('bukan Admin Kabupaten -> Forbidden', async () => {
      await expect(service.getStats(OPD)).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

describe('UsersService — gerbang Admin OPD hanya untuk ASN', () => {
  /**
   * PERMINTAAN PENGGUNA 6 Oktober 2026: "perketat opsi jadikan admin opd hanya
   * untuk user type asn", dengan satu syarat tersurat yang ia tambahkan
   * sendiri: "penerapan ... digunakan saat projek ini sudah pada tahap
   * produksi. karena projek ini masih pengembangan, akun seed/pending masih
   * tetap bisa mengambil peran opd."
   *
   * Itu sebabnya setiap uji di bawah menyebut lingkungannya tersurat. Gerbang
   * yang hanya diuji pada satu lingkungan bukan gerbang yang teruji: yang perlu
   * dibuktikan justru DUA-DUANYA -- ia menolak di produksi, dan ia membiarkan
   * di pengembangan.
   */
  const buat = (nodeEnv: string) => {
    const prisma = {
      user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      opd: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    } as unknown as PrismaService;
    return { prisma, service: new UsersService(prisma, konfig(nodeEnv)) };
  };

  const target = (overrides: Record<string, unknown> = {}) => ({
    ...userRow,
    id: 10,
    roles: [Role.responden],
    opdId: 5,
    jenisPengguna: null,
    ...overrides,
  });

  describe('produksi: menolak', () => {
    it('menolak memberi peran opd pada akun yang jenis penggunanya BELUM DIKETAHUI', async () => {
      // `null` bukan "warga", melainkan "belum diberitahu" -- dan gerbangnya
      // gagal TERTUTUP, sebab memberi hak atas dasar ketidaktahuan lebih buruk
      // daripada menundanya.
      const { prisma, service } = buat('production');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(target());

      await expect(
        service.update(10, { roles: [Role.opd, Role.responden] }, KABUPATEN),
      ).rejects.toThrow(BadRequestException);
    });

    it('pesan galatnya menyebut ASN, bukan menyebut opdId', async () => {
      // Penjaga yang ADA SEBELUM ini menolak dengan alasan "opdId wajib diisi",
      // yang tak pernah menjelaskan aturan sebenarnya kepada siapa pun.
      const { prisma, service } = buat('production');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(target());

      await expect(
        service.update(10, { roles: [Role.opd, Role.responden] }, KABUPATEN),
      ).rejects.toThrow(/ASN/);
    });

    it('menolak akun yang Helpdesk nyatakan sebagai warga', async () => {
      const { prisma, service } = buat('production');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        target({ jenisPengguna: JenisPengguna.masyarakat }),
      );

      await expect(
        service.update(10, { roles: [Role.opd, Role.responden] }, KABUPATEN),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak akun BARU yang dibuat langsung berperan opd', async () => {
      // `POST /users` tak punya halaman lagi, tapi endpointnya masih ada. Tanpa
      // gerbang di sini, seluruh pengetatan dapat dilewati satu permintaan.
      const { prisma, service } = buat('production');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          {
            nama: 'Admin Baru',
            email: 'baru@x.go.id',
            roles: [Role.opd],
            opdId: 1,
          } as CreateUserDto,
          KABUPATEN,
        ),
      ).rejects.toThrow(/ASN/);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('produksi: membiarkan', () => {
    it('mengizinkan pemberian peran opd pada akun ASN', async () => {
      const { prisma, service } = buat('production');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        target({ jenisPengguna: JenisPengguna.asn }),
      );
      (prisma.user.update as jest.Mock).mockResolvedValue(
        target({ roles: [Role.opd, Role.responden], jenisPengguna: JenisPengguna.asn }),
      );

      await service.update(10, { roles: [Role.opd, Role.responden] }, KABUPATEN);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('tidak menghalangi penyuntingan akun yang SUDAH berperan opd', async () => {
      // Gerbangnya menjaga PEMBERIAN, bukan pemeliharaan. Kalau ia juga
      // menghalangi penyuntingan akun yang sudah memegang peran itu, Admin
      // Kabupaten tak dapat lagi menyentuh akun Admin OPD mana pun -- termasuk
      // untuk mencabut perannya.
      const { prisma, service } = buat('production');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        target({ roles: [Role.opd, Role.responden], jenisPengguna: null }),
      );
      (prisma.user.update as jest.Mock).mockResolvedValue(
        target({ roles: [Role.opd, Role.responden] }),
      );

      await service.update(10, { roles: [Role.opd, Role.responden] }, KABUPATEN);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('tidak menghalangi PENCABUTAN peran opd dari akun non-ASN', async () => {
      const { prisma, service } = buat('production');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        target({ roles: [Role.opd, Role.responden], jenisPengguna: null }),
      );
      (prisma.user.update as jest.Mock).mockResolvedValue(target({ roles: [Role.responden] }));

      await service.update(10, { roles: [Role.responden] }, KABUPATEN);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('pengembangan: gerbang MATI', () => {
    it('mengizinkan akun seed/pending mengambil peran opd', async () => {
      // Syarat tersurat pengguna. Kalau uji ini memerah, gerbangnya sudah
      // merembes ke lingkungan yang bukan tempatnya.
      const { prisma, service } = buat('development');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(target());
      (prisma.user.update as jest.Mock).mockResolvedValue(
        target({ roles: [Role.opd, Role.responden] }),
      );

      await service.update(10, { roles: [Role.opd, Role.responden] }, KABUPATEN);

      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('mengizinkan pembuatan akun berperan opd', async () => {
      const { prisma, service } = buat('development');
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(target({ roles: [Role.opd] }));

      await service.create(
        { nama: 'Admin Baru', email: 'baru@x.go.id', roles: [Role.opd], opdId: 1 } as CreateUserDto,
        KABUPATEN,
      );

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });
  });
});

describe('UsersService — UserEntity.bolehJadiAdminOpd', () => {
  /**
   * SATU ATURAN YANG SAMA, DISALURKAN KE ANTARMUKA. Halaman manajemen pengguna
   * tidak boleh menghitung sendiri siapa yang boleh dijadikan Admin OPD: ia tak
   * tahu `NODE_ENV` backend, dan dua salinan aturan akan menghasilkan kotak
   * centang yang dapat ditekan tetapi pasti ditolak.
   */
  const buat = (nodeEnv: string) => {
    const prisma = {
      user: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    return { prisma, service: new UsersService(prisma, konfig(nodeEnv)) };
  };

  it('produksi: akun ASN -> true', async () => {
    const { prisma, service } = buat('production');
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      jenisPengguna: JenisPengguna.asn,
    });

    const hasil = await service.findOne(10, KABUPATEN);

    expect(hasil.bolehJadiAdminOpd).toBe(true);
  });

  it('produksi: akun yang belum diketahui -> false', async () => {
    const { prisma, service } = buat('production');
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      jenisPengguna: null,
    });

    const hasil = await service.findOne(10, KABUPATEN);

    expect(hasil.bolehJadiAdminOpd).toBe(false);
  });

  it('pengembangan: siapa pun -> true', async () => {
    const { prisma, service } = buat('development');
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      jenisPengguna: null,
    });

    const hasil = await service.findOne(10, KABUPATEN);

    expect(hasil.bolehJadiAdminOpd).toBe(true);
  });

  it('daftar pengguna ikut membawanya pada setiap baris', async () => {
    // Halaman daftar yang menampilkan tombol sunting perlu tahu ini tanpa
    // memanggil satu endpoint per baris.
    const { prisma, service } = buat('production');
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ ...userRow, jenisPengguna: JenisPengguna.asn, opd: { nama: 'Dinas Kesehatan' } }],
      1,
    ]);

    const hasil = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, KABUPATEN);

    expect(hasil.items[0].bolehJadiAdminOpd).toBe(true);
  });

  it('TIDAK mengirim `jenisPengguna` itu sendiri ke klien', async () => {
    // Status kepegawaian adalah keterangan tentang orangnya; yang dibutuhkan
    // antarmuka hanyalah boleh atau tidak. Kolomnya dideklarasikan di
    // `UserEntity` justru supaya dapat DITAHAN -- serialisasi di repo ini
    // expose-all, jadi kolom yang tak disebut ikut keluar sendiri.
    const { prisma, service } = buat('production');
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      jenisPengguna: JenisPengguna.asn,
    });

    const keluar = instanceToPlain(await service.findOne(10, KABUPATEN));

    expect(keluar).not.toHaveProperty('jenisPengguna');
    expect(keluar.bolehJadiAdminOpd).toBe(true);
  });
});
