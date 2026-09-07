import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
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
const SUPERUSER = actor(Role.superuser);
const KABUPATEN = actor(Role.kabupaten);

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
  const service = new UsersService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('findAll mengembalikan PaginatedResult (mengecualikan soft-deleted)', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[userRow], 1]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, SUPERUSER);

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('findAll (INT-11) menyisipkan opdNama dari relasi opd, tanpa membocorkan objek opd mentah', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ ...userRow, opd: { nama: 'Dinas Kesehatan' } }],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, SUPERUSER);

    expect(result.items[0].opdNama).toBe('Dinas Kesehatan');
    expect((result.items[0] as unknown as { opd?: unknown }).opd).toBeUndefined();
  });

  it('findAll: user tanpa opd (responden/kabupaten) → opdNama undefined', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [{ ...userRow, opdId: null, opd: null }],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, SUPERUSER);

    expect(result.items[0].opdNama).toBeUndefined();
  });

  it('findOne melempar NotFound bila tidak ada', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.findOne(99, SUPERUSER)).rejects.toThrow(NotFoundException);
  });

  it('Superuser membuat Admin OPD → sukses', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(userRow);

    const dto: CreateUserDto = { nama: 'Admin A', email: 'a@x.go.id', roles: [Role.opd], opdId: 1 };
    const result = await service.create(dto, SUPERUSER);

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
    const result = await service.create(dto, SUPERUSER);

    expect(result.roles).toEqual([Role.kabupaten]);
  });

  it('membuat Admin OPD tanpa opdId → BadRequest', async () => {
    const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', roles: [Role.opd] };
    await expect(service.create(dto, SUPERUSER)).rejects.toThrow(BadRequestException);
  });

  it('email/ssoSubject duplikat → Conflict', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow);

    const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', roles: [Role.opd], opdId: 1 };
    await expect(service.create(dto, SUPERUSER)).rejects.toThrow(ConflictException);
  });

  it('updateStatus mengubah isActive → sukses', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...userRow, isActive: false });

    const result = await service.updateStatus(10, { isActive: false }, SUPERUSER);

    expect(result.isActive).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isActive: false },
    });
  });

  it('update (2026-08-05) mengubah role akun lain, opd → kabupaten, opdId ikut dikosongkan', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow); // role: opd
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...userRow,
      roles: [Role.kabupaten],
      opdId: null,
    });

    const result = await service.update(10, { roles: [Role.kabupaten] }, SUPERUSER);

    expect(result.roles).toEqual([Role.kabupaten]);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { nama: undefined, roles: [Role.kabupaten], opdId: null },
    });
  });

  it('update: superuser TIDAK BOLEH mengubah role akun sendiri (cegah self-lockout) → Forbidden', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      ...userRow,
      id: 1,
      roles: [Role.kabupaten],
    });

    await expect(service.update(1, { roles: [Role.opd], opdId: 1 }, SUPERUSER)).rejects.toThrow(
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

    await expect(service.update(10, { roles: [Role.opd] }, SUPERUSER)).rejects.toThrow(
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

    const result = await service.remove(10, SUPERUSER);

    expect(result.isActive).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { deletedAt: expect.any(Date), isActive: false },
    });
  });

  it('remove: TIDAK BOLEH menghapus akun sendiri (cegah self-lockout) → Forbidden', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...userRow, id: 1 });

    await expect(service.remove(1, SUPERUSER)).rejects.toThrow(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('remove: user tak ada/sudah terhapus → NotFound', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.remove(99, SUPERUSER)).rejects.toThrow(NotFoundException);
  });

  // Manajemen pengguna khusus superuser (2026-08-20). Sejak T6 (7 Sep 2026)
  // `@Roles(Role.superuser)` di controller juga menahannya; yang diuji di sini
  // lapis service -- yang tetap berlaku bila daftar dekorator kelak diperluas
  // keliru. Gerbang guard-nya diuji di test/users.e2e-spec.ts.
  describe('khusus superuser (2026-08-20)', () => {
    it('findAll oleh Admin Kabupaten → Forbidden, DB tak disentuh', async () => {
      await expect(
        service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, KABUPATEN),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('findOne oleh Admin Kabupaten → Forbidden sebelum query', async () => {
      await expect(service.findOne(10, KABUPATEN)).rejects.toThrow(ForbiddenException);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('create oleh Admin Kabupaten → Forbidden, tak ada akun dibuat', async () => {
      const dto: CreateUserDto = { nama: 'A', email: 'a@x.go.id', roles: [Role.opd], opdId: 1 };
      await expect(service.create(dto, KABUPATEN)).rejects.toThrow(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('update role oleh Admin Kabupaten → Forbidden (hanya superuser yang boleh mengangkat admin)', async () => {
      await expect(service.update(10, { roles: [Role.kabupaten] }, KABUPATEN)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updateStatus oleh Admin Kabupaten → Forbidden', async () => {
      await expect(service.updateStatus(10, { isActive: false }, KABUPATEN)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('remove oleh Admin Kabupaten → Forbidden, akun tak ikut tersoft-delete', async () => {
      await expect(service.remove(10, KABUPATEN)).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('Admin OPD juga ditolak (bukan cuma kabupaten)', async () => {
      await expect(
        service.findAll({ page: 1, limit: 20 } as ListUsersQueryDto, actor(Role.opd)),
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
          roles: [Role.superuser, Role.opd],
          opdId: 1,
        } as CreateUserDto,
        SUPERUSER,
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roles: [Role.superuser, Role.opd], opdId: 1 }),
        }),
      );
    });

    it('MENOLAK himpunan role kosong', async () => {
      await expect(
        service.create(
          { nama: 'X', email: 'x@e.go.id', roles: [] } as unknown as CreateUserDto,
          SUPERUSER,
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
          SUPERUSER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('MENGOSONGKAN opdId bila roles tak memuat opd', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.create as jest.Mock).mockResolvedValue(userRow);

      await service.create(
        { nama: 'X', email: 'x2@e.go.id', roles: [Role.kabupaten], opdId: 1 } as CreateUserDto,
        SUPERUSER,
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
          SUPERUSER,
        ),
      ).resolves.toBeDefined();
    });

    it('anti-self-lockout: MENOLAK mengubah himpunan role akun sendiri', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...userRow,
        id: 1,
        roles: [Role.superuser],
        opdId: null,
      });

      await expect(service.update(1, { roles: [Role.opd] }, SUPERUSER)).rejects.toThrow(
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
        roles: [Role.superuser, Role.opd],
        opdId: 1,
      });
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow);

      await expect(
        service.update(1, { roles: [Role.opd, Role.superuser] }, SUPERUSER),
      ).resolves.toBeDefined();
    });

    it('findAll menyaring dengan roles: { has }', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[userRow], 1]);

      await service.findAll({ page: 1, limit: 20, role: Role.opd } as ListUsersQueryDto, SUPERUSER);

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

      const hasil = await service.getStats(SUPERUSER);

      expect(hasil.totalUsers).toBe(7);
      expect(hasil.activeUsers).toBe(5);
      const panggilan = (prisma.user.count as jest.Mock).mock.calls;
      // Kedua hitungan HARUS mengecualikan akun terhapus: tanpa `deletedAt`,
      // angka di layar terus bertambah walau akunnya sudah dihapus.
      expect(panggilan[0][0]).toEqual({ where: { deletedAt: null } });
      expect(panggilan[1][0]).toEqual({ where: { deletedAt: null, isActive: true } });
    });

    it('bukan superuser -> Forbidden', async () => {
      await expect(service.getStats(KABUPATEN)).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
