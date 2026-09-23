import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { dekripsi, INFO_LAMPIRAN, terenkripsi } from './common/crypto/envelope';
import { resolveLampiran, tipeKonten } from './common/crypto/jalur-lampiran';
import { kunciData } from './common/crypto/kunci';
import { verifyAttachmentPath } from './modules/complaints/attachment-url.util';
import { HEADER_SESI_BERAKHIR } from './modules/auth/session/session-refresh.interceptor';

/**
 * Konfigurasi aplikasi bersama — dipakai `main.ts` (runtime) DAN e2e test, agar
 * perilaku (prefiks + ValidationPipe + header keamanan + CORS) identik dan e2e
 * representatif terhadap produksi.
 */
/** Bentuk minimal `req`/`res` Express yang dipakai penjaga lampiran. */
interface UploadRequestLike {
  path: string;
  query?: Record<string, unknown>;
}
interface UploadResponseLike {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
  /** Dipakai penyaji lampiran; badannya Buffer, bukan JSON. */
  end: (body: Buffer) => void;
}

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // IP klien di belakang reverse proxy (2026-08-28). HARUS diset sebelum apa pun
  // yang membaca `req.ip` -- yaitu ThrottlerGuard, yang memakainya sebagai kunci
  // penghitung. Tanpa ini seluruh pengguna terhitung sebagai satu IP (IP nginx)
  // dan batas laju per-IP berhenti menjadi per-IP; alasan lengkap, bukti, serta
  // bahaya menyetelnya `true` ada di configuration.ts (`app.trustProxyHops`).
  //
  // Lewat `getHttpAdapter().getInstance()`, bukan `app.set()`: tanda tangan
  // fungsi ini `INestApplication` supaya dapat dipakai bersama seluruh e2e
  // (17 berkas) yang membuat aplikasinya lewat `createNestApplication()`.
  // Menyempitkannya ke `NestExpressApplication` hanya demi satu pemanggil akan
  // memaksa ke-17 berkas itu ikut berubah.
  const hops = config.get<number>('app.trustProxyHops') ?? 1;
  (app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void }).set(
    'trust proxy',
    hops,
  );

  // Header keamanan baku (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, dst.) — OWASP baseline.
  //
  // `upgrade-insecure-requests` DIBUANG saat aplikasi tidak disajikan lewat
  // https (16 September 2026, laporan pengguna: /api/docs putih kosong).
  // Direktif itu memerintahkan peramban menaikkan setiap permintaan http:// pada
  // halaman ini menjadi https://; proxy pengembangan hanya mendengarkan port 80,
  // jadi seluruh berkas Swagger ditolak sambungannya (ERR_CONNECTION_REFUSED)
  // dan wadahnya tinggal kosong. `curl` tak mematuhi CSP, jadi dari baris
  // perintah semuanya tetap terlihat 200 -- cacat yang sama persis dengan
  // Cross-Origin-Resource-Policy di bawah (6 Agustus 2026).
  //
  // Skemanya dibaca dari WEB_APP_URL, bukan NODE_ENV: yang menentukan bukan
  // "sedang mengembangkan atau tidak", melainkan apakah alamat yang dipakai
  // benar-benar melayani https. Di produksi nilainya https, jadi direktifnya
  // tetap terpasang dan tak ada yang melemah di sana.
  const lewatHttps = (config.get<string>('app.webUrl') ?? '').startsWith('https://');
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: lewatHttps ? {} : { upgradeInsecureRequests: null },
      },
    }),
  );

  // CORS eksplisit: hanya origin frontend yang diizinkan (bukan wildcard `*`),
  // `credentials: true` disiapkan untuk sesi cookie httpOnly saat SSO nyata aktif.
  // `exposedHeaders: Content-Disposition` WAJIB (INT-21) -- browser sembunyikan
  // header ini dari JS cross-origin secara default (bukan di "safe list" CORS),
  // jadi frontend (exportSurveyResults, ikm.api.js) tak bisa baca nama file asli
  // dari server & diam-diam jatuh ke nama fallback tanpa periode/ekstensi benar.
  app.enableCors({
    origin: config.get<string[]>('cors.origin'),
    credentials: true,
    // `X-Sesi-Berakhir` (17 September 2026): waktu berakhirnya sesi sesudah
    // diperpanjang. Sama seperti Content-Disposition, header di luar daftar aman
    // CORS disembunyikan peramban dari JavaScript lintas-origin -- tanpa baris
    // ini antarmuka tak pernah melihat perpanjangannya dan menyatakan sesi habis
    // padahal cookienya baru saja disegarkan.
    exposedHeaders: ['Content-Disposition', HEADER_SESI_BERAKHIR],
  });

  // ---------------------------------------------------------------- LAMPIRAN
  //
  // Penjaga + penyajian lampiran, DIPINDAH KE SINI dari main.ts (T1, 7 September
  // 2026). Alasannya bukan kerapian: selama ia hanya ada di main.ts, tak satu
  // pun dari 22 berkas e2e dapat menyentuh rute `/uploads/*`, sehingga aturan
  // aksesnya tak pernah teruji lewat HTTP sungguhan. Berkas ini memang ada untuk
  // membuat e2e representatif -- lihat docblock di atas.
  //
  // Sebelum ini `/uploads/*` disajikan statis TANPA autentikasi apa pun, dan
  // saya buktikan sendiri `curl` tanpa kredensial menjawab 200. Kini setiap
  // permintaan harus membawa `?exp=&sig=` yang diterbitkan API
  // (ComplaintsService.tandaTanganiLampiran).
  //
  // BATAS PENDEKATAN INI, tersurat supaya tak ada yang mengira lebih: URL-nya
  // SENDIRI adalah kredensialnya. Ia tak tahu siapa yang membukanya, jadi siapa
  // pun yang memegangnya dalam masa berlaku dapat membaca. Yang ia tutup adalah
  // akses PERMANEN bagi penemu jalur. Mengikatnya pada orang menuntut endpoint
  // terautentikasi lewat `assertAccess` -- pekerjaan terpisah yang lebih besar.
  const uploadDir = path.resolve(process.cwd(), config.get<string>('upload.dir') ?? 'uploads');
  const urlSecret = config.get<string>('session.jwtSecret') ?? '';
  const satuNilai = (v: unknown): string | null => {
    // `?exp=1&exp=2` membuat Express mengisinya sebagai array. Mengambil salah
    // satu berarti membiarkan pengirim memilih; menolak seluruhnya lebih jujur.
    if (typeof v === 'string') {
      return v;
    }
    return null;
  };

  app.use((req: UploadRequestLike, res: UploadResponseLike, next: () => void) => {
    if (!req.path.startsWith('/uploads/')) {
      next();
      return;
    }

    const hasil = verifyAttachmentPath(
      req.path,
      satuNilai(req.query?.exp),
      satuNilai(req.query?.sig),
      urlSecret,
    );
    if (hasil === 'sah') {
      next();
      return;
    }

    // 403 untuk SEMUA kegagalan, termasuk kedaluwarsa: membedakan status per
    // sebab akan memberi tahu penebak bahwa sebuah jalur memang ada. Sebabnya
    // tetap disebut di badan respons supaya antarmuka dapat menganjurkan "muat
    // ulang halaman" alih-alih menampilkan gambar rusak tanpa keterangan.
    res.status(403).json({
      success: false,
      statusCode: 403,
      message:
        hasil === 'kedaluwarsa'
          ? 'Tautan lampiran sudah kedaluwarsa. Muat ulang halaman untuk mendapatkan tautan baru.'
          : 'Tautan lampiran tidak sah.',
    });
  });

  // PENYAJIAN LAMPIRAN TERENKRIPSI (23 September 2026).
  //
  // Menggantikan `useStaticAssets`, dan penggantinya harus ditulis sendiri
  // karena berkas di disk kini bukan lagi berkas yang diminta peramban: ia
  // amplop AES-256-GCM (lihat common/crypto/envelope.ts). `express.static` akan
  // mengirimkan amplop itu apa adanya, dan peramban menampilkan gambar rusak.
  //
  // YANG IKUT HILANG BERSAMA `express.static`, dan karena itu ditulis ulang di
  // sini: penegakan batas direktori (jalur-lampiran.ts) dan penentuan
  // `Content-Type`. Keduanya dulu gratis, dan justru itu yang membuatnya mudah
  // terlupakan.
  //
  // `Cross-Origin-Resource-Policy: cross-origin` (2026-08-06, laporan bug user):
  // `helmet()` memasang default `same-origin` di SEMUA respons, dan peramban
  // (bukan curl -- itulah sebab verifikasi manual sebelumnya lolos) MEMBLOKIR
  // <img> lintas-origin walau responsnya 200 OK. Dilonggarkan HANYA di rute ini;
  // endpoint JSON lain tetap dijaga.
  //
  // Middleware verifikasi tanda tangan di atas berjalan LEBIH DULU dan tak
  // disentuh; permintaan yang sampai ke sini sudah bertanda tangan sah.
  const kunciLampiran = kunciData(config);
  const logLampiran = new Logger('Lampiran');

  app.use((req: UploadRequestLike, res: UploadResponseLike, next: () => void) => {
    if (!req.path.startsWith('/uploads/')) {
      next();
      return;
    }

    const berkas = resolveLampiran(uploadDir, req.path);
    if (!berkas) {
      // 404, bukan 403: jalur yang ditolak penjaga direktori tak boleh dapat
      // jawaban yang membedakannya dari jalur yang memang tak ada.
      res
        .status(404)
        .json({ success: false, statusCode: 404, message: 'Lampiran tidak ditemukan' });
      return;
    }

    let isi: Buffer;
    try {
      isi = readFileSync(berkas);
    } catch {
      res
        .status(404)
        .json({ success: false, statusCode: 404, message: 'Lampiran tidak ditemukan' });
      return;
    }

    let keluaran: Buffer;
    if (terenkripsi(isi)) {
      try {
        // SELURUH berkas didekripsi dan tagnya diverifikasi SEBELUM satu byte
        // pun dikirim. Mengalirkannya berarti mengirim plaintext yang belum
        // terbukti utuh lalu "membatalkan" setelah separuh gambar sampai di
        // peramban. Batas lampiran 5MB membuat ongkos menyangga ini kecil dan
        // terbatas -- lihat complaints.constants.ts.
        keluaran = dekripsi(isi, kunciLampiran, INFO_LAMPIRAN);
      } catch {
        // Tag tak cocok berarti berkasnya rusak ATAU kuncinya bukan kunci yang
        // dipakai menulisnya. Keduanya masalah server, bukan permintaan yang
        // salah, dan keduanya harus terdengar.
        logLampiran.error(`Gagal mendekripsi lampiran ${path.basename(berkas)}`);
        res
          .status(500)
          .json({ success: false, statusCode: 500, message: 'Lampiran tidak dapat dibaca' });
        return;
      }
    } else {
      // Berkas lama dari sebelum enkripsi dinyalakan. Tetap disajikan supaya
      // pengaduan lama tak mendadak kehilangan buktinya, tetapi namanya
      // DISEBUT di log: migrasi yang belum tuntas harus terlihat, bukan
      // tertutupi oleh jalur yang diam-diam tetap bekerja.
      logLampiran.warn(
        `Lampiran masih polos di disk: ${path.basename(berkas)} ` +
          '(jalankan `pnpm enkripsi:lampiran`)',
      );
      keluaran = isi;
    }

    res.setHeader('Content-Type', tipeKonten(berkas));
    res.setHeader('Content-Length', String(keluaran.length));
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.end(keluaran);
  });

  // Prefiks versi API: seluruh endpoint di bawah /api/v1 (kontrak arsitektur).
  // TIDAK berlaku bagi `/uploads/*` di atas -- `setGlobalPrefix` hanya mengenai
  // rute controller, bukan middleware maupun aset statis.
  app.setGlobalPrefix('api/v1');

  // Validasi & transformasi DTO global.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // buang properti yang tidak dideklarasikan di DTO
      forbidNonWhitelisted: true, // tolak request dengan properti asing
      transform: true, // ubah payload menjadi instance DTO bertipe
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
