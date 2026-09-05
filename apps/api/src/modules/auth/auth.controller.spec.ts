import { HttpStatus } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import type { AuditService } from '../audit/audit.service';
import type { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import type { ConsentService } from './consent.service';
import type { SessionCookieService } from './session/session-cookie.service';
import type { SsoService } from './sso.service';

/**
 * Penyambungan controller SSO — bagian yang TAK BISA diverifikasi dengan curl
 * tanpa `client_id` sungguhan dari Helpdesk: jalur BERHASIL pada callback.
 *
 * Yang diuji di sini memang cuma komposisinya (header apa yang dipasang, ke mana
 * dialihkan), bukan logika di dalam service — masing-masing sudah punya spec
 * sendiri. Justru komposisi inilah yang mudah salah dan diam-diam berakibat
 * besar: satu `setHeader` yang menimpa yang lain berarti sesi tak pernah
 * tersimpan sementara pengalihannya tampak sukses.
 */
function buat() {
  const authService = { logout: jest.fn(() => ({ success: true as const })) };
  const ssoService = {
    beginLogin: jest.fn(),
    completeLogin: jest.fn(),
    buildSuccessRedirect: jest.fn((exp: number) => `http://web/sso/callback#expires=${exp}`),
    buildFailureRedirect: jest.fn((msg: string) => `http://web/sso/callback#error=${msg}`),
    clearStateCookie: jest.fn(() => 'sso_state=; Max-Age=0'),
  };
  const sessionCookie = {
    build: jest.fn((token: string) => `session=${token}; HttpOnly`),
    clear: jest.fn(() => 'session=; Max-Age=0'),
    expiresAt: jest.fn(() => 1_756_000_000),
  };
  const res = { setHeader: jest.fn(), redirect: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const consent = { record: jest.fn().mockResolvedValue(new Date()) };

  return {
    controller: new AuthController(
      authService as unknown as AuthService,
      ssoService as unknown as SsoService,
      sessionCookie as unknown as SessionCookieService,
      audit as unknown as AuditService,
      consent as unknown as ConsentService,
    ),
    authService,
    ssoService,
    sessionCookie,
    audit,
    consent,
    res: res as unknown as Response & typeof res,
  };
}

const req = (cookie?: string) => ({ headers: { cookie } }) as unknown as Request;

describe('AuthController — penyambungan SSO', () => {
  describe('GET /auth/sso/login', () => {
    it('memasang cookie state lalu mengalihkan ke Helpdesk', async () => {
      const { controller, ssoService, res } = buat();
      ssoService.beginLogin.mockResolvedValue({
        redirectUrl: 'https://helpdesk/authorize?state=abc',
        setCookie: 'sso_state=ttd; HttpOnly',
      });

      await controller.ssoLogin(res);

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', 'sso_state=ttd; HttpOnly');
      expect(res.redirect).toHaveBeenCalledWith(
        HttpStatus.FOUND,
        'https://helpdesk/authorize?state=abc',
      );
    });

    it('beginLogin melempar: TETAP redirect ke frontend, bukan galat mentah', async () => {
      const { controller, ssoService, res } = buat();
      ssoService.beginLogin.mockRejectedValue(
        new Error(
          'SSO Helpdesk belum dikonfigurasi. Kunci yang masih kosong: helpdesk.ssoClientId',
        ),
      );

      await controller.ssoLogin(res);

      // Alasannya sama persis dengan callback: yang membuka alamat ini adalah
      // PERAMBAN (tombol "Masuk via SSO Helpdesk" memakai navigasi tingkat
      // atas, bukan axios), jadi melempar 503 berarti pengguna menatap JSON
      // mentah di tab kosong. Terjadi sungguhan: sampai 28 Agu 2026 tombol
      // utama aplikasi ini menampilkan `{"success":false,...}` kepada pengguna.
      expect(res.redirect).toHaveBeenCalledWith(
        HttpStatus.FOUND,
        'http://web/sso/callback#error=SSO Helpdesk belum dikonfigurasi. Kunci yang masih kosong: helpdesk.ssoClientId',
      );
    });

    it('beginLogin melempar: TIDAK memasang cookie state apa pun', async () => {
      const { controller, ssoService, res } = buat();
      ssoService.beginLogin.mockRejectedValue(new Error('gagal menghubungi Helpdesk'));

      await controller.ssoLogin(res);

      // Cookie state hanya boleh ada bila alur masuk benar-benar dimulai.
      // Memasangnya pada percobaan yang gagal berarti callback berikutnya
      // memverifikasi state yang tak pernah dipakai Helpdesk.
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('kegagalan TIDAK membuang cookie state yang sedang dipakai tab lain', async () => {
      const { controller, ssoService, res } = buat();
      ssoService.beginLogin.mockRejectedValue(new Error('gagal menghubungi Helpdesk'));

      await controller.ssoLogin(res);

      // Beda dari callback, yang MEMANG harus membuangnya (state di sana sudah
      // sekali pakai). Di sini membuangnya akan mematikan percobaan masuk yang
      // sedang berjalan di tab lain — pengguna yang sudah berada di halaman
      // Helpdesk kembali ke callback dengan cookie yang sudah hilang.
      expect(ssoService.clearStateCookie).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/sso/callback — berhasil', () => {
    it('memasang cookie session DAN membuang cookie state dalam SATU header', async () => {
      const { controller, ssoService, res } = buat();
      ssoService.completeLogin.mockResolvedValue({
        token: 'jwt.sesi.baru',
        clearCookie: 'sso_state=; Max-Age=0',
      });

      await controller.ssoCallback({}, req('sso_state=ttd'), res);

      // Array, bukan dua panggilan setHeader berurutan: panggilan kedua akan
      // MENIMPA yang pertama, dan sesinya tak akan pernah tersimpan.
      expect(res.setHeader).toHaveBeenCalledTimes(1);
      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        'sso_state=; Max-Age=0',
        'session=jwt.sesi.baru; HttpOnly',
      ]);
    });

    it('alamat pengalihan TIDAK memuat token', async () => {
      const { controller, ssoService, res } = buat();
      ssoService.completeLogin.mockResolvedValue({
        token: 'jwt.sesi.baru',
        clearCookie: 'sso_state=; Max-Age=0',
      });

      await controller.ssoCallback({}, req(), res);

      const [, url] = (res.redirect as jest.Mock).mock.calls[0];
      expect(url).toBe('http://web/sso/callback#expires=1756000000');
      expect(url).not.toContain('jwt.sesi.baru');
    });

    it('cookie mentah dari request diteruskan ke completeLogin (untuk cek state)', async () => {
      const { controller, ssoService, res } = buat();
      ssoService.completeLogin.mockResolvedValue({ token: 't', clearCookie: 'c' });

      await controller.ssoCallback({ code: 'kode-1', state: 'nonce-1' }, req('sso_state=ttd'), res);

      expect(ssoService.completeLogin).toHaveBeenCalledWith('kode-1', 'nonce-1', 'sso_state=ttd');
    });
  });

  describe('GET /auth/sso/callback — gagal', () => {
    it('galat dari Helpdesk: dialihkan tanpa menyentuh penukaran code', async () => {
      const { controller, ssoService, sessionCookie, res } = buat();

      await controller.ssoCallback(
        { error: 'access_denied', error_description: 'Pengguna membatalkan' },
        req(),
        res,
      );

      expect(ssoService.completeLogin).not.toHaveBeenCalled();
      expect(sessionCookie.build).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        HttpStatus.FOUND,
        'http://web/sso/callback#error=Pengguna membatalkan',
      );
    });

    it('completeLogin melempar: TETAP redirect (bukan galat mentah) & cookie state dibuang', async () => {
      const { controller, ssoService, sessionCookie, res } = buat();
      ssoService.completeLogin.mockRejectedValue(new Error('Akun tidak aktif'));

      await controller.ssoCallback({ code: 'kode-1', state: 'nonce-1' }, req(), res);

      // Yang membuka alamat ini adalah peramban warga, bukan kode — 400 mentah
      // berarti ia menatap JSON galat di tab kosong.
      expect(res.redirect).toHaveBeenCalledWith(
        HttpStatus.FOUND,
        'http://web/sso/callback#error=Akun tidak aktif',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', 'sso_state=; Max-Age=0');
      // Tak ada sesi yang diterbitkan atas login yang gagal.
      expect(sessionCookie.build).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/consent', () => {
    it('meneruskan pengguna aktif ke ConsentService & mengembalikan waktunya', async () => {
      const { controller, consent } = buat();
      const waktu = new Date('2026-08-27T03:00:00Z');
      (consent.record as jest.Mock).mockResolvedValue(waktu);

      const hasil = await controller.consent({
        userId: 9,
        roles: [Role.responden],
        actingRole: Role.responden,
        opdId: null,
      });

      expect(consent.record).toHaveBeenCalledWith({
        userId: 9,
        roles: [Role.responden],
        actingRole: Role.responden,
        opdId: null,
      });
      expect(hasil).toEqual({ consentAt: waktu.toISOString() });
    });
  });

  describe('POST /auth/logout', () => {
    const aktor = { userId: 12, roles: [Role.responden], actingRole: Role.responden, opdId: null };

    it('membuang cookie session DAN tetap mengembalikan badan JSON', async () => {
      const { controller, authService, res } = buat();

      const hasil = await controller.logout(aktor, res);

      // Sejak sesi SSO memakai cookie HttpOnly, hanya server yang dapat
      // menghapusnya — frontend tak lagi mampu melakukannya sendiri.
      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', 'session=; Max-Age=0');
      expect(hasil).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalled();
    });

    it('mencatat aksi logout atas nama pengguna yang keluar', async () => {
      const { controller, audit, res } = buat();

      await controller.logout(aktor, res);

      expect(audit.record).toHaveBeenCalledWith(12, 'logout', 'auth', {});
    });
  });
});
