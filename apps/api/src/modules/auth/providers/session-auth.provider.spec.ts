import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SESSION_COOKIE } from '../session/session-cookie.service';
import type { SessionCookieService } from '../session/session-cookie.service';
import { readCookie } from '../session/cookie.util';
import type { SessionService } from '../session/session.service';
import { SessionAuthProvider } from './session-auth.provider';

const req = (authorization?: string) => ({ headers: { authorization } });

const userRow = (over: Record<string, unknown> = {}) => ({
  id: 42,
  roles: [Role.opd],
  opdId: 5,
  ssoSubject: 'seed-opd',
  isActive: true,
  deletedAt: null,
  ...over,
});

describe('SessionAuthProvider', () => {
  const prisma = { user: { findUnique: jest.fn() } } as unknown as PrismaService;
  const sessionService = { verify: jest.fn() } as unknown as SessionService;
  // Pembacaan cookie-nya nyata (bukan mock) -- yang diuji di sini justru jalur
  // mana yang dipilih, dan itu tak terlihat kalau pembacanya dipalsukan.
  const sessionCookie = {
    read: (header?: string) => readCookie(header, SESSION_COOKIE),
  } as unknown as SessionCookieService;
  const provider = new SessionAuthProvider(prisma, sessionService, sessionCookie);

  beforeEach(() => jest.clearAllMocks());

  it('tanpa header Authorization → null', async () => {
    expect(await provider.resolveUser(req())).toBeNull();
    expect(sessionService.verify).not.toHaveBeenCalled();
  });

  it('header tanpa prefiks "Bearer " → null', async () => {
    expect(await provider.resolveUser(req('token-tanpa-prefix'))).toBeNull();
  });

  it('token tidak valid/kedaluwarsa → null', async () => {
    (sessionService.verify as jest.Mock).mockReturnValue(null);
    expect(await provider.resolveUser(req('Bearer token-invalid'))).toBeNull();
    expect(sessionService.verify).toHaveBeenCalledWith('token-invalid');
  });

  it('token valid tapi user tidak ditemukan → null', async () => {
    (sessionService.verify as jest.Mock).mockReturnValue({ sub: 999 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    expect(await provider.resolveUser(req('Bearer valid-token'))).toBeNull();
  });

  it('user nonaktif (isActive=false) → null', async () => {
    (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow({ isActive: false }));
    expect(await provider.resolveUser(req('Bearer valid-token'))).toBeNull();
  });

  it('user soft-deleted (deletedAt terisi) → null', async () => {
    (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow({ deletedAt: new Date() }));
    expect(await provider.resolveUser(req('Bearer valid-token'))).toBeNull();
  });

  it('token valid & user aktif → mengembalikan CurrentUser sesuai baris DB terkini', async () => {
    (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());

    const result = await provider.resolveUser(req('Bearer valid-token'));

    // `roles` (kepemilikan) DAN `actingRole` (yang dipakai) dua-duanya
    // diperiksa: akun ber-role tunggal tak perlu memilih, jadi keduanya
    // menunjuk role yang sama -- dan itulah yang membuktikan cabang "tanpa
    // klaim act & role tunggal" pada resolveActingRole benar-benar dilalui.
    expect(result).toEqual({
      userId: 42,
      roles: [Role.opd],
      actingRole: Role.opd,
      opdId: 5,
      ssoSubject: 'seed-opd',
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
  });

  it('header Authorization array (multi-value) → memakai elemen pertama', async () => {
    (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());

    const result = await provider.resolveUser({
      headers: { authorization: ['Bearer valid-token', 'Bearer lainnya'] },
    });

    expect(result).not.toBeNull();
    expect(sessionService.verify).toHaveBeenCalledWith('valid-token');
  });

  /**
   * Jalur cookie `session` HttpOnly (2026-08-27) — cara sesi SSO diserahkan.
   * Lihat SessionCookieService untuk alasan cookie dipilih atas fragment URL.
   */
  describe('cookie session (jalur SSO)', () => {
    it('tanpa header Authorization tapi ADA cookie session → dipakai', async () => {
      (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());

      const result = await provider.resolveUser({
        headers: { cookie: `role=opd; ${SESSION_COOKIE}=jwt-dari-sso; area=opd` },
      });

      expect(result).not.toBeNull();
      expect(sessionService.verify).toHaveBeenCalledWith('jwt-dari-sso');
    });

    it('cookie session tetap melewati pemeriksaan DB — akun nonaktif → null', async () => {
      (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow({ isActive: false }));

      expect(
        await provider.resolveUser({ headers: { cookie: `${SESSION_COOKIE}=jwt` } }),
      ).toBeNull();
    });

    it('cookie LAIN tanpa cookie session → null', async () => {
      expect(await provider.resolveUser({ headers: { cookie: 'token=abc; role=opd' } })).toBeNull();
      expect(sessionService.verify).not.toHaveBeenCalled();
    });

    it('header Authorization DIDAHULUKAN atas cookie', async () => {
      (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());

      await provider.resolveUser({
        headers: { authorization: 'Bearer dari-header', cookie: `${SESSION_COOKIE}=dari-cookie` },
      });

      // Kalau cookie yang menang, galat "token saya salah" akan tampak berhasil.
      expect(sessionService.verify).toHaveBeenCalledWith('dari-header');
      expect(sessionService.verify).not.toHaveBeenCalledWith('dari-cookie');
    });

    it('header "Bearer " kosong tidak jatuh ke cookie — null, bukan sesi orang lain', async () => {
      expect(
        await provider.resolveUser({
          headers: { authorization: 'Bearer ', cookie: `${SESSION_COOKIE}=dari-cookie` },
        }),
      ).toBeNull();
      expect(sessionService.verify).not.toHaveBeenCalled();
    });
  });
});
