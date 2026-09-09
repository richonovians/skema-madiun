import {
  BadRequestException,
  ForbiddenException,
  Logger,
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

const CONFIG_TERISI: Record<string, string | boolean> = {
  'helpdesk.ssoIssuer': 'https://api.example.go.id/api/oauth',
  'helpdesk.ssoClientId': 'klien-skm',
  'helpdesk.ssoClientSecret': 'rahasia',
  'helpdesk.ssoRedirectUri': 'http://localhost:3001/api/v1/auth/sso/callback',
  'helpdesk.ssoScopes': 'openid profile email',
  'app.webUrl': 'http://localhost:3000',
  'app.nodeEnv': 'test',
};

function mockConfig(overrides: Record<string, string | boolean | undefined> = {}): ConfigService {
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
    // Klaim mentah. Baku KOSONG, bukan berisi contoh: bentuk klaim OPD Helpdesk
    // belum dikonfirmasi (8 September 2026), jadi uji yang butuh klaim OPD
    // menuliskannya sendiri lewat `overrides` -- tak ada uji yang diam-diam
    // bergantung pada tebakan bentuk di sini.
    klaim: {},
    // Keadaan normal dari penyedia identitas. Ditulis TERSURAT sejak temuan
    // audit T5 (7 September 2026) supaya uji lain tak diam-diam bergantung pada
    // nilai baku yang justru sedang diperketat di blok "penautan email".
    emailVerified: true,
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
    opd: { findFirst: jest.Mock; findMany: jest.Mock };
  };
  source: { buildAuthorizeUrl: jest.Mock; exchangeCodeForProfile: jest.Mock };
  state: { issue: jest.Mock; verify: jest.Mock; clearCookie: jest.Mock };
  session: { issue: jest.Mock };
  audit: { record: jest.Mock };
};

