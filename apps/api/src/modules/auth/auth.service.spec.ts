import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JenisKelamin, Role } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
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
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const service = new AuthService(prisma, sessionService, audit);

  beforeEach(() => jest.clearAllMocks());

  /**
   * Audit login (celah 3, 2026-08-27). Sebelumnya yang tercatat cuma
   * `lastLoginAt` — SATU nilai yang tertimpa setiap login, jadi tak ada riwayat
   * "siapa masuk kapan" sama sekali. Untuk sistem RBAC pemerintahan itu jejak
   * yang biasanya diminta auditor.
   */
  describe('audit login', () => {
    it('devLogin mencatat aksi login dengan penanda jalurnya', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow());
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow());

      await service.devLogin({ identifier: 'a@x.go.id' });

      expect(audit.record).toHaveBeenCalledWith(1, 'login', 'auth', { via: 'dev-login' });
    });

    it('login yang GAGAL tidak dicatat (tak ada aktor untuk ditunjuk)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.devLogin({ identifier: 'tak-ada' })).rejects.toThrow(NotFoundException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('akun nonaktif ditolak tanpa dicatat sebagai login', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ isActive: false }));

      await expect(service.devLogin({ identifier: 'a@x.go.id' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  /**
   * `consentRequired` (celah 2, 2026-08-27) diekspos sebagai boolean, BUKAN
   * `consentAt`-nya: yang dibutuhkan antarmuka cuma "sudah atau belum", sementara
   * tanggal persetujuan adalah data pribadi yang tak ada gunanya dikirim ke klien.
   */
  describe('getMe.consentRequired', () => {
    it.each([
      [Role.responden, null, true],
      [Role.responden, new Date(), false],
      [Role.kabupaten, null, false],
      [Role.opd, null, false],
      [Role.superuser, null, false],
    ])('%s dengan consentAt=%s -> %s', async (role, consentAt, harapan) => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ role, consentAt }));

      const me = await service.getMe(cu(role));

      expect(me.consentRequired).toBe(harapan);
    });

    /**
     * devLogin memakai jalur pembangunan MeEntity yang SAMA dengan getMe.
     * Sebelum ini ia memanggil `new MeEntity(row)` langsung, sehingga
     * `consentRequired` & `ssoLinked` undefined — dan frontend yang membaca
     * hasil dev-login tak bisa tahu harus mengarahkan ke halaman persetujuan.
     */
    it('devLogin melaporkan consentRequired & ssoLinked, sama seperti getMe', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        userRow({ role: Role.responden, consentAt: null, ssoSubject: 'seed-responden' }),
      );
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow());

      const sesi = await service.devLogin({ identifier: 'a@x.go.id' });

      expect(sesi.user.consentRequired).toBe(true);
      expect(sesi.user.ssoLinked).toBe(false);
    });

    it('consentAt sendiri TIDAK ikut keluar', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        userRow({ role: Role.responden, consentAt: new Date() }),
      );

      const me = await service.getMe(cu(Role.responden));

      // Ditandai @Exclude() di MeEntity; dipastikan di sini supaya tak diam-diam
      // ikut terekspos saat field baru ditambahkan di sekitarnya.
      expect(Object.keys(instanceToPlain(me))).not.toContain('consentAt');
    });
  });

  /**
   * `ssoLinked` (celah 5, 2026-08-27). Ditentukan DI BACKEND, bukan dengan
   * frontend menebak pola string `seed-*`/`pending:*` dari `ssoSubject`:
   * bentuk penampung itu detail internal basis data, dan menyalinnya ke adapter
   * frontend berarti dua tempat harus ingat aturan yang sama.
   */
  describe('getMe.ssoLinked', () => {
    it.each([
      ['penampung seed', 'seed-responden', false],
      ['penampung pending', 'pending:budi@gmail.com', false],
      ['sub asli Helpdesk', 'e3152173-1ad7-424c-aed8-2cdf606a25c6', true],
      ['sub asli berbentuk angka', '10482', true],
    ])('%s -> %s', async (_nama, ssoSubject, harapan) => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ ssoSubject }));

      const me = await service.getMe(cu(Role.responden));

      expect(me.ssoLinked).toBe(harapan);
    });
  });

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
