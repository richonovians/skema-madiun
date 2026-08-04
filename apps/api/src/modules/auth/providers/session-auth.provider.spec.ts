import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { SessionService } from '../session/session.service';
import { SessionAuthProvider } from './session-auth.provider';

const req = (authorization?: string) => ({ headers: { authorization } });

const userRow = (over: Record<string, unknown> = {}) => ({
  id: 42,
  role: Role.opd,
  opdId: 5,
  ssoSubject: 'seed-opd',
  isActive: true,
  deletedAt: null,
  ...over,
});

describe('SessionAuthProvider', () => {
  const prisma = { user: { findUnique: jest.fn() } } as unknown as PrismaService;
  const sessionService = { verify: jest.fn() } as unknown as SessionService;
  const provider = new SessionAuthProvider(prisma, sessionService);

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

    expect(result).toEqual({ userId: 42, role: Role.opd, opdId: 5, ssoSubject: 'seed-opd' });
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
});