function buat(configOverrides: Record<string, string | boolean | undefined> = {}): Mocked {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    opd: {
      findFirst: jest.fn().mockResolvedValue(null),
      // Dipakai pencocokan NAMA (tingkat 3). Baku kosong: pencocokan nama
      // hanya berjalan bila externalId/kode gagal, dan uji yang
      // membutuhkannya mengisinya sendiri.
      findMany: jest.fn().mockResolvedValue([]),
    },
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
   * TEMUAN AUDIT T5 (7 September 2026).
   *
   * Jalur penautan lewat email adalah SATU-SATUNYA tempat sebuah klaim SSO dapat
   * membuat pemegangnya mewarisi peran akun yang sudah ada. Sebelum ini klaim
   * `email` dipercaya tanpa syarat: siapa pun yang dapat membuat akun Helpdesk
   * ber-email `superuser@example.go.id` akan ditautkan ke akun superuser SKEMA
   * beserta seluruh haknya.
   *
   * Karena itu penautan sekarang menuntut `email_verified === true`. GAGAL
   * TERTUTUP disengaja: klaim yang HILANG pun ditolak, sebab "tak ada bukti
   * terverifikasi" bukan berarti "terverifikasi" -- pola yang sama dipakai
   * ConsentService.assertConsented.
   *
   * Jalur LAIN sengaja tak disentuh, dan itu bukan kelalaian:
   * - Pencocokan lewat `sub` tak melibatkan email sama sekali.
   * - Pembuatan akun baru tak mewarisi hak siapa pun; perannya datang dari klaim
   *   grup, bukan dari emailnya.
   */
  describe('provisioning: penautan email menuntut email terverifikasi (T5)', () => {
    const akunLama = () =>
      userRow({ id: 1, ssoSubject: 'seed-superuser', roles: [Role.superuser] });

    const siapkan = (prisma: Mocked['prisma']) => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // pencarian by sub
        .mockResolvedValueOnce(akunLama()); // pencarian by email
    };

    it('email_verified false -> DITOLAK, akun lama tak disentuh', async () => {
      const { service, prisma, source, session } = buat();
      source.exchangeCodeForProfile.mockResolvedValue(profil({ emailVerified: false }));
      siapkan(prisma);

      await expect(service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      // Bukan cuma tak ditulis: tak ada sesi yang terbit sama sekali.
      expect(session.issue).not.toHaveBeenCalled();
    });

    it('klaim email_verified HILANG -> juga ditolak (gagal tertutup)', async () => {
      const { service, prisma, source } = buat();
      source.exchangeCodeForProfile.mockResolvedValue(profil({ emailVerified: null }));
      siapkan(prisma);

      await expect(service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('email_verified true -> penautan berjalan seperti biasa', async () => {
      const { service, prisma, session } = buat();
      siapkan(prisma);
      prisma.user.update.mockResolvedValue(
        userRow({ id: 1, ssoSubject: 'hd-sub-abc123', roles: [Role.superuser] }),
      );

      await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ssoSubject: 'hd-sub-abc123' },
      });
      expect(session.issue).toHaveBeenCalledWith(1);
    });

    it('penautan tercatat di audit walau emailnya terverifikasi', async () => {
      // Menaikkan sebuah akun ke identitas Helpdesk baru adalah peristiwa
      // pembawa hak; ia harus meninggalkan jejak, bukan hanya baris log.
      const { service, prisma, audit } = buat();
      siapkan(prisma);
      prisma.user.update.mockResolvedValue(
        userRow({ id: 1, ssoSubject: 'hd-sub-abc123', roles: [Role.superuser] }),
      );

      await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');

      expect(audit.record).toHaveBeenCalledWith(
        1,
        'sso_link_email',
        'auth',
        expect.objectContaining({ sub: 'hd-sub-abc123' }),
      );
    });

    it('sakelar darurat mengizinkan klaim hilang, dan penautannya tetap tercatat', async () => {
      // Bentuk klaim Helpdesk belum dikonfirmasi (butir 04 dokumen permintaan).
      // Tanpa jalan keluar apa pun, go-live tanpa klaim ini berarti SELURUH akun
      // lama gagal ditautkan dan hanya dapat diperbaiki dengan mengubah kode.
      // Sakelarnya baku MATI, dan pemakaiannya wajib meninggalkan jejak.
      const { service, prisma, audit, source } = buat({
        // boolean, bukan string 'true' — configuration.ts sudah mengubahnya
        // (`=== 'true'`) sebelum sampai ke service.
        'helpdesk.ssoAllowUnverifiedEmailLink': true,
      });
      source.exchangeCodeForProfile.mockResolvedValue(profil({ emailVerified: null }));
      siapkan(prisma);
      prisma.user.update.mockResolvedValue(userRow({ id: 1, ssoSubject: 'hd-sub-abc123' }));

      await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        1,
        'sso_link_email_unverified',
        'auth',
        expect.objectContaining({ sub: 'hd-sub-abc123' }),
      );
    });

    it('KONTROL: pencocokan lewat sub tak terpengaruh email_verified', async () => {
      // Kalau uji ini ikut merah, artinya penjaga barunya dipasang terlalu jauh
      // ke atas dan memutus login setiap pengguna yang sudah dikenal.
      const { service, prisma, source, session } = buat();
      source.exchangeCodeForProfile.mockResolvedValue(profil({ emailVerified: false }));
      prisma.user.findFirst.mockResolvedValueOnce(userRow({ id: 9 })); // ketemu by sub
      prisma.user.update.mockResolvedValue(userRow({ id: 9 }));

      await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');

      expect(session.issue).toHaveBeenCalledWith(9);
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

    /**
     * PEMBALIKAN keputusan 27 Agustus 2026, diminta pengguna 6 September 2026:
     * tipe "admin" dari Helpdesk menjadi superuser di SKEMA. Sebelumnya
     * pemetaan ini diabaikan dan akunnya jatuh menjadi `responden`.
     */
    it('pemetaan ke superuser DITERIMA -- larangan lama sudah dicabut', async () => {
      const m = baru({ 'helpdesk.ssoRoleMap': 'bos:superuser' });
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['bos'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(m.prisma.user.create.mock.calls[0][0].data.roles).toEqual([Role.superuser]);
    });

    it('paket beberapa peran -> seluruhnya tersimpan, beserta opdId', async () => {
      const m = baru({ 'helpdesk.ssoRoleMap': 'pegawai-dinas:opd+responden' });
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['pegawai-dinas'] }));
      m.prisma.opd.findFirst.mockResolvedValue({ id: 7 });

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      const data = m.prisma.user.create.mock.calls[0][0].data;
      // Inti permintaan 1: dua role inilah yang memunculkan pemilih peran saat
      // login. Dengan satu role, pemilihnya tak pernah tampil.
      expect(data.roles).toEqual([Role.opd, Role.responden]);
      expect(data.opdId).toBe(7);
    });

    /**
     * Perbaikan perilaku yang menumpang di sini: SEBELUMNYA seluruh akun jatuh
     * menjadi `responden` bila OPD-nya tak ditemukan. Pada paket admin, itu
     * berarti seorang superuser kehilangan haknya hanya karena OPD-nya belum
     * terdaftar. Sekarang yang dibuang hanya `opd`-nya.
     */
    it('paket ber-opd tapi OPD tak ditemukan -> sisa paket UTUH, bukan responden', async () => {
      const m = baru({ 'helpdesk.ssoRoleMap': 'admin:superuser+opd+responden' });
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['admin'] }));
      m.prisma.opd.findFirst.mockResolvedValue(null);

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      const data = m.prisma.user.create.mock.calls[0][0].data;
      expect(data.roles).toEqual([Role.superuser, Role.responden]);
      expect(data.opdId ?? null).toBeNull();
    });

    /**
     * Pengaman ketiga atas pembalikan di atas (dua lainnya: baku `responden`
     * bila env kosong, dan penetapan hanya saat akun dibuat). Tanpa jejak ini,
     * Helpdesk yang salah kirim akan memberi hak tertinggi tanpa ada yang tahu.
     */
    it('akun ber-superuser dari klaim MENULIS jejak audit', async () => {
      const m = baru({ 'helpdesk.ssoRoleMap': 'bos:superuser' });
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['bos'] }));

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      expect(m.audit.record).toHaveBeenCalledWith(
        expect.any(Number),
        'sso_grant_superuser',
        'auth',
        expect.objectContaining({ sub: 'hd-sub-abc123' }),
      );
    });

    it('KONTROL: akun TANPA superuser tidak menulis jejak itu', async () => {
      const m = baru({ 'helpdesk.ssoRoleMap': 'pegawai-dinas:opd+responden' });
      m.source.exchangeCodeForProfile.mockResolvedValue(profil({ groups: ['pegawai-dinas'] }));
      m.prisma.opd.findFirst.mockResolvedValue({ id: 7 });

      await m.service.completeLogin('kode-1', 'nonce-1', 'c');

      const aksi = m.audit.record.mock.calls.map((c) => c[1]);
      expect(aksi).not.toContain('sso_grant_superuser');
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

/**
 * SINKRONISASI OPD DARI HELPDESK (permintaan pengguna 8 September 2026).
 *
 * Kata penggunanya: "kalau semisalnya sudah memilih opd pada salah satu akun dan
 * tidak bisa diganti lagi setelah sudah disimpan agar tetap sinkron dengan
 * helpdesk", dan alasannya diperjelas sendiri: "tim saya tidak bisa mengubah
 * data yang berasal dari helpdesk ... jadi yang bisa diubah hanya role pada
 * SKEMA saja."
 *
 * Sampai perubahan ini, OPD hanya ditetapkan SAAT AKUN DIBUAT dan tak pernah
 * disegarkan lagi. Sekarang login menjadi satu-satunya penulis kolom itu —
 * `PATCH /users/:id` sudah tak menerimanya (UpdateUserDto).
 *
 * Yang dijaga ketat di blok ini: KLAIM YANG TIDAK ADA tidak boleh mengosongkan
 * apa pun. Itu menghormati keputusan 27 Agustus 2026 yang menolak sinkronisasi
 * PERAN setiap login — bila Helpdesk berhenti mengirim klaim, yang mengosongkan
 * akan mencabut hak seluruh Admin OPD secara senyap.
 *
 * DIUKUR, supaya tak ada yang mengira seluruh blok ini membuktikan hal yang
 * sama: terhadap service LAMA hanya DUA uji pertama yang memerah — sisanya
 * hijau karena kode lama tak pernah menyentuh `opdId` sama sekali. Ketujuh uji
 * itu menjaga arah yang berbeda: bukan "fiturnya ada", melainkan "fiturnya
 * tidak salah". Dibuktikan pada yang paling penting — `cocok.length === 1`
 * diganti `>= 1` (yaitu "ambil yang pertama"), dan uji "cocok ke DUA OPD"
 * langsung memerah.
 */
describe('sinkronisasi OPD saat login', () => {
  const OPD_DINKES = { id: 42, nama: 'Dinas Kesehatan' };

  /** Akun lama yang login kembali; `opdId` awal ditentukan pemanggil. */
  const login = async (
    m: Mocked,
    profileOverrides: Partial<SsoProfile>,
    opdIdAwal: number | null = null,
  ) => {
    m.prisma.user.findFirst.mockResolvedValue(userRow({ opdId: opdIdAwal }));
    m.prisma.user.update.mockResolvedValue(userRow({ opdId: opdIdAwal }));
    m.source.exchangeCodeForProfile.mockResolvedValue(profil(profileOverrides));
    await m.service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');
    return m.prisma.user.update.mock.calls[0][0].data as Record<string, unknown>;
  };

  it('nama OPD dari klaim yang cocok TEPAT SATU -> opdId ditulis', async () => {
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });
    m.prisma.opd.findMany.mockResolvedValue([OPD_DINKES]);

    const data = await login(m, { klaim: { opd: 'Dinas Kesehatan' } });

    expect(data.opdId).toBe(42);
  });

  it('kapital & spasi berlebih tetap cocok', async () => {
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });
    m.prisma.opd.findMany.mockResolvedValue([OPD_DINKES]);

    const data = await login(m, { klaim: { opd: '  DINAS   Kesehatan ' } });

    expect(data.opdId).toBe(42);
  });

  it('TANPA klaim OPD -> kolomnya tak disentuh sama sekali', async () => {
    // Bukan "ditulis dengan nilai lama": tak disentuh. Bedanya penting kalau
    // kelak ada penulis lain — dan ini yang menghormati keputusan 27 Agustus.
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });

    const data = await login(m, { klaim: {} }, 42);

    expect(data).not.toHaveProperty('opdId');
  });

  it('klaim ADA tapi tak ada OPD yang cocok -> kolomnya tak disentuh', async () => {
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });
    m.prisma.opd.findMany.mockResolvedValue([OPD_DINKES]);

    const data = await login(m, { klaim: { opd: 'Dinas Yang Tak Terdaftar' } }, 42);

    expect(data).not.toHaveProperty('opdId');
  });

  it('nama yang cocok ke DUA OPD -> DITOLAK, bukan diterka', async () => {
    // Penjaga terpenting blok ini. Dengan `findFirst`, baris pertama yang
    // kebetulan ditemukan akan dipakai — menautkan orang ke instansi yang bukan
    // tempatnya tanpa satu pun galat.
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });
    m.prisma.opd.findMany.mockResolvedValue([
      { id: 42, nama: 'Dinas Kesehatan' },
      { id: 43, nama: 'DINAS KESEHATAN' },
    ]);

    const data = await login(m, { klaim: { opd: 'Dinas Kesehatan' } }, null);

    expect(data).not.toHaveProperty('opdId');
  });

  it('nama yang MEMUAT nama OPD lain tidak ikut cocok', async () => {
    // "Dinas Kesehatan" dan "Dinas Kesehatan dan Keluarga Berencana" adalah dua
    // instansi berbeda; pencocokan sebagian akan menyamakannya.
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });
    m.prisma.opd.findMany.mockResolvedValue([
      { id: 43, nama: 'Dinas Kesehatan dan Keluarga Berencana' },
    ]);

    const data = await login(m, { klaim: { opd: 'Dinas Kesehatan' } }, null);

    expect(data).not.toHaveProperty('opdId');
  });

  it('sudah sama dengan yang tersimpan -> tak ditulis ulang', async () => {
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });
    m.prisma.opd.findMany.mockResolvedValue([OPD_DINKES]);

    const data = await login(m, { klaim: { opd: 'Dinas Kesehatan' } }, 42);

    expect(data).not.toHaveProperty('opdId');
  });

  it('field klaim di luar konfigurasi TIDAK dibaca sebagai OPD', async () => {
    // Tanpa pembatasan ini, `nama` pengguna dapat menautkannya ke instansi yang
    // kebetulan bernama sama.
    const m = buat({ 'helpdesk.ssoOpdClaim': 'satker' });
    m.prisma.opd.findMany.mockResolvedValue([OPD_DINKES]);

    const data = await login(m, { klaim: { nama: 'Dinas Kesehatan' } }, null);

    expect(data).not.toHaveProperty('opdId');
  });

  it('PERAN tidak ikut disinkronkan — hanya OPD', async () => {
    // Batas yang disepakati: role milik SKEMA, OPD milik Helpdesk.
    const m = buat({ 'helpdesk.ssoOpdClaim': 'opd' });
    m.prisma.opd.findMany.mockResolvedValue([OPD_DINKES]);

    const data = await login(m, { klaim: { opd: 'Dinas Kesehatan' } }, null);

    expect(data).not.toHaveProperty('roles');
  });
});

