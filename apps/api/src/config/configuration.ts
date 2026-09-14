/**
 * Konfigurasi terpusat & bertipe, dipetakan dari variabel lingkungan.
 * Dimuat oleh ConfigModule (`load: [configuration]`) sehingga dapat diakses lewat
 * `ConfigService.get('app.port')`, dsb. Nilai env sudah divalidasi oleh validateEnv.
 */
import { BATAS_HARIAN_PENGADUAN_BAKU } from '../modules/complaints/complaints.constants';

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.API_PORT ?? '3001', 10),
    apiPrefix: 'api/v1',
    // Tujuan redirect setelah callback SSO selesai. Dipisah dari `cors.origin`
    // (yang boleh berisi banyak origin) karena redirect hanya boleh ke SATU
    // alamat pasti -- membiarkannya dipilih dari daftar berarti membuka celah
    // pengalihan terbuka bila daftar itu kelak berisi origin pihak lain.
    webUrl: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    // Banyaknya reverse proxy tepercaya di depan API (2026-08-28).
    //
    // KENAPA ADA: sejak frontend & backend disajikan lewat satu origin oleh
    // nginx (infra/nginx/dev.conf), setiap permintaan tiba dari soket nginx.
    // Express secara baku TIDAK mempercayai `X-Forwarded-For`, sehingga `req.ip`
    // bernilai IP nginx untuk SELURUH pengguna -- dan ThrottlerGuard memakai
    // `req.ip` sebagai kuncinya. Akibatnya seluruh populasi berbagi SATU ember
    // 100/menit: trafik gabungan yang melewatinya menjatuhkan 429 kepada orang
    // yang tak melakukan apa-apa, sementara sebagai pagar brute-force ia tak
    // berguna karena satu penyerang tak bisa dipisahkan dari yang lain.
    // Terbukti lewat proxy sungguhan: dua X-Forwarded-For berbeda menghasilkan
    // sisa kuota 99, 98, 97, 96 -- satu ember.
    //
    // KENAPA ANGKA, BUKAN `true`: `true` mempercayai SELURUH rantai, sehingga
    // siapa pun boleh mengarang `X-Forwarded-For` dan memakai ember baru setiap
    // permintaan -- throttle-nya hilang sama sekali. Dengan angka `n`, Express
    // hanya melangkah `n` hop dari soket, dan karena nginx MENAMBAHKAN IP asli
    // di ujung kanan (`$proxy_add_x_forwarded_for`), nilai karangan klien
    // terlewati dengan sendirinya.
    //
    // NILAINYA HARUS COCOK DENGAN TOPOLOGI: satu nginx = 1. Bila kelak ada
    // proxy lain di depannya (mis. load balancer pemkab), nilainya harus 2 --
    // kalau tidak, `req.ip` menjadi IP proxy terluar dan bug satu-ember di atas
    // kembali TANPA gejala yang terlihat. Setel 0 bila API diekspos langsung
    // tanpa proxy, karena di sana XFF sepenuhnya karangan klien.
    trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  swagger: {
    enabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    path: 'api/docs',
  },
  cors: {
    // Comma-separated di production (mis. dashboard OPD + kabupaten beda subdomain).
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  turnstile: {
    // Kosong = verifikasi MATI (lihat TurnstileService untuk penjaganya di
    // produksi). Site key-nya ada di sisi web, bukan di sini: ia memang untuk
    // dipajang di HTML.
    secretKey: process.env.TURNSTILE_SECRET_KEY ?? '',
  },
  complaint: {
    // Bakunya di complaints.constants.ts, bersama alasan angkanya.
    batasHarian: parseInt(
      process.env.COMPLAINT_DAILY_LIMIT ?? String(BATAS_HARIAN_PENGADUAN_BAKU),
      10,
    ),
  },
  upload: {
    // Path lokal (relatif ke cwd proses) — storage lokal via volume Docker dulu (keputusan
    // arsitektur), siap dipindah ke S3 nanti tanpa mengubah kontrak `fileUrl` di DB.
    dir: process.env.UPLOAD_DIR ?? 'uploads',

    // Masa berlaku URL lampiran bertanda tangan (T1, 7 September 2026).
    //
    // 1 jam adalah kompromi yang disengaja. Lebih pendek berarti gambar pada
    // halaman yang dibuka lama akan gagal dimuat ulang dan pengguna melihat
    // lampiran rusak tanpa sebab yang jelas; lebih panjang memperlebar jendela
    // di mana URL yang bocor (log, riwayat peramban, tangkapan layar, `Referer`)
    // masih dapat dipakai. URL-nya SENDIRI adalah kredensialnya, jadi angka ini
    // yang menentukan seberapa lama kebocoran itu berguna.
    signedUrlTtlSeconds: parseInt(process.env.UPLOAD_SIGNED_URL_TTL_SECONDS ?? '3600', 10),
  },
  session: {
    jwtSecret: process.env.SESSION_JWT_SECRET,
    ttlHours: parseInt(process.env.SESSION_TTL_HOURS ?? '24', 10),
    // Domain cookie sesi (2026-08-27). KOSONG di dev dan itu benar: cookie
    // mengabaikan nomor port, jadi cookie milik host `localhost` yang disetel
    // API di :3001 sudah ikut terkirim ke frontend di :3000 dengan sendirinya.
    //
    // WAJIB DIISI di produksi, mis. `.madiunkab.go.id`. Tanpa itu cookie yang
    // disetel `api.madiunkab.go.id` menjadi host-only dan TIDAK pernah sampai ke
    // `skm.madiunkab.go.id` -- proxy.js (Next.js, sisi server) lalu tak melihat
    // sesi apa pun dan memantulkan pengguna yang sebenarnya sudah masuk.
    cookieDomain: process.env.SESSION_COOKIE_DOMAIN,
  },
  helpdesk: {
    // Endpoint tenants Helpdesk (sumber master data OPD) + token Bearer.
    // Opsional di validasi env (HelpdeskOpdClient baru gagal saat dipakai,
    // bukan saat boot) -- developer tanpa akses Helpdesk tetap bisa jalankan
    // API secara normal, cuma POST /opd/sync yang akan gagal jelas.
    opdApiUrl: process.env.HELPDESK_OPD_API_URL,
    opdApiToken: process.env.HELPDESK_OPD_API_TOKEN,

    // --- SSO OAuth2 (2026-08-27) ---
    // Hanya ISSUER yang dikonfigurasi, bukan tiga endpoint satu per satu:
    // Helpdesk menyediakan dokumen penemuan OIDC di
    // `<issuer>/.well-known/openid-configuration`, dan mengambil endpoint dari
    // sana berarti perubahan di sisi Helpdesk tak menuntut deploy ulang.
    ssoIssuer: process.env.HELPDESK_SSO_ISSUER,
    ssoClientId: process.env.HELPDESK_SSO_CLIENT_ID,
    ssoClientSecret: process.env.HELPDESK_SSO_CLIENT_SECRET,
    // WAJIB sama PERSIS dengan yang didaftarkan di Helpdesk -- termasuk skema,
    // port, dan ada-tidaknya garis miring di akhir.
    ssoRedirectUri: process.env.HELPDESK_SSO_REDIRECT_URI,
    // Dokumen penemuan Helpdesk mencantumkan `scopes_supported`:
    // openid, profile, email. `profile` diminta karena klaim `groups` & `role`
    // diduga dibawanya (belum dikonfirmasi Helpdesk -- lihat SsoService).
    ssoScopes: process.env.HELPDESK_SSO_SCOPES ?? 'openid profile email',
    // Pemetaan nilai klaim Helpdesk -> peran SKM, format `nilai:peran` dipisah
    // koma (mis. `admin-kab:kabupaten,admin-opd:opd`). KOSONG = tak ada akun baru
    // yang dinaikkan perannya; semuanya jadi `responden` seperti sebelumnya.
    //
    // Ada di env, bukan di kode, justru KARENA bentuk klaim `groups`/`role`
    // Helpdesk belum dikonfirmasi: begitu jawabannya datang, yang berubah cuma
    // satu baris env. Lihat sso-role.mapper.ts untuk aturan penguraiannya --
    // termasuk kenapa `superuser` tak pernah bisa dipetakan dari sini.
    ssoRoleMap: process.env.HELPDESK_SSO_ROLE_MAP,

    // Nama field klaim userinfo yang membawa OPD seorang ASN, dipisah koma
    // (8 September 2026). Dikonfigurasi, bukan dipaku di kode, karena bentuk
    // maupun nama field-nya belum dikonfirmasi Helpdesk.
    //
    // Kosong = pakai daftar baku (lihat sso-opd.mapper.ts). Bila tak ada yang
    // cocok, SsoService mencatat NAMA-NAMA field yang benar-benar diterima —
    // dari situlah nilai env ini diisi, tanpa perlu menebak.
    ssoOpdClaim: process.env.HELPDESK_SSO_OPD_CLAIM,

    // JALAN KELUAR DARURAT, baku MATI (temuan audit T5, 7 September 2026).
    //
    // Penautan akun lama lewat email menuntut `email_verified === true`. Bentuk
    // klaim Helpdesk belum dikonfirmasi (butir 04 dokumen permintaan), jadi bila
    // ternyata mereka tak mengirimkan klaim itu sama sekali, SELURUH akun lama
    // gagal ditautkan pada hari go-live dan satu-satunya jalan adalah mengubah
    // kode. Sakelar ini menjadikannya keputusan operasional yang tercatat:
    // memakainya menulis baris audit `sso_link_email_unverified` pada SETIAP
    // penautan, bukan diam-diam melewati pemeriksaan.
    //
    // Ia HANYA melonggarkan klaim yang HILANG. `email_verified: false` tetap
    // ditolak walau sakelar ini hidup -- penyedia sudah menyatakan tidak, dan
    // tak ada tafsir lain untuk itu.
    ssoAllowUnverifiedEmailLink: process.env.HELPDESK_SSO_ALLOW_UNVERIFIED_EMAIL_LINK === 'true',
  },
});
