import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JenisKelamin, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import type { SessionService } from './session/session.service';

const cu = (role: Role, userId = 1): CurrentUser => ({ userId, role, opdId: null });

const userRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  ssoSubject: 'x',
  nama: 'A',
  email: 'a@x.go.id',
  role: Role.kabupaten,
  opdId: null,
  isActive: true,
  lastLoginAt: null,
  consentAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  respondentProfile: null,
  ...overrides,
});

describe('AuthService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    respondentProfile: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  } as unknown as PrismaService;
  const sessionService = {
    issue: jest.fn().mockReturnValue('signed.jwt.token'),
  } as unknown as SessionService;
  const service = new AuthService(prisma, sessionService);

  beforeEach(() => jest.clearAllMocks());

  it('getMe mengembalikan MeEntity', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow());
    const me = await service.getMe(cu(Role.kabupaten));
    expect(me.email).toBe('a@x.go.id');
  });

  it('getMe melempar NotFound bila pengguna tak ada', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.getMe(cu(Role.kabupaten))).rejects.toThrow(NotFoundException);
  });

  it('updateProfile responden: profil baru tak lengkap → BadRequest', async () => {
    (prisma.respondentProfile.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.updateProfile(cu(Role.responden), { jenisKelamin: JenisKelamin.laki_laki }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updateProfile responden lengkap → create profil', async () => {
    (prisma.respondentProfile.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.respondentProfile.create as jest.Mock).mockResolvedValue({});
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(
      userRow({
        role: Role.responden,
        respondentProfile: {
          jenisKelamin: 'laki_laki',
          kelompokUmur: '20-29',
          pendidikan: 'S1',
          pekerjaan: 'Swasta',
        },
      }),
    );

    const me = await service.updateProfile(cu(Role.responden), {
      jenisKelamin: JenisKelamin.laki_laki,
      kelompokUmur: '20-29',
      pendidikan: 'S1',
      pekerjaan: 'Swasta',
    });

    expect(prisma.respondentProfile.create).toHaveBeenCalled();
    expect(me.respondentProfile?.pekerjaan).toBe('Swasta');
  });

  it('updateProfile non-responden dengan demografis → hanya update nama', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ nama: 'B' }));

    await service.updateProfile(cu(Role.kabupaten), {
      nama: 'B',
      jenisKelamin: JenisKelamin.perempuan,
    });

    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.respondentProfile.create).not.toHaveBeenCalled();
    expect(prisma.respondentProfile.update).not.toHaveBeenCalled();
  });

  describe('devLogin', () => {
    it('pengguna tak ditemukan (email/ssoSubject) → NotFound', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.devLogin({ identifier: 'tidak-ada' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('pengguna nonaktif → Forbidden', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ isActive: false }));
      await expect(service.devLogin({ identifier: 'a@x.go.id' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('sukses → menerbitkan token, memperbarui lastLoginAt, mencari via email ATAU ssoSubject', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow());
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.devLogin({ identifier: 'A@X.GO.ID' });

      expect(result.token).toBe('signed.jwt.token');
      expect(result.user.email).toBe('a@x.go.id');
      expect(sessionService.issue).toHaveBeenCalledWith(1);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ email: 'a@x.go.id' }, { ssoSubject: 'A@X.GO.ID' }],
          }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('mengembalikan konfirmasi sukses (stateless — tak ada state server yang diubah)', () => {
      expect(service.logout()).toEqual({ success: true });
    });
  });
});