/**
 * BENTUK KLAIM DICATAT SEKALI PER PROSES (9 September 2026).
 *
 * Tiga pertanyaan tentang SSO Helpdesk menghalangi pekerjaan lain: bentuk nilai
 * `groups` dan `role` (yang menentukan isi `HELPDESK_SSO_OPD_CLAIM`, sampai
 * kini kosong sehingga sinkronisasi OPD mati), dan ada atau tidaknya
 * `email_verified` (yang menentukan apakah penautan akun admin ditolak pada
 * login pertama). Satu payload sungguhan menjawab ketiganya, dan blok ini
 * menjaga bahwa payload itu benar-benar tercatat ketika akhirnya tiba.
 *
 * `Logger.prototype.log` diintip, bukan logger milik instans: `SsoService`
 * membuat loggernya sendiri sebagai medan privat, jadi tak ada jalan
 * menyuntikkan pengganti tanpa mengubah bentuk konstruktornya hanya untuk
 * keperluan pengujian.
 */
describe('SsoService — bentuk klaim dicatat', () => {
  let intip: jest.SpyInstance;

  beforeEach(() => {
    intip = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    intip.mockRestore();
  });

  // Disaring menurut isi pesannya: `SsoService` juga memanggil `logger.log`
  // untuk hal lain (menyelaraskan akun lama, akun baru lahir), dan menghitung
  // seluruh panggilan akan menguji hal yang salah.
  const barisBentuk = () =>
    intip.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('Bentuk klaim Helpdesk'));

  const KLAIM = { sub: 'hd-sub-abc123', groups: ['dinkes'], email_verified: true };

  // `acceptLogin` menulis `lastLoginAt` lewat `prisma.user.update` dan
  // mengembalikan hasilnya, jadi `update` HARUS ikut dipalsukan. Tanpa itu
  // `provision` mengembalikan undefined dan yang meledak justru pencatatan
  // audit, bukan hal yang sedang diuji.
  const siapkanLoginSukses = (prisma: Mocked['prisma']) => {
    prisma.user.findFirst.mockResolvedValue(userRow());
    prisma.user.update.mockResolvedValue(userRow());
  };

  it('mencatat bentuknya, bukan isinya', async () => {
    const { service, prisma, source } = buat();
    source.exchangeCodeForProfile.mockResolvedValue(profil({ klaim: KLAIM }));
    siapkanLoginSukses(prisma);

    await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');

    expect(barisBentuk()).toHaveLength(1);
    const baris = barisBentuk()[0];
    expect(baris).toContain('groups=array[1] of string(6)');
    expect(baris).toContain('email_verified=boolean(true)');
    // Nilainya TIDAK ikut. Penjaganya ada di sso-claim-shape.spec.ts; di sini
    // yang dijaga adalah bahwa jalur nyatanya memakai fungsi itu, bukan
    // merangkai pesannya sendiri.
    expect(baris).not.toContain('dinkes');
    expect(baris).not.toContain('hd-sub-abc123');
  });

  it('TIDAK berulang pada login berikutnya', async () => {
    const { service, prisma, source } = buat();
    source.exchangeCodeForProfile.mockResolvedValue(profil({ klaim: KLAIM }));
    siapkanLoginSukses(prisma);

    await service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc');
    await service.completeLogin('kode-2', 'nonce-1', 'sso_state=abc');
    await service.completeLogin('kode-3', 'nonce-1', 'sso_state=abc');

    expect(barisBentuk()).toHaveLength(1);
  });

  it('TETAP tercatat walau login berakhir ditolak 403', async () => {
    // INI alasan utama pemanggilannya diletakkan sebelum `provision`. Login
    // pertama seorang admin yang akunnya sudah dibuat lebih dahulu justru
    // berakhir 403 pada penjaga penautan `email_verified`, dan payload login
    // itulah yang paling ingin diketahui bentuknya. Dicatat sesudah
    // `provision` berarti tak pernah tercatat pada kasus yang diselidiki.
    const { service, prisma, source } = buat();
    source.exchangeCodeForProfile.mockResolvedValue(profil({ klaim: KLAIM, emailVerified: false }));
    prisma.user.findFirst
      .mockResolvedValueOnce(null) // pencarian by sub
      .mockResolvedValueOnce(userRow({ id: 1, ssoSubject: 'seed-superuser' })); // by email

    await expect(service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc')).rejects.toThrow(
      ForbiddenException,
    );

    expect(barisBentuk()).toHaveLength(1);
  });

  it('payload yang meledak saat dibaca tidak menggagalkan login', async () => {
    // Alat bantu diagnosis tak boleh menjadi sebab orang gagal masuk.
    const klaimJahat = {};
    Object.defineProperty(klaimJahat, 'sub', {
      enumerable: true,
      get() {
        throw new Error('properti ini meledak');
      },
    });
    const { service, prisma, source } = buat();
    source.exchangeCodeForProfile.mockResolvedValue(profil({ klaim: klaimJahat }));
    siapkanLoginSukses(prisma);

    await expect(
      service.completeLogin('kode-1', 'nonce-1', 'sso_state=abc'),
    ).resolves.toMatchObject({ token: 'token-sesi-skm' });
  });
});
