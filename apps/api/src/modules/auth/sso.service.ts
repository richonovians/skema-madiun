import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SSO_SOURCE } from './auth.constants';
import { SsoProfile, SsoSource } from './interfaces/sso-source.interface';
import { SessionService } from './session/session.service';
import { parseClaimValues, parseRoleMap, resolveRoleFromClaims } from './sso-role.mapper';
import { SsoStateService } from './sso-state.service';

/** Batas kolom `users.nama` (VarChar(50)) & `users.email` (VarChar(100)). */
const NAMA_MAX = 50;
const EMAIL_MAX = 100;

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sessionService: SessionService,
    private readonly stateService: SsoStateService,
    private readonly audit: AuditService,
    @Inject(SSO_SOURCE) private readonly ssoSource: SsoSource,
  ) {}

  /** Langkah 1: alihkan pengguna ke halaman login Helpdesk. */
  async beginLogin(): Promise<{ redirectUrl: string; setCookie: string }> {
    this.assertConfigured();
    const { state, setCookie } = this.stateService.issue();
    const redirectUrl = await this.ssoSource.buildAuthorizeUrl(state);
    return { redirectUrl, setCookie };
  }

  /**
   * Langkah 2: Helpdesk mengembalikan pengguna ke sini dengan `?code=&state=`.
   * @returns token sesi SKM + header untuk membuang cookie state.
   */
  async completeLogin(
    code: string | undefined,
    state: string | undefined,
    cookieHeader: string | undefined,
  ): Promise<{ token: string; clearCookie: string }> {
    this.assertConfigured();

    // `state` diperiksa SEBELUM `code` dipakai. Menukar `code` lebih dulu berarti
    // menghubungi Helpdesk atas permintaan yang belum terbukti berasal dari alur
    // login kita sendiri.
    if (!this.stateService.verify(state, cookieHeader)) {
      throw new BadRequestException(
        'Parameter state tidak sah atau kedaluwarsa. Silakan ulangi proses masuk.',
      );
    }
    if (!code) {
      throw new BadRequestException('Callback SSO tanpa parameter code');
    }

    const profile = await this.ssoSource.exchangeCodeForProfile(code);
    const user = await this.provision(profile);

    // `sub` ikut dicatat karena itulah satu-satunya identitas yang dapat
    // dipadankan dengan log di sisi Helpdesk saat menelusuri satu kejadian.
    await this.audit.record(user.id, 'login', 'auth', { via: 'sso', sub: profile.sub });

    return {
      token: this.sessionService.issue(user.id),
      clearCookie: this.stateService.clearCookie(),
    };
  }

  /**
   * Cocokkan profil SSO ke baris `users`, atau buat bila benar-benar baru.
   *
   * URUTANNYA PENTING, dan langkah 2 bukan kemewahan melainkan keharusan:
   * `users.sso_subject` yang ada sekarang masih berisi nilai PENAMPUNG dari masa
   * sebelum SSO (`seed-superuser`, `pending:opd@gmail.com`, dan sejenisnya). Tak
   * satu pun akan cocok dengan `sub` asli Helpdesk. Tanpa pencocokan lewat email,
   * SETIAP akun lama — termasuk Admin Kabupaten — akan dibuatkan akun baru
   * berperan `responden`, sementara akun lamanya beserta seluruh riwayat
   * pengaduan & surveinya menjadi yatim.
   *
   *   1. `sso_subject == sub`  → pengguna yang sudah pernah masuk lewat SSO.
   *   2. `email == email`      → akun lama; `sso_subject` DINAIKKAN ke `sub` asli.
   *                              Hanya terjadi sekali per akun.
   *   3. tak ada keduanya      → pengguna baru, peran `responden`.
   */
  private async provision(profile: SsoProfile): Promise<User> {
    this.logClaimShape(profile);

    const bySub = await this.prisma.user.findFirst({
      where: { ssoSubject: profile.sub, deletedAt: null },
    });
    if (bySub) {
      return this.acceptLogin(bySub, profile);
    }

    const email = normalizeEmail(profile.email);

    if (email) {
      const byEmail = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
      if (byEmail) {
        this.logger.log(
          `Menyelaraskan akun lama id=${byEmail.id} — sso_subject "${byEmail.ssoSubject}" dinaikkan ke sub Helpdesk`,
        );
        const upgraded = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { ssoSubject: profile.sub },
        });
        return this.acceptLogin(upgraded, profile);
      }

      // Akun ber-email sama yang sudah di-soft-delete menghalangi pembuatan baru
      // (`users.email` unik, dan soft delete TIDAK melepas keunikan itu).
      // Ditolak dengan pesan jelas alih-alih dibiarkan meledak sebagai P2002.
      const deleted = await this.prisma.user.findFirst({
        where: { email, deletedAt: { not: null } },
        select: { id: true },
      });
      if (deleted) {
        throw new ForbiddenException(
          'Akun dengan email ini pernah dihapus. Hubungi Admin Kabupaten untuk mengaktifkannya kembali.',
        );
      }
    }

    if (!email) {
      // `users.email` NOT NULL & unik — tanpa email tak ada baris yang bisa dibuat.
      throw new ServiceUnavailableException(
        'Profil SSO Helpdesk tidak menyertakan email, sehingga akun tidak dapat dibuat.',
      );
    }

    // Peran & OPD ditentukan dari klaim HANYA di sini, yaitu saat akun dibuat.
    // Lihat resolveRoleAndOpd() untuk aturannya dan alasan ia tak pernah
    // berjalan pada akun yang sudah ada.
    const { role, opdId } = await this.resolveRoleAndOpd(profile);

    const created = await this.prisma.user.create({
      data: {
        ssoSubject: profile.sub,
        email,
        nama: truncate(profile.nama ?? email, NAMA_MAX),
        role,
        ...(opdId === null ? {} : { opdId }),
        lastLoginAt: new Date(),
        // `consentAt` SENGAJA dibiarkan null. Kolom itu catatan persetujuan UU
        // PDP; mengisinya otomatis berarti mencatat persetujuan yang belum
        // pernah diberikan pengguna. Pengisiannya milik langkah persetujuan di
        // antarmuka, bukan efek samping login.
      },
    });
    this.logger.log(
      `Pengguna baru dari SSO: id=${created.id} email=${created.email} peran=${created.role}` +
        (created.opdId === null ? '' : ` opdId=${created.opdId}`),
    );
    return created;
  }

  /**
   * Peran & OPD untuk akun BARU, diturunkan dari klaim Helpdesk.
   *
   * BERLAKU HANYA SAAT PEMBUATAN AKUN. Menyinkronkan peran pada setiap login
   * pernah dipertimbangkan dan ditolak (keputusan 27 Agu 2026): bila Helpdesk
   * suatu saat tak mengirim klaim — konfigurasi berubah, scope `profile` dicabut,
   * atau bentuk klaimnya bergeser — setiap Admin Kabupaten akan diturunkan jadi
   * warga pada login berikutnya, dan kegagalan itu SENYAP. Karena itu SSO di
   * sini hanya bisa menetapkan, tak pernah menurunkan.
   *
   * Tanpa `HELPDESK_SSO_ROLE_MAP` hasilnya selalu `responden` — persis perilaku
   * sebelum pemetaan ini ada.
   */
  private async resolveRoleAndOpd(
    profile: SsoProfile,
  ): Promise<{ role: Role; opdId: number | null }> {
    const values = parseClaimValues(profile.groups, profile.role);
    const resolved = resolveRoleFromClaims(
      values,
      parseRoleMap(this.config.get<string>('helpdesk.ssoRoleMap')),
    );

    if (resolved === null || resolved === Role.responden) {
      return { role: Role.responden, opdId: null };
    }
    if (resolved !== Role.opd) {
      // `kabupaten`. Tak tertaut OPD mana pun -- sama seperti akun seed-nya.
      return { role: resolved, opdId: null };
    }

    const opd = await this.findOpdFromClaims(values);
    if (!opd) {
      // Peran `opd` TANPA opdId adalah keadaan setengah jadi: dashboard OPD-nya
      // pasti gagal karena DashboardService.resolveDashboardOpdId menuntut
      // opdId terisi. Lebih baik jadi warga biasa yang berfungsi penuh, dan
      // biarkan Admin Kabupaten menautkannya lewat Manajemen User.
      this.logger.warn(
        `Klaim menunjuk peran OPD tapi tak ada OPD aktif yang cocok (nilai: ${values.join(', ') || '-'}) — akun dibuat sebagai responden`,
      );
      return { role: Role.responden, opdId: null };
    }
    return { role: Role.opd, opdId: opd.id };
  }

  /**
   * Cari OPD dari nilai klaim, dicocokkan ke `externalId` (UUID tenant Helpdesk)
   * ATAU `kode`. Keduanya diperiksa karena tak diketahui mana yang dibawa klaim.
   *
   * `mode: 'insensitive'` BUKAN kehati-hatian berlebihan: `parseClaimValues`
   * mengubah semuanya ke huruf kecil, sementara `opd.kode` tersimpan huruf besar
   * ("DINKES", "DISKOMINFO"). Tanpa ini pencocokan lewat kode tak akan pernah
   * berhasil, dan setiap Admin OPD diam-diam jatuh menjadi warga.
   */
  private async findOpdFromClaims(values: string[]): Promise<{ id: number } | null> {
    if (values.length === 0) {
      return null;
    }
    return this.prisma.opd.findFirst({
      where: {
        isActive: true,
        OR: values.flatMap((value) => [
          { externalId: { equals: value, mode: 'insensitive' as const } },
          { kode: { equals: value, mode: 'insensitive' as const } },
        ]),
      },
      select: { id: true },
    });
  }

  /** Tolak akun nonaktif, lalu segarkan nama & waktu login. */
  private async acceptLogin(user: User, profile: SsoProfile): Promise<User> {
    if (!user.isActive) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    const nama = profile.nama ? truncate(profile.nama, NAMA_MAX) : null;
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        // Nama disegarkan dari Helpdesk (sumbernya di sana), tapi EMAIL TIDAK.
        // Alasannya: `users.email` unik, sehingga menyalin email baru bisa
        // bertabrakan dengan akun lain dan menggagalkan login karena hal yang
        // tak ada urusannya dengan si pengguna. Perubahan email ditangani
        // terpisah bila kelak dibutuhkan.
        ...(nama ? { nama } : {}),
      },
    });
  }

  /**
   * Alamat frontend tujuan setelah login berhasil.
   *
   * PENYERAHAN TOKEN — keputusan ini SUDAH DIAMBIL (2026-08-27): token diserahkan
   * sebagai cookie `session` HttpOnly (lihat SessionCookieService), BUKAN
   * dititipkan pada fragment URL seperti rancangan pertama. Alasannya di sana;
   * yang penting di sini adalah akibatnya bagi alamat ini: **tak ada token sama
   * sekali di dalam URL**.
   *
   * Yang ikut hanya `#expires=` (detik epoch). Itu bukan rahasia — hanya sebuah
   * waktu, tak memberi kemampuan apa pun kepada yang membacanya — dan frontend
   * membutuhkannya karena kini tak bisa lagi mengetahuinya sendiri: dulu ia
   * mendekode klaim `exp` dari token di localStorage, dan token itu sekarang
   * HttpOnly. Tanpa nilai ini antarmuka akan menampilkan keadaan "sudah masuk"
   * sampai panggilan API pertama gagal 401 — tepat keluhan yang pernah dilaporkan
   * (18 Agu 2026: "baru akses localhost sudah terlihat login padahal belum").
   *
   * Fragment, bukan query: bagian setelah `#` tidak dikirim ke server dan tidak
   * masuk log akses mana pun.
   */
  buildSuccessRedirect(expiresAt: number): string {
    return `${this.webBase()}/sso/callback#expires=${expiresAt}`;
  }

  /**
   * Header pembuang cookie state, untuk jalur GAGAL di controller. Cookie ini
   * sekali pakai; membiarkannya hidup setelah kegagalan berarti percobaan
   * berikutnya membawa state basi dan gagal lagi tanpa sebab yang jelas.
   */
  clearStateCookie(): string {
    return this.stateService.clearCookie();
  }

  /** Alamat frontend saat login gagal — pesannya ditampilkan sebagai galat. */
  buildFailureRedirect(message: string): string {
    return `${this.webBase()}/sso/callback#error=${encodeURIComponent(message)}`;
  }

  /** Akar alamat frontend, tanpa garis miring di akhir. */
  private webBase(): string {
    const base = this.config.get<string>('app.webUrl') ?? 'http://localhost:3000';
    return base.replace(/\/+$/, '');
  }

  /**
   * Keempat kunci harus ada bersama-sama. Validasi env sengaja memperlakukannya
   * sebagai opsional satu per satu (agar aplikasi tetap boot tanpa kredensial
   * Helpdesk), jadi aturan "semua atau tak satu pun" ditegakkan di sini —
   * dengan 503 yang menyebutkan kunci mana yang kosong, bukan gagal samar.
   */
  private assertConfigured(): void {
    const kosong = (
      [
        'helpdesk.ssoIssuer',
        'helpdesk.ssoClientId',
        'helpdesk.ssoClientSecret',
        'helpdesk.ssoRedirectUri',
      ] as const
    ).filter((key) => !this.config.get<string>(key));

    if (kosong.length > 0) {
      throw new ServiceUnavailableException(
        `SSO Helpdesk belum dikonfigurasi. Kunci yang masih kosong: ${kosong.join(', ')}`,
      );
    }
  }

  /**
   * Catat BENTUK klaim `groups` & `role`, bukan sekadar mengabaikannya.
   *
   * Bentuk nilainya adalah pertanyaan terbuka ke Helpdesk (butir 04 pada dokumen
   * permintaan). Satu login sungguhan sudah cukup menjawabnya dari log ini, jadi
   * pertanyaannya tak perlu menunggu balasan surat. Level `debug` supaya tak
   * membanjiri log produksi.
   */
  private logClaimShape(profile: SsoProfile): void {
    if (profile.groups === undefined && profile.role === undefined) {
      this.logger.debug('Profil SSO tidak menyertakan klaim `groups` maupun `role`');
      return;
    }
    this.logger.debug(
      `Bentuk klaim SSO — groups: ${describe(profile.groups)}, role: ${describe(profile.role)}`,
    );
  }
}

function normalizeEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }
  const trimmed = email.trim().toLowerCase();
  // Email melebihi batas kolom TIDAK dipotong: memotong email menghasilkan alamat
  // yang salah dan bisa bertabrakan dengan akun lain. Lebih baik ditolak.
  if (!trimmed || trimmed.length > EMAIL_MAX) {
    return null;
  }
  return trimmed;
}

/** Nama Helpdesk bisa melebihi 50 karakter (nama OPD gabungan sudah terbukti begitu). */
function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function describe(value: unknown): string {
  if (value === undefined) return 'tidak ada';
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `array(${value.length}) contoh=${JSON.stringify(value.slice(0, 2))}`;
  }
  if (typeof value === 'object') {
    return `object keys=${JSON.stringify(Object.keys(value as object).slice(0, 8))}`;
  }
  return `${typeof value} ${JSON.stringify(value)}`;
}
