import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JenisKelamin, JenisPengguna, Role, User } from '@prisma/client';
import { enkripsiKolom } from '../../common/crypto/kolom';
import { kunciData } from '../../common/crypto/kunci';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SSO_SOURCE } from './auth.constants';
import { SsoProfile, SsoSource } from './interfaces/sso-source.interface';
import { readCookie } from './session/cookie.util';
import { SESSION_COOKIE } from './session/session-cookie.service';
import { PenerbitSesi } from './session/penerbit-sesi.service';
import type { PerangkatSesi } from './session/penyimpan-sesi.interface';
import { SessionService } from './session/session.service';
import { ambilJalurKlaim } from './sso-claim-path';
import { bentukKlaim } from './sso-claim-shape';
import { ambilIdentitasKlaim } from './sso-identitas.mapper';
import { petakanJenisKelamin } from './sso-jenis-kelamin.mapper';
import { petakanJenisPengguna } from './sso-jenis-pengguna.mapper';
import { extractOpdClaimValues, normalkanNamaOpd, parseOpdClaimFields } from './sso-opd.mapper';
import {
  extractRoleClaimValues,
  parseRoleClaimFields,
  parseRolePackages,
  resolveRolesFromClaims,
} from './sso-role.mapper';
import { peranSetelahSinkron } from './sinkron-peran-opd';
import { SsoStateService } from './sso-state.service';

