import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SESSION_COOKIE } from '../session/session-cookie.service';
import type { SessionCookieService } from '../session/session-cookie.service';
import { readCookie } from '../session/cookie.util';
import type { SessionService } from '../session/session.service';
import { PenyimpanSesiMemori } from '../session/penyimpan-sesi.memori';
import type { PenyimpanSesi } from '../session/penyimpan-sesi.interface';
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
  const penyimpan = new PenyimpanSesiMemori();
  const provider = new SessionAuthProvider(prisma, sessionService, sessionCookie, penyimpan);

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

/**
 * DAFTAR PENCABUTAN (7 Oktober 2026).
 *
 * Sesi yang dicabut harus ditolak pada permintaan berikutnya, bukan menunggu
 * pagu `abs` lewat. Pemeriksaannya menumpang jalur `bacaSesi()` yang sudah ada
 * supaya tak lahir jalur kedua yang bisa diam-diam berbeda.
 */
describe('SessionAuthProvider — daftar pencabutan', () => {
  const prisma = { user: { findUnique: jest.fn() } } as unknown as PrismaService;
  const sessionService = { verify: jest.fn() } as unknown as SessionService;
  const sessionCookie = {
    read: (header?: string) => readCookie(header, SESSION_COOKIE),
  } as unknown as SessionCookieService;

  const buat = (penyimpan: PenyimpanSesi) =>
    new SessionAuthProvider(prisma, sessionService, sessionCookie, penyimpan);

  const sesiBerlaku = { sub: 42, abs: Math.floor(Date.now() / 1000) + 3600, sid: 'sid-a' };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    (sessionService.verify as jest.Mock).mockReturnValue(sesiBerlaku);
  });

  it('KONTROL: sesi yang tercatat hidup tetap diterima', async () => {
    const penyimpan = new PenyimpanSesiMemori();
    await penyimpan.simpan('sid-a', { uid: 42, abs: sesiBerlaku.abs });

    const hasil = await buat(penyimpan).resolveUser(req('Bearer t'));

    expect(hasil).toEqual(expect.objectContaining({ userId: 42 }));
  });

  it('sesi yang sudah dicabut ditolak walau tokennya masih sah', async () => {
    // Inti seluruh fitur. Tanda tangan dan pagu tokennya masih benar; yang
    // membuatnya ditolak hanya ketiadaannya di daftar.
    const penyimpan = new PenyimpanSesiMemori();
    await penyimpan.simpan('sid-a', { uid: 42, abs: sesiBerlaku.abs });
    await penyimpan.cabut('sid-a');

    expect(await buat(penyimpan).resolveUser(req('Bearer t'))).toBeNull();
  });

  it('token terbitan lama tanpa sid tetap diterima', async () => {
    // Menolaknya berarti memaksa setiap orang login ulang saat fitur ini terbit.
    (sessionService.verify as jest.Mock).mockReturnValue({ sub: 42, abs: sesiBerlaku.abs });
    const penyimpan = new PenyimpanSesiMemori();

    const hasil = await buat(penyimpan).resolveUser(req('Bearer t'));

    expect(hasil).toEqual(expect.objectContaining({ userId: 42 }));
  });

  it('GAGAL TERTUTUP: penyimpan yang tak dapat menjawab berarti sesi ditolak', async () => {
    // Keputusan tersurat, bukan kelalaian. Daftar pencabutan yang dapat
    // dilewati dengan menjatuhkan penyimpannya bukan daftar pencabutan sama
    // sekali. Konsekuensinya Redis menjadi titik gagal tunggal, dan itu
    // ditebus dengan AOF serta singgahan pendek, bukan dengan gagal terbuka.
    const penyimpanMati: PenyimpanSesi = {
      simpan: jest.fn(),
      hidup: jest.fn().mockRejectedValue(new Error('Redis tak terjangkau')),
      cabut: jest.fn(),
      cabutSemua: jest.fn(),
      daftar: jest.fn(),
    };

    expect(await buat(penyimpanMati).resolveUser(req('Bearer t'))).toBeNull();
  });
});
