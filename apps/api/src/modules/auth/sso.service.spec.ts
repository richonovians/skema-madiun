import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { SsoProfile, SsoSource } from './interfaces/sso-source.interface';
import { SessionService } from './session/session.service';
import { SsoService } from './sso.service';
import { SsoStateService } from './sso-state.service';

const CONFIG_TERISI: Record<string, string> = {
  'helpdesk.ssoIssuer': 'https://api.example.go.id/api/oauth',
  'helpdesk.ssoClientId': 'klien-skm',
  'helpdesk.ssoClientSecret': 'rahasia',
  'helpdesk.ssoRedirectUri': 'http://localhost:3001/api/v1/auth/sso/callback',
  'helpdesk.ssoScopes': 'openid profile email',
  'app.webUrl': 'http://localhost:3000',
  'app.nodeEnv': 'test',
};

function mockConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  const values = { ...CONFIG_TERISI, ...overrides };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function profil(overrides: Partial<SsoProfile> = {}): SsoProfile {
  return {
    sub: 'hd-sub-abc123',
    email: 'Budi@Example.go.id',
    nama: 'Budi Santoso',
    groups: undefined,
    role: undefined,
    ...overrides,
  };
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    ssoSubject: 'hd-sub-abc123',
    nama: 'Budi Santoso',
    email: 'budi@example.go.id',
    roles: [Role.responden],
    opdId: null,
    isActive: true,
    consentAt: null,
    lastLoginAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

type Mocked = {
  service: SsoService;
  prisma: {
    user: {
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    opd: { findFirst: jest.Mock };
  };
  source: { buildAuthorizeUrl: jest.Mock; exchangeCodeForProfile: jest.Mock };
  state: { issue: jest.Mock; verify: jest.Mock; clearCookie: jest.Mock };
  session: { issue: jest.Mock };
  audit: { record: jest.Mock };
};

function buat(configOverrides: Record<string, string | undefined> = {}): Mocked {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    opd: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const source = {
    buildAuthorizeUrl: jest.fn().mockResolvedValue('https://helpdesk.example.go.id/login'),
    exchangeCodeForProfile: jest.fn().mockResolvedValue(profil()),
  };
  const state = {
    issue: jest.fn().mockReturnValue({ state: 'nonce-1', setCookie: 'sso_state=abc' }),
    verify: jest.fn().mockReturnValue(true),
    clearCookie: jest.fn().mockReturnValue('sso_state=; Max-Age=0'),
  };
  const session = { issue: jest.fn().mockReturnValue('token-sesi-skm') };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  const service = new SsoService(
    prisma as unknown as PrismaService,
    mockConfig(configOverrides),
    session as unknown as SessionService,
    state as unknown as SsoStateService,
    audit as unknown as AuditService,
    source as unknown as SsoSource,
  );

  return { service, prisma, source, state, session, audit };
}

describe('SsoService', () => {
  describe('konfigurasi belum lengkap', () => {
    it.each([
      'helpdesk.ssoIssuer',
      'helpdesk.ssoClientId',
      'helpdesk.ssoClientSecret',
      'helpdesk.ssoRedirectUri',
    ])('%s kosong -> 503 yang menyebut kunci itu', async (kunci) => {
      const { service } = buat({ [kunci]: undefined });
      await expect(service.beginLogin()).rejects.toThrow(ServiceUnavailableException);
      await expect(service.beginLogin()).rejects.toThrow(kunci);
    });

    it('tak menyentuh Helpdesk sama sekali bila konfigurasi kosong', async () => {
      const { service, source } = buat({ 'helpdesk.ssoClientId': undefined });
      await expect(service.beginLogin()).rejects.toThrow(ServiceUnavailableException);
      expect(source.buildAuthorizeUrl).not.toHaveBeenCalled();
    });
  });

  describe('beginLogin', () => {
    it('menerbitkan state dan mengembalikan cookie pendampingnya', async () => {
      const { service, state, source } = buat();
      const hasil = await service.beginLogin();

      expect(state.issue).toHaveBeenCalledTimes(1);
      expect(source.buildAuthorizeUrl).toHaveBeenCalledWith('nonce-1');
      expect(hasil.setCookie).toBe('sso_state=abc');
      expect(hasil.redirectUrl).toBe('https://helpdesk.example.go.id/login');
    });
  });

  describe('completeLogin: pemeriksaan state', () => {
    it('state tidak sah -> 400, dan `code` TIDAK pernah ditukar', async () => {
      const { service, state, source } = buat();
      state.verify.mockReturnValue(false);

      await expect(service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc')).rejects.toThrow(
        BadRequestException,
      );
      // Inti pertahanan CSRF: jangan menghubungi Helpdesk atas permintaan yang
      // belum terbukti berasal dari alur login kita sendiri.
      expect(source.exchangeCodeForProfile).not.toHaveBeenCalled();
    });

    it('state sah tapi code tak ada -> 400', async () => {
      const { service, source } = buat();
      await expect(service.completeLogin(undefined, 'nonce-1', 'sso_state=abc')).rejects.toThrow(
        BadRequestException,
      );
      expect(source.exchangeCodeForProfile).not.toHaveBeenCalled();
    });
  });

  describe('provisioning: pencocokan lewat sub', () => {
    it('sub sudah dikenal -> pakai akun itu, tanpa membuat yang baru', async () => {
      const { service, prisma, session } = buat();
      prisma.user.findFirst.mockResolvedValueOnce(userRow({ id: 42 }));
      prisma.user.update.mockResolvedValueOnce(userRow({ id: 42 }));

      const hasil = await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(session.issue).toHaveBeenCalledWith(42);
      expect(hasil.token).toBe('token-sesi-skm');
    });

    it('akun nonaktif -> Forbidden', async () => {
      const { service, prisma } = buat();
      prisma.user.findFirst.mockResolvedValueOnce(userRow({ isActive: false }));

      await expect(service.completeLogin('kode-1', 'nonce-1', 'c')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  /**
   * Inti pekerjaan ini. `users.sso_subject` yang ada sekarang masih berisi nilai
   * penampung dari masa sebelum SSO, jadi tanpa langkah ini setiap akun lama akan
   * terduplikasi sebagai pengguna baru berperan responden.
   */
  describe('provisioning: penyelarasan akun lama lewat email (2026-08-27)', () => {
    it('sub belum dikenal tapi email cocok -> sso_subject DINAIKKAN, akun lama dipakai', async () => {
      const { service, prisma, session } = buat();
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // pencarian by sub
        .mockResolvedValueOnce(
          userRow({ id: 1, ssoSubject: 'seed-superuser', roles: [Role.superuser] }),
        ); // pencarian by email
      prisma.user.update
        .mockResolvedValueOnce(
          userRow({ id: 1, ssoSubject: 'hd-sub-abc123', roles: [Role.superuser] }),
        )
        .mockResolvedValueOnce(
          userRow({ id: 1, ssoSubject: 'hd-sub-abc123', roles: [Role.superuser] }),
        );

      await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');

      // Kenaikan sso_subject terjadi pada baris yang SUDAH ADA...
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ssoSubject: 'hd-sub-abc123' },
      });
      // ...dan tak ada akun baru yang dibuat, sehingga peran superuser & seluruh
      // riwayatnya tidak hilang.
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(session.issue).toHaveBeenCalledWith(1);
    });

    it('email dicocokkan dalam huruf kecil, bukan apa adanya dari klaim', async () => {
      const { service, prisma } = buat();
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(userRow({ id: 3 }));
      prisma.user.update.mockResolvedValue(userRow({ id: 3 }));

      await service.completeLogin('kode-1', 'nonce-1', 'c');

      // Klaim memuat "Budi@Example.go.id"; kolom users.email disimpan huruf kecil.
      expect(prisma.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: 'budi@example.go.id', deletedAt: null },
      });
    });
  });

  describe('provisioning: pengguna benar-benar baru', () => {
    it('membuat akun berperan responden, TANPA mengisi consentAt', async () => {
      const { service, prisma } = buat();
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // by sub
        .mockResolvedValueOnce(null) // by email
        .mockResolvedValueOnce(null); // cek email milik akun terhapus
      prisma.user.create.mockResolvedValueOnce(userRow({ id: 99 }));

      await service.completeLogin('kode-1', 'nonce-1', 'c');

      const arg = prisma.user.create.mock.calls[0][0].data;
      expect(arg.ssoSubject).toBe('hd-sub-abc123');
      expect(arg.email).toBe('budi@example.go.id');
      expect(arg.roles).toEqual([Role.responden]);
      // consentAt adalah catatan persetujuan UU PDP -- tak boleh terisi sebagai
      // efek samping login.
      expect(arg.consentAt).toBeUndefined();
      // Peran & OPD tak pernah diambil dari klaim (bentuk groups/role belum
      // dikonfirmasi Helpdesk).
      expect(arg.opdId).toBeUndefined();
    });

    it('nama melebihi 50 karakter dipotong agar muat kolom', async () => {
      const { service, prisma, source } = buat();
      const panjang = 'Bagian Pengendalian Penduduk dan Keluarga Berencana Kabupaten Madiun';
      source.exchangeCodeForProfile.mockResolvedValue(profil({ nama: panjang }));
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValueOnce(userRow());

      await service.completeLogin('kode-1', 'nonce-1', 'c');

      const { nama } = prisma.user.create.mock.calls[0][0].data;
      expect(nama).toHaveLength(50);
      expect(panjang.startsWith(nama)).toBe(true);
    });

    it('nama tak ada -> email dipakai sebagai nama, bukan string kosong', async () => {
      const { service, prisma, source } = buat();
      source.exchangeCodeForProfile.mockResolvedValue(profil({ nama: null }));
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValueOnce(userRow());

      await service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(prisma.user.create.mock.calls[0][0].data.nama).toBe('budi@example.go.id');
    });

    it('profil tanpa email -> 503, bukan ledakan constraint NOT NULL', async () => {
      const { service, prisma, source } = buat();
      source.exchangeCodeForProfile.mockResolvedValue(profil({ email: null }));
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.completeLogin('kode-1', 'nonce-1', 'c')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('email milik akun yang sudah dihapus -> Forbidden berpesan jelas, bukan P2002', async () => {
      const { service, prisma } = buat();
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // by sub
        .mockResolvedValueOnce(null) // by email (aktif)
        .mockResolvedValueOnce({ id: 5 }); // by email (terhapus)

      await expect(service.completeLogin('kode-1', 'nonce-1', 'c')).rejects.toThrow(
        /pernah dihapus/i,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  /**
   * Pemetaan peran dari klaim (celah 1, 2026-08-27). Aturannya SEMPIT dengan
   * sengaja: hanya berlaku saat MEMBUAT akun baru. Menyinkronkannya setiap login
   * pernah dipertimbangkan dan ditolak — bila Helpdesk suatu saat tak mengirim
   * klaim (atau salah konfigurasi), setiap Admin Kabupaten akan diturunkan jadi
   * warga pada login berikutnya, dan kegagalan itu senyap.
   */
  describe('pemetaan peran dari klaim (akun baru)', () => {
    const ROLE_MAP = 'admin-kab:kabupaten,admin-opd:opd';

    function baru(configOverrides: Record<string, string | undefined> = {}) {
      const m = buat({ 'helpdesk.ssoRoleMap': ROLE_MAP, ...configOverrides });
      // Tak ada akun cocok lewat sub, email aktif, maupun email terhapus.
      m.prisma.user.findFirst.mockResolvedValue(null);
      m.prisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(userRow(data)),
      );
      return m;
    }

    it('klaim admin-kab -> akun baru berperan kabupaten', async () => {
      const m = baru();
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['admin-kab'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(m.prisma.user.create.mock.calls[0][0].data.roles).toEqual([Role.kabupaten]);
    });

    it('klaim admin-opd + OPD ditemukan -> peran opd DAN opdId terisi', async () => {
      const m = baru();
      m.source.exchangeCodeForProfile.mockResolvedValue(
        profil({ groups: ['admin-opd', '42'], role: undefined }),
      );
      m.prisma.opd.findFirst.mockResolvedValue({ id: 9, nama: 'Dinas Contoh' });

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      const data = m.prisma.user.create.mock.calls[0][0].data;
      expect(data.roles).toEqual([Role.opd]);
      expect(data.opdId).toBe(9);
    });

    /**
     * Peran `opd` TANPA `opdId` membuat dashboard OPD-nya pasti gagal
     * (DashboardService.resolveDashboardOpdId menuntut opdId terisi). Keadaan
     * setengah jadi itu lebih membingungkan bagi pengguna daripada menjadi warga
     * biasa, jadi peran itu tidak diberikan sama sekali.
     */
    it('klaim admin-opd tapi OPD TIDAK ditemukan -> turun ke responden, opdId null', async () => {
      const m = baru();
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['admin-opd'] }));
      m.prisma.opd.findFirst.mockResolvedValue(null);

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      const data = m.prisma.user.create.mock.calls[0][0].data;
      expect(data.roles).toEqual([Role.responden]);
      expect(data.opdId ?? null).toBeNull();
    });

    it('tanpa HELPDESK_SSO_ROLE_MAP -> tetap responden (perilaku sebelumnya utuh)', async () => {
      const m = baru({ 'helpdesk.ssoRoleMap': undefined });
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['admin-kab'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(m.prisma.user.create.mock.calls[0][0].data.roles).toEqual([Role.responden]);
    });

    it('klaim tak dikenal -> responden', async () => {
      const m = baru();
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['orang-lain'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(m.prisma.user.create.mock.calls[0][0].data.roles).toEqual([Role.responden]);
    });

    it('pemetaan ke superuser diabaikan -> responden, bukan superuser', async () => {
      const m = baru({ 'helpdesk.ssoRoleMap': 'bos:superuser' });
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['bos'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(m.prisma.user.create.mock.calls[0][0].data.roles).toEqual([Role.responden]);
    });

    it('OPD dicari lewat externalId ATAU kode, hanya yang aktif', async () => {
      const m = baru();
      m.source.exchangeCodeForProfile.mockResolvedValue(
        profil({ groups: ['admin-opd', 'dinkes'] }),
      );
      m.prisma.opd.findFirst.mockResolvedValue({ id: 3 });

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      const where = m.prisma.opd.findFirst.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
      expect(JSON.stringify(where)).toMatch(/externalId/);
      expect(JSON.stringify(where)).toMatch(/kode/);
    });
  });

  describe('peran akun LAMA tak pernah diubah SSO', () => {
    it('akun kabupaten dengan klaim responden -> peran TIDAK diturunkan', async () => {
      const m = buat({ 'helpdesk.ssoRoleMap': 'warga:responden' });
      m.prisma.user.findFirst.mockResolvedValueOnce(
        userRow({ id: 1, roles: [Role.kabupaten], ssoSubject: 'hd-sub-abc123' }),
      );
      m.prisma.user.update.mockResolvedValue(userRow({ id: 1, roles: [Role.kabupaten] }));
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['warga'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      const data = m.prisma.user.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('role');
      expect(data).not.toHaveProperty('opdId');
      expect(m.prisma.user.create).not.toHaveBeenCalled();
    });

    it('akun lama dicocokkan lewat email: peran juga tak disentuh', async () => {
      const m = buat({ 'helpdesk.ssoRoleMap': 'admin-kab:kabupaten' });
      m.prisma.user.findFirst
        .mockResolvedValueOnce(null) // by sub
        .mockResolvedValueOnce(
          userRow({ id: 3, roles: [Role.opd], ssoSubject: 'pending:x@y.go.id' }),
        );
      m.prisma.user.update.mockResolvedValue(userRow({ id: 3, roles: [Role.opd] }));
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['admin-kab'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      // Panggilan pertama menaikkan ssoSubject; tak satu pun menyentuh `role`.
      for (const call of m.prisma.user.update.mock.calls) {
        expect(call[0].data).not.toHaveProperty('role');
      }
    });
  });

  describe('audit login SSO', () => {
    it('mencatat aksi login dengan penanda jalur & sub Helpdesk', async () => {
      const m = buat();
      m.prisma.user.findFirst.mockResolvedValueOnce(userRow({ id: 12 }));
      m.prisma.user.update.mockResolvedValue(userRow({ id: 12 }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(m.audit.record).toHaveBeenCalledWith(12, 'login', 'auth', {
        via: 'sso',
        sub: 'hd-sub-abc123',
      });
    });

    it('state tidak sah -> tak ada yang dicatat (tak ada aktor)', async () => {
      const m = buat();
      m.state.verify.mockReturnValue(false);

      await expect(m.service.completeLogin('kode-1', 'salah', 'c')).rejects.toThrow(
        BadRequestException,
      );
      expect(m.audit.record).not.toHaveBeenCalled();
    });

    it('akun nonaktif -> ditolak tanpa dicatat sebagai login', async () => {
      const m = buat();
      m.prisma.user.findFirst.mockResolvedValueOnce(userRow({ isActive: false }));

      await expect(m.service.completeLogin('kode-1', 'nonce-1', 'c')).rejects.toThrow(
        ForbiddenException,
      );
      expect(m.audit.record).not.toHaveBeenCalled();
    });
  });

  describe('alamat redirect', () => {
    // Keputusan 2026-08-27: token diserahkan sebagai cookie HttpOnly, jadi
    // alamat ini TIDAK BOLEH memuat token dalam bentuk apa pun -- baik di query
    // maupun di fragment (rancangan pertama menaruhnya di `#token=`).
    it('alamat sukses TIDAK memuat token sama sekali', () => {
      const { service } = buat();
      const url = service.buildSuccessRedirect(1_756_000_000);

      expect(url).toBe('http://localhost:3000/sso/callback#expires=1756000000');
      expect(url).not.toMatch(/token/i);
    });

    it('hanya waktu kedaluwarsa yang dititipkan, dan lewat FRAGMENT', () => {
      const { service } = buat();
      const url = service.buildSuccessRedirect(1_756_000_000);

      // Bagian setelah '#' tak dikirim ke server, jadi tak masuk log akses.
      expect(url.split('#')[0]).toBe('http://localhost:3000/sso/callback');
      expect(url.split('#')[1]).toBe('expires=1756000000');
    });

    it('pesan galat di-encode agar tak merusak alamat', () => {
      const { service } = buat();
      const url = service.buildFailureRedirect('Akun tidak aktif & ditolak');

      expect(url).toContain('#error=');
      expect(url).not.toContain('&ditolak');
    });

    it('garis miring berlebih pada WEB_APP_URL tidak menghasilkan alamat ganda', () => {
      const { service } = buat({ 'app.webUrl': 'http://localhost:3000///' });
      expect(service.buildSuccessRedirect(1)).toBe('http://localhost:3000/sso/callback#expires=1');
      expect(service.buildFailureRedirect('x')).toBe('http://localhost:3000/sso/callback#error=x');
    });
  });
});