/** Batas kolom `users.nama` (VarChar(50)) & `users.email` (VarChar(100)). */
const NAMA_MAX = 50;
const EMAIL_MAX = 100;

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  /**
   * Penanda bahwa bentuk klaim sudah dicatat pada proses ini (9 September
   * 2026). Lihat `catatBentukKlaimSekali`.
   *
   * Medan INSTANS, bukan modul: SsoService memang singleton di Nest, jadi
   * keduanya berperilaku sama saat berjalan. Bedanya di pengujian, tempat tiap
   * uji membuat instans baru; penanda tingkat modul akan membuat uji kedua
   * bergantung pada uji pertama yang pernah berjalan lebih dahulu.
   */
  private bentukKlaimSudahDicatat = false;

  /** Kunci enkripsi kolom identitas. Lihat `identitasUntukDisimpan`. */
  private readonly kunci: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sessionService: SessionService,
    private readonly penerbitSesi: PenerbitSesi,
    private readonly stateService: SsoStateService,
    private readonly audit: AuditService,
    @Inject(SSO_SOURCE) private readonly ssoSource: SsoSource,
  ) {
    // Dibaca SEKALI saat konstruksi, sama seperti ComplaintsService. Kalau
    // kuncinya belum disetel, kegagalannya muncul saat aplikasi menyala --
    // bukan saat seseorang sedang login dan tak punya cara memperbaikinya.
    this.kunci = kunciData(config);
  }

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
    perangkat?: PerangkatSesi,
  ): Promise<{ token: string; clearCookie: string }> {
    this.assertConfigured();

    // `state` diperiksa SEBELUM `code` dipakai. Menukar `code` lebih dulu berarti
    // menghubungi Helpdesk atas permintaan yang belum terbukti berasal dari alur
    // login kita sendiri.
    if (!this.stateService.verify(state, cookieHeader)) {
      const sesiBerjalan = this.sesiMasihSah(cookieHeader);
      if (sesiBerjalan) {
        // CALLBACK DUPLIKAT YANG TERLAMBAT (28 September 2026), terukur di log
        // akses, bukan dibayangkan: alamat `authorize` Helpdesk sempat
        // dihubungi DUA KALI untuk satu percobaan masuk, sehingga dua `code`
        // berbeda kembali dengan `state` yang sama. Yang pertama berhasil dan
        // membuang cookie `state` sebagaimana mestinya; yang kedua karena itu
        // pasti ditolak di sini.
        //
        // Penolakan itu tidak berhenti di layar galat. `AuthCallbackLoader`
        // pada cabang galat memanggil `clearSession()`, yang menembakkan
        // `POST /auth/logout` -- sesi yang BARU SAJA berhasil ikut dibuang.
        // Pengguna benar-benar sudah masuk, lalu dikeluarkan lagi oleh
        // penanganan galatnya sendiri.
        //
        // PENJAGA CSRF TIDAK DILEMAHKAN. Syaratnya bukan "state boleh dipakai
        // ulang", melainkan "permintaan ini membawa cookie sesi yang MASIH
        // SAH". Pemiliknya tak memperoleh apa pun yang belum dipegangnya, tak
        // ada sesi baru diterbitkan, dan `code` tetap tak pernah ditukar.
        this.logger.warn(
          'Callback SSO ber-state basi, tetapi permintaannya membawa sesi yang masih sah — ' +
            'diperlakukan sebagai callback duplikat, bukan kegagalan.',
        );
        return { token: sesiBerjalan, clearCookie: this.stateService.clearCookie() };
      }
      throw new BadRequestException(
        'Parameter state tidak sah atau kedaluwarsa. Silakan ulangi proses masuk.',
      );
    }
    if (!code) {
      throw new BadRequestException('Callback SSO tanpa parameter code');
    }

    const profile = await this.ssoSource.exchangeCodeForProfile(code);
    // SEBELUM `provision`, dan urutannya inti dari gunanya: `provision` dapat
    // melempar 403 pada login pertama seorang admin (penjaga penautan
    // `email_verified`), dan justru login itulah yang bentuk klaimnya paling
    // ingin diketahui. Dicatat sesudahnya berarti tak pernah tercatat.
    this.catatBentukKlaimSekali(profile);
    const user = await this.provision(profile);

    // `sub` ikut dicatat karena itulah satu-satunya identitas yang dapat
    // dipadankan dengan log di sisi Helpdesk saat menelusuri satu kejadian.
    await this.audit.record(user.id, 'login', 'auth', { via: 'sso', sub: profile.sub });

    return {
      token: await this.penerbitSesi.terbitkan(user.id, undefined, perangkat),
      clearCookie: this.stateService.clearCookie(),
    };
  }

  /**
   * Catat BENTUK payload klaim Helpdesk sekali per proses (9 September 2026).
   *
   * MENGAPA PERLU, padahal `opdIdDariKlaim` sudah mencatat nama klaim.
   * Pencatatan itu punya empat batas yang justru mengenai kasus yang sedang
   * diselidiki: ia hanya berjalan pada jalur sinkronisasi (akun yang sudah
   * dikenal lewat `sub`), sehingga bungkam pada login pertama; ia mencatat NAMA
   * klaim tanpa bentuk nilainya, padahal yang menghalangi pengisian
   * `HELPDESK_SSO_OPD_CLAIM` adalah pertanyaan apakah `groups` berisi string
   * atau objek; ia tak pernah menyebut ada atau tidaknya `email_verified`; dan
   * ia di tingkat `debug`.
   *
   * SEKALI PER PROSES, bukan setiap login: yang dicari struktur, dan struktur
   * tidak berubah antar login. Mencatatnya berulang hanya membanjiri log dengan
   * baris yang sama. Restart mempersenjatainya kembali, dan itu disengaja,
   * sebab login pertama sesudah tiap deploy pantas mencatat bentuk terbarunya.
   *
   * TINGKAT `log`, bukan `debug`: ia harus benar-benar terbaca tanpa menyetel
   * apa pun lebih dahulu. Karena hanya sekali per proses, ia tak memboroskan
   * apa-apa.
   *
   * TANPA NILAI. Lihat sso-claim-shape.ts untuk apa saja yang boleh keluar dan
   * apa yang tidak.
   */
  private catatBentukKlaimSekali(profile: SsoProfile): void {
    if (this.bentukKlaimSudahDicatat) {
      return;
    }
    this.bentukKlaimSudahDicatat = true;
    try {
      this.logger.log(`Bentuk klaim Helpdesk (sekali per proses): ${bentukKlaim(profile.klaim)}`);
    } catch (err) {
      // Alat bantu diagnosis TIDAK BOLEH menjadi sebab orang gagal masuk.
      // Payload dari jaringan dapat berbentuk apa pun, termasuk objek yang
      // pengaksesan propertinya sendiri melempar.
      this.logger.warn(`Gagal mencatat bentuk klaim: ${(err as Error)?.message ?? err}`);
    }
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
        // TEMUAN AUDIT T5 (7 September 2026). Ini SATU-SATUNYA tempat sebuah
        // klaim SSO membuat pemegangnya MEWARISI peran akun yang sudah ada.
        // Sebelum penjaga ini, klaim `email` dipercaya tanpa syarat: siapa pun
        // yang dapat membuat akun Helpdesk ber-email `superuser@...` akan
        // ditautkan ke akun superuser SKEMA beserta seluruh haknya.
        //
        // Gagal TERTUTUP, termasuk saat klaimnya hilang: "tak ada bukti
        // terverifikasi" bukan berarti "terverifikasi" (pola yang sama dipakai
        // ConsentService.assertConsented). Pemeriksaannya di SINI, bukan di awal
        // fungsi — pencocokan lewat `sub` tak melibatkan email sama sekali, dan
        // memeriksanya lebih awal akan memutus login setiap pengguna yang sudah
        // dikenal.
        const bolehTanpaVerifikasi = this.config.get<boolean>(
          'helpdesk.ssoAllowUnverifiedEmailLink',
        );
        // `false` ditolak walau sakelarnya hidup: penyedia sudah menyatakan
        // tidak, dan tak ada tafsir lain untuk pernyataan itu.
        const lolos =
          profile.emailVerified === true ||
          (profile.emailVerified === null && bolehTanpaVerifikasi === true);
        if (!lolos) {
          this.logger.warn(
            `Penautan akun id=${byEmail.id} DITOLAK — email_verified=${String(profile.emailVerified)}`,
          );
          throw new ForbiddenException(
            'Alamat email pada akun Helpdesk Anda belum terverifikasi, sehingga tidak dapat ' +
              'ditautkan ke akun SKEMA yang sudah ada. Hubungi Admin Kabupaten.',
          );
        }

        // NILAI `sso_subject` sengaja tidak ikut dicetak (22 September 2026):
        // ia pengenal identitas seseorang, dan `id` sudah cukup untuk menelusuri
        // barisnya di `users` bila memang perlu dilihat.
        this.logger.log(
          `Menyelaraskan akun lama id=${byEmail.id} — sso_subject dinaikkan ke sub Helpdesk`,
        );
        const upgraded = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { ssoSubject: profile.sub },
        });

        // Penautan adalah peristiwa PEMBAWA HAK — ia harus meninggalkan jejak
        // yang dapat diperiksa, bukan hanya baris log yang ikut hilang bersama
        // rotasi log. Aksinya dibedakan supaya pemakaian sakelar darurat dapat
        // dicari sendiri di audit.
        await this.audit.record(
          upgraded.id,
          profile.emailVerified === true ? 'sso_link_email' : 'sso_link_email_unverified',
          'auth',
          {
            sub: profile.sub,
            ssoSubjectLama: byEmail.ssoSubject,
            emailVerified: profile.emailVerified,
            roles: byEmail.roles,
          },
        );

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
    // Lihat resolveRolesAndOpd() untuk aturannya dan alasan ia tak pernah
    // berjalan pada akun yang sudah ada.
    const { roles, opdId } = await this.resolveRolesAndOpd(profile);

    const created = await this.prisma.user.create({
      data: {
        ssoSubject: profile.sub,
        email,
        nama: truncate(profile.nama ?? email, NAMA_MAX),
        // Akun baru dari SSO dapat lahir memegang BEBERAPA role sekaligus
        // (6 September 2026): satu nilai klaim Helpdesk memetakan ke satu PAKET
        // peran. Inilah yang memunculkan pemilih peran saat login -- dengan satu
        // role, pemilih itu tak pernah tampil.
        roles,
        ...(opdId === null ? {} : { opdId }),
        // NIK, nomor HP, & alamat dari klaim Helpdesk (1 Oktober 2026).
        ...this.identitasUntukDisimpan(profile),
        lastLoginAt: new Date(),
        // `consentAt` SENGAJA dibiarkan null. Kolom itu catatan persetujuan UU
        // PDP; mengisinya otomatis berarti mencatat persetujuan yang belum
        // pernah diberikan pengguna. Pengisiannya milik langkah persetujuan di
        // antarmuka, bukan efek samping login.
      },
    });
    // ALAMAT EMAIL tidak ikut dicetak (22 September 2026). Baris ini sudah
    // membawa `id`, yang menunjuk barisnya di `users` tanpa menggandakan data
    // pribadi ke berkas log — tempat yang tak punya masa retensi, tak
    // terenkripsi, dan biasanya terbaca lebih banyak orang daripada basis
    // datanya sendiri. Alasannya sama persis dengan `sso-claim-shape.ts`, yang
    // menolak menyalin nilai klaim ke log; berkas ini yang belum ikut.
    this.logger.log(
      `Pengguna baru dari SSO: id=${created.id} peran=${created.roles.join(',')}` +
        (created.opdId === null ? '' : ` opdId=${created.opdId}`),
    );

    // Pengaman KETIGA atas peran tertinggi yang diberikan dari luar SKEMA (dua
    // lainnya: baku `responden` bila env kosong, dan penetapan hanya saat akun
    // dibuat). Hak itu harus meninggalkan jejak -- tanpa ini, Helpdesk yang
    // salah kirim memberikannya tanpa ada yang pernah tahu.
    //
    // Sasarannya mengikuti PERAN TERTINGGI, bukan nama tertentu. Sejak
    // `superuser` dilebur (15 September 2026), `kabupaten` yang memegang
    // manajemen pengguna dan log aktivitas -- membiarkan pengaman ini menjaga
    // nama yang sudah tak ada sama dengan membuangnya.
    if (created.roles.includes(Role.kabupaten)) {
      // `sub` Helpdesk TIDAK ikut, baik ke log maupun ke `audit_logs.detail`
      // (22 September 2026). Barisnya sudah menunjuk akunnya lewat `id`, dan
      // `users.sso_subject` menyimpan nilainya — menyalinnya ke tabel kedua
      // tak menambah satu pun kemampuan penelusuran, hanya menggandakan
      // pengenal identitas ke tempat yang dibaca Admin Kabupaten. Itu persis
      // penggandaan yang dilarang temuan T8.
      //
      // Yang dijaga pengaman ini tetap utuh: SIAPA, peran apa, dan kapan.
      this.logger.warn(`Akun baru id=${created.id} lahir memegang kabupaten dari klaim Helpdesk`);
      await this.audit.record(created.id, 'sso_grant_kabupaten', 'auth', {
        roles: created.roles,
      });
    }
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
  private async resolveRolesAndOpd(
    profile: SsoProfile,
  ): Promise<{ roles: Role[]; opdId: number | null }> {
    const values = this.nilaiPeranDariKlaim(profile);
    const resolved = resolveRolesFromClaims(
      values,
      parseRolePackages(this.config.get<string>('helpdesk.ssoRoleMap')),
    );

    const peran = resolved.length > 0 ? resolved : [Role.responden];

    // OPD DICARI TANPA MEMANDANG PERAN (29 September 2026). Sebelumnya
    // pencarian ini dilewati bagi akun yang tak berperan `opd`, dengan alasan
    // `opd_id` hanya berguna bagi Admin OPD. Alasan itu benar selama ASN selalu
    // lahir berperan `opd`; sejak ASN lahir sebagai `responden` saja, ia
    // berubah dari penghematan menjadi lubang:
    //
    //   - Admin Kabupaten tak melihat instansi seorang ASN yang baru sekali
    //     masuk, padahal keterangan itulah yang dibutuhkan untuk memutuskan
    //     apakah ia pantas dijadikan Admin OPD, dan Admin OPD dari OPD mana;
    //   - menaikkannya sebelum ia masuk untuk kedua kalinya menghasilkan peran
    //     `opd` dengan `opdId` kosong, dan dashboard OPD-nya menjawab 403.
    //
    // `opd_id` adalah keterangan TEMPAT BERTUGAS, bukan hak akses. Mengisinya
    // bagi seorang responden tak memberi kemampuan apa pun, dan `acceptLogin`
    // memang sudah menyegarkannya pada setiap login tanpa melihat peran --
    // jadi yang berubah di sini hanyalah ia tak perlu menunggu login kedua.
    const opd = await this.findOpdFromClaims(profile);
    const opdId = opd ? opd.id : null;

    if (!peran.includes(Role.opd) || opdId !== null) {
      return { roles: peran, opdId };
    }

    // Peran `opd` TANPA opdId adalah keadaan setengah jadi: dashboard OPD-nya
    // pasti gagal (DashboardService.resolveDashboardOpdId menuntut opdId
    // terisi) dan pemilih peran menampilkannya nonaktif.
    //
    // Yang dibuang HANYA `opd`, bukan seluruh paket (6 September 2026).
    // Sebelumnya seluruh akun jatuh menjadi `responden`, yang berarti pemegang
    // paket `superuser+opd+responden` kehilangan hak tertingginya hanya karena
    // OPD-nya belum terdaftar -- kegagalan yang jauh lebih besar daripada
    // sebabnya.
    const tanpaOpd = peran.filter((role) => role !== Role.opd);
    this.logger.warn(
      `Klaim menunjuk peran OPD tapi tak ada OPD aktif yang cocok (nilai: ${values.join(', ') || '-'}) — peran opd tidak diberikan, sisa paket: ${tanpaOpd.join(',') || 'kosong'}`,
    );
    return {
      // Paket yang isinya HANYA `opd` menjadi kosong di sini; `responden`
      // adalah jaring pengamannya, bukan pilihan sewenang-wenang -- akun tanpa
      // satu pun role tak dapat masuk ke mana pun.
      roles: tanpaOpd.length > 0 ? tanpaOpd : [Role.responden],
      opdId: null,
    };
  }

  /**
   * Nilai kandidat OPD dari sebuah profil.
   *
   * DUA sumber, dan urutannya berarti: field khusus OPD lebih dulu
   * (`HELPDESK_SSO_OPD_CLAIM`), lalu klaim `groups`/`role` yang sejak awal
   * dipakai. Sumber kedua DIPERTAHANKAN supaya perilaku yang sudah jalan tak
   * berubah -- kalau ada instalasi yang OPD-nya memang tertulis di `groups`, ia
   * tetap ketemu.
   */
  private nilaiKandidatOpd(profile: SsoProfile): string[] {
    const fields = parseOpdClaimFields(this.config.get<string>('helpdesk.ssoOpdClaim'));
    return [
      ...new Set([
        ...extractOpdClaimValues(profile.klaim, fields),
        ...this.nilaiPeranDariKlaim(profile),
      ]),
    ];
  }

  /**
   * Cari OPD dari klaim, BERTINGKAT (8 September 2026):
   *
   *   1. `externalId` (UUID tenant Helpdesk) -- paling tepat.
   *   2. `kode` ("DINKES") -- juga tepat.
   *   3. `nama` yang dinormalkan -- jalan terakhir, dan yang paling rapuh.
   *
   * Tingkat ketiga DITAMBAHKAN karena pengguna menyatakan userinfo membawa
   * "data nama opdnya", sementara dua tingkat pertama tak akan pernah cocok
   * dengan sebuah nama panjang. Bentuk klaimnya belum dikonfirmasi, jadi
   * ketiganya dicoba dan bentuk apa pun tertangani.
   *
   * `mode: 'insensitive'` pada tingkat 1-2 BUKAN kehati-hatian berlebihan:
   * `parseClaimValues` mengubah semuanya ke huruf kecil, sementara `opd.kode`
   * tersimpan huruf besar. Tanpa ini pencocokan lewat kode tak akan pernah
   * berhasil, dan setiap Admin OPD diam-diam jatuh menjadi warga.
   */
  private async findOpdFromClaims(profile: SsoProfile): Promise<{ id: number } | null> {
    const values = this.nilaiKandidatOpd(profile);
    if (values.length === 0) {
      return null;
    }

    const tepat = await this.prisma.opd.findFirst({
      where: {
        isActive: true,
        OR: values.flatMap((value) => [
          { externalId: { equals: value, mode: 'insensitive' as const } },
          { kode: { equals: value, mode: 'insensitive' as const } },
        ]),
      },
      select: { id: true },
    });
    if (tepat) {
      return tepat;
    }

    return this.cocokkanNamaOpd(values);
  }

  /**
   * Tingkat ketiga: cocokkan NAMA, dan hanya bila hasilnya TEPAT SATU.
   *
   * Menuntut satu-satunya kecocokan adalah inti keamanan fungsi ini. Nama OPD
   * saling bersarang di daftar nyata ("Dinas Kesehatan" vs "Dinas Kesehatan dan
   * Keluarga Berencana"), dan `findFirst` akan mengambil baris pertama yang
   * kebetulan ditemukan -- menautkan seseorang ke instansi yang bukan tempatnya,
   * tanpa satu pun galat. Yang mendua DITOLAK dan dicatat, tidak diterka.
   *
   * Seluruh OPD aktif dimuat (puluhan baris) karena normalisasinya tak dapat
   * dinyatakan sebagai kueri SQL; ini hanya berjalan bila tingkat 1-2 gagal.
   */
  private async cocokkanNamaOpd(values: string[]): Promise<{ id: number } | null> {
    const dicari = new Set(values.map(normalkanNamaOpd).filter(Boolean));
    if (dicari.size === 0) {
      return null;
    }

    const semua = await this.prisma.opd.findMany({
      where: { isActive: true },
      select: { id: true, nama: true },
    });
    const cocok = semua.filter((opd) => dicari.has(normalkanNamaOpd(opd.nama)));

    if (cocok.length === 1) {
      return { id: cocok[0].id };
    }
    if (cocok.length > 1) {
      this.logger.warn(
        `Nama OPD dari klaim cocok ke ${cocok.length} instansi sekaligus ` +
          `(${cocok.map((o) => o.nama).join(' | ')}) -- DITOLAK, bukan diterka. ` +
          `Isi HELPDESK_SSO_OPD_CLAIM dengan field yang membawa kode atau UUID.`,
      );
    }
    return null;
  }

  /**
   * OPD yang DITUNJUK KLAIM login ini, atau `null` bila klaimnya tak ada atau
   * tak cocok ke OPD aktif mana pun (8 September 2026).
   *
   * MENGEMBALIKAN OPD KLAIM, BUKAN "YANG PERLU DITULIS" (6 Oktober 2026).
   * Dulu fungsi ini mengembalikan `null` untuk DUA keadaan yang berbeda artinya:
   * klaim tidak ada, dan klaim sama dengan yang tersimpan. Peleburan itu tak
   * merugikan selama satu-satunya pertanyaan adalah "perlu menulis?", tetapi
   * `peranSetelahSinkron` menuntut bedanya -- klaim yang hilang tak boleh
   * mencabut apa pun, sedangkan klaim yang sama hanya berarti tak ada yang
   * berubah. Pemanggil yang memutuskan perlu-tulis sekarang, dari nilai ini.
   *
   * Permintaan pengguna: data yang berasal dari Helpdesk harus tetap sinkron dan
   * tak dapat diacak-acak dari SKEMA. Karena itu login menjadi satu-satunya
   * penulis kolom ini -- `PATCH /users/:id` sudah tak menerimanya.
   *
   * KLAIM TIDAK ADA -> JANGAN SENTUH, jangan pernah mengosongkan. Ini menghormati
   * keputusan 27 Agustus 2026 yang menolak sinkronisasi PERAN pada setiap login:
   * bila Helpdesk suatu saat berhenti mengirim klaim -- konfigurasi berubah,
   * scope dicabut, bentuknya bergeser -- yang mengosongkan tautan akan mencabut
   * hak setiap Admin OPD sekaligus, dan kegagalan itu SENYAP. Peran pun tetap
   * TIDAK disinkronkan di sini; yang disinkronkan hanya OPD.
   */
  private async opdIdDariKlaim(user: User, profile: SsoProfile): Promise<number | null> {
    const values = this.nilaiKandidatOpd(profile);
    if (values.length === 0) {
      // Lazim & benar bagi non-ASN. Nama-nama field dicatat di tingkat debug
      // supaya bentuk klaim yang sebenarnya dapat ditemukan dari log sendiri
      // ketika `HELPDESK_SSO_OPD_CLAIM` ternyata salah nama -- tanpa menebak,
      // dan tanpa menyalin NILAI klaim (data pribadi) ke log.
      this.logger.debug(
        `Tak ada klaim OPD pada profil ${profile.sub}; field yang diterima: ` +
          `${Object.keys(profile.klaim).join(', ') || '(tak ada)'}`,
      );
      return null;
    }

    const opd = await this.findOpdFromClaims(profile);
    if (!opd) {
      this.logger.warn(
        `Klaim OPD ada tapi tak ada OPD aktif yang cocok (nilai: ${values.join(', ')}); ` +
          `field yang diterima: ${Object.keys(profile.klaim).join(', ') || '(tak ada)'} -- ` +
          `tautan OPD akun dibiarkan apa adanya.`,
      );
      return null;
    }
    if (opd.id !== user.opdId) {
      this.logger.log(
        `Tautan OPD akun ${user.id} disinkronkan dari Helpdesk: ` +
          `${user.opdId ?? '(kosong)'} -> ${opd.id}`,
      );
    }
    return opd.id;
  }

  /**
   * Jenis pengguna (ASN atau warga) dari klaim login ini, atau `null`.
   *
   * Jalur bercabang bersarang-dahulu-lalu-rata, pola yang sama dengan ketiga
   * medan identitas: payload `userinfo` menaruhnya di `identity.user_type`,
   * sedangkan `/api/me` meratakannya menjadi `user_type`.
   *
   * `null` berarti TAK DIBERITAHU -- bukan "bukan ASN". Dua pemakainya
   * memperlakukannya begitu: yang satu tak menulis kuncinya sama sekali, yang
   * lain tak mencabut apa pun.
   */
  private jenisPenggunaDariKlaim(profile: SsoProfile): JenisPengguna | null {
    return (
      petakanJenisPengguna(ambilJalurKlaim(profile.klaim, 'identity.user_type')) ??
      petakanJenisPengguna(ambilJalurKlaim(profile.klaim, 'user_type'))
    );
  }

  /**
   * Ketiga kolom identitas dalam bentuk siap ditulis, atau objek KOSONG.
   *
   * KUNCI YANG TAK TERBACA SENGAJA TIDAK MUNCUL, bukan ditulis sebagai null.
   * Ini pola yang sama dengan `nama` di `acceptLogin`, dan alasannya sama:
   * satu login yang klaimnya kebetulan tak membawa `location` -- karena
   * penyedia mengubah bentuk, karena seksinya sedang kosong -- akan MENGHAPUS
   * alamat yang sudah tersimpan bila kuncinya ikut ditulis. Menulis null
   * adalah pernyataan "orang ini tidak punya alamat", dan klaim yang hilang
   * tidak pernah menyatakan itu.
   *
   * Enkripsinya di sini, di satu tempat yang dilewati jalur pembuatan maupun
   * jalur penyegaran. Lihat common/crypto/kolom.ts untuk apa yang dilindungi
   * dan apa yang tidak.
   */
  private identitasUntukDisimpan(profile: SsoProfile): {
    nik?: string;
    nomorHp?: string;
    alamat?: string;
    jenisKelamin?: JenisKelamin;
  } {
    const identitas = ambilIdentitasKlaim(profile.klaim);
    // TIDAK TERENKRIPSI, sengaja berbeda dari ketiga medan di bawahnya. Dua
    // nilai saja, jadi enkripsi nyaris tak menambah perlindungan sementara ia
    // melepas jaminan tipe enum dan memaksa rekapitulasi mendekripsi tiap
    // baris hanya untuk menghitung.
    //
    // Jalurnya bercabang seperti ketiga medan itu: `demographics.jenis_kelamin`
    // (userinfo, bersarang) lalu `jenis_kelamin` (/api/me, rata). Nilainya pun
    // tak seragam antar endpoint -- lihat sso-jenis-kelamin.mapper.ts.
    const jenisKelamin =
      petakanJenisKelamin(ambilJalurKlaim(profile.klaim, 'demographics.jenis_kelamin')) ??
      petakanJenisKelamin(ambilJalurKlaim(profile.klaim, 'jenis_kelamin'));
    return {
      ...(jenisKelamin ? { jenisKelamin } : {}),
      ...(identitas.nik ? { nik: enkripsiKolom(identitas.nik, this.kunci) } : {}),
      ...(identitas.nomorHp ? { nomorHp: enkripsiKolom(identitas.nomorHp, this.kunci) } : {}),
      ...(identitas.alamat ? { alamat: enkripsiKolom(identitas.alamat, this.kunci) } : {}),
    };
  }

  /**
   * Tolak akun nonaktif, lalu segarkan nama & waktu login.
   *
   * SATU-SATUNYA TEMPAT SSO MENURUNKAN HAK (6 Oktober 2026). Peran tetap TIDAK
   * disinkronkan di sini -- klaim tak pernah MENAIKKAN peran akun lama, dan
   * keputusan 27 Agustus 2026 itu utuh. Yang ditambahkan hanya satu arah:
   * peran `opd` dicabut ketika klaim HADIR dan BERTENTANGAN dengan yang
   * tersimpan. Aturannya ada di `sinkron-peran-opd.ts`, beserta alasan mengapa
   * klaim yang hilang tak boleh mencabut apa pun.
   */
  private async acceptLogin(user: User, profile: SsoProfile): Promise<User> {
    if (!user.isActive) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    const nama = profile.nama ? truncate(profile.nama, NAMA_MAX) : null;
    // OPD ikut disegarkan setiap login (8 September 2026), dengan sifat yang
    // sama seperti nama di bawah: hanya bila Helpdesk benar-benar mengirimnya.
    const opdKlaim = await this.opdIdDariKlaim(user, profile);
    const opdId = opdKlaim !== null && opdKlaim !== user.opdId ? opdKlaim : null;

    const jenisPengguna = this.jenisPenggunaDariKlaim(profile);
    const sinkron = peranSetelahSinkron({
      roles: user.roles,
      opdIdTersimpan: user.opdId,
      opdIdDariKlaim: opdKlaim,
      jenisPenggunaDariKlaim: jenisPengguna,
    });

    const diperbarui = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(opdId === null ? {} : { opdId }),
        // `roles` DITULIS HANYA bila ada sebab tersurat. Tanpa penjaga ini
        // setiap login menimpa kolom peran dengan nilai hasil hitungan, dan
        // satu kekeliruan di `peranSetelahSinkron` akan melucuti seluruh Admin
        // OPD tanpa suara -- tepat kegagalan yang ditolak 27 Agustus 2026.
        ...(sinkron.alasan ? { roles: sinkron.roles } : {}),
        // `jenis_pengguna` disegarkan tiap login (6 Oktober 2026). Dipakai
        // gerbang Admin OPD di UsersService, bukan oleh jalur login ini.
        ...(jenisPengguna ? { jenisPengguna } : {}),
        // Nama disegarkan dari Helpdesk (sumbernya di sana), tapi EMAIL TIDAK.
        // Alasannya: `users.email` unik, sehingga menyalin email baru bisa
        // bertabrakan dengan akun lain dan menggagalkan login karena hal yang
        // tak ada urusannya dengan si pengguna. Perubahan email ditangani
        // terpisah bila kelak dibutuhkan.
        ...(nama ? { nama } : {}),
        // Identitas pelapor disegarkan tiap login dengan sifat yang sama
        // seperti nama di atas: hanya yang benar-benar dikirim Helpdesk.
        ...this.identitasUntukDisimpan(profile),
      },
    });

    if (sinkron.alasan) {
      // DICATAT SESUDAH tulisannya berhasil, bukan sebelum: jejak audit yang
      // menyatakan hak seseorang dicabut sementara tulisannya gagal lebih
      // menyesatkan daripada tak ada jejak sama sekali.
      //
      // Masuk `audit_logs`, bukan cuma log aplikasi. Ini perubahan hak akses
      // yang terjadi tanpa ada manusia menekan apa pun, dan aktornya adalah
      // pemilik akun itu sendiri -- satu-satunya orang yang terlibat.
      this.logger.warn(
        `Peran Admin OPD akun ${user.id} dicabut saat login (${sinkron.alasan}): ` +
          `opd ${user.opdId ?? '(kosong)'} -> ${opdKlaim ?? '(tak ada klaim)'}, ` +
          `peran sisa: ${sinkron.roles.join(',')}`,
      );
      await this.audit.record(user.id, 'sso_cabut_peran_opd', 'auth', {
        alasan: sinkron.alasan,
        opdIdLama: user.opdId,
        opdIdBaru: opdKlaim,
        peranSisa: sinkron.roles,
      });
    }

    return diperbarui;
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

  /**
   * Nilai kandidat peran dari klaim mentah, menurut `HELPDESK_SSO_ROLE_CLAIM`.
   *
   * DIBACA DARI `profile.klaim`, bukan dari `profile.groups`/`profile.role`
   * (28 September 2026). Dua field itu dipetakan di `HelpdeskSsoClient` dari
   * kunci TINGKAT ATAS, sementara penentu ASN vs masyarakat ternyata ada di
   * `identity.user_type` — bersarang, dan karena itu tak pernah sampai ke sini
   * lewat jalur lama betapapun benarnya env diisi.
   *
   * Bakunya tetap `groups,role`, jadi lingkungan yang belum mengisi env baru
   * ini berperilaku persis seperti sebelumnya.
   *
   * `profile.groups` & `profile.role` TETAP DIHORMATI bila klaim mentahnya tak
   * memuatnya. Keduanya field sah pada `SsoProfile`, dan sebuah `SsoSource`
   * boleh mengisinya tanpa menyertakan payload mentah — membaca `klaim` saja
   * akan diam-diam mematikan pemetaan peran bagi sumber semacam itu.
   */
  /**
   * Token sesi dari cookie permintaan, HANYA bila ia masih sah.
   *
   * Keberadaan cookie saja tak cukup: sepotong teks apa pun bernama `session`
   * akan meloloskan callback ber-state basi. Yang menentukan tandatangan dan
   * masa berlakunya, dan itu dijawab `SessionService.verify`.
   */
  private sesiMasihSah(cookieHeader: string | undefined): string | null {
    const token = readCookie(cookieHeader, SESSION_COOKIE);
    if (!token) {
      return null;
    }
    return this.sessionService.verify(token) ? token : null;
  }

  private nilaiPeranDariKlaim(profile: SsoProfile): string[] {
    const fields = parseRoleClaimFields(this.config.get<string>('helpdesk.ssoRoleClaim'));
    const keluar: string[] = [];
    const tambah = (nilai: string[]): void => {
      for (const satu of nilai) {
        if (!keluar.includes(satu)) {
          keluar.push(satu);
        }
      }
    };

    try {
      tambah(extractRoleClaimValues(profile.klaim, fields));
    } catch (err) {
      // Payload datang dari jaringan dan dapat berbentuk apa pun, termasuk
      // objek yang pengaksesan propertinya sendiri melempar. Penentuan peran
      // TIDAK BOLEH menjadi sebab orang gagal masuk: yang benar adalah jatuh ke
      // peran baku, bukan meledak. Alasan yang sama dengan
      // `catatBentukKlaimSekali`.
      this.logger.warn(`Gagal membaca klaim peran: ${(err as Error)?.message ?? err}`);
    }

    // Cadangan bagi `SsoSource` yang mengisi kedua field ini tanpa menyertakan
    // payload mentah. Objek kecil dirakit sendiri, BUKAN salinan `profile.klaim`
    // -- menyalinnya berarti membaca setiap propertinya, dan itu persis jalan
    // yang baru saja dijaga di atas.
    tambah(extractRoleClaimValues({ groups: profile.groups, role: profile.role }, fields));

    return keluar;
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
