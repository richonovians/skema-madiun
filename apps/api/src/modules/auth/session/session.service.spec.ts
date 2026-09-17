import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './session.service';

describe('SessionService', () => {
  /**
   * `config` ikut disuntikkan sejak jendela menganggur & pagu mutlak
   * diperkenalkan (17 September 2026): umur token tak lagi diambil dari
   * `signOptions` modul, melainkan disebut tersurat oleh SessionService.
   */
  const konfigUji = (jendelaMenit: number) =>
    ({
      get: (kunci: string) => (kunci === 'session.idleMinutes' ? jendelaMenit : 12),
    }) as unknown as ConfigService;

  const buildService = (secret = 'test-secret', expiresInMs = 3_600_000) =>
    new SessionService(
      new JwtService({ secret, signOptions: { expiresIn: expiresInMs / 1000 } }),
      konfigUji(expiresInMs / 1000 / 60),
    );

  it('issue menghasilkan token JWT (3 segmen dipisah titik)', () => {
    const service = buildService();
    const token = service.issue(42);
    expect(token.split('.')).toHaveLength(3);
  });

  it('verify token hasil issue sendiri → mengembalikan payload sub=userId', () => {
    const service = buildService();
    const token = service.issue(42);
    expect(service.verify(token)).toEqual(expect.objectContaining({ sub: 42 }));
  });

  it('verify string acak (bukan JWT) → null', () => {
    const service = buildService();
    expect(service.verify('bukan-jwt-sama-sekali')).toBeNull();
  });

  it('verify token dengan secret berbeda (ditandatangani pihak lain) → null', () => {
    const issuer = buildService('secret-lain');
    const verifier = buildService();
    const token = issuer.issue(42);
    expect(verifier.verify(token)).toBeNull();
  });

  it('verify token kedaluwarsa → null', () => {
    // Ditandatangani LANGSUNG dengan expiresIn negatif, bukan lewat `issue`:
    // sejak 17 September 2026 `issue` selalu menerbitkan token yang masih hidup
    // minimal satu detik, dan yang diuji di sini memang `verify`, bukan
    // kemampuan `issue` menerbitkan token yang sudah mati.
    const jwt = new JwtService({ secret: 'test-secret' });
    const token = jwt.sign({ sub: 42 }, { expiresIn: -1000 });
    expect(buildService().verify(token)).toBeNull();
  });
});

/**
 * BATAS MENGANGGUR DENGAN PAGU MUTLAK (17 September 2026, laporan pengguna:
 * "baru menjalankan projek tiba-tiba sudah dalam kondisi login, kenapa session
 * kemarin masih bisa dipakai hingga hari ini").
 *
 * Sebabnya sesi berumur tetap 24 jam: token JWT tanpa penyimpanan apa pun di
 * server, cookie ber-Max-Age yang selamat dari peramban ditutup, dan kunci
 * penanda tangan yang tak berubah saat proyek dijalankan ulang. Tak satu pun
 * dari ketiganya cacat; yang keliru adalah umurnya diukur dari WAKTU LOGIN,
 * bukan dari pemakaian.
 *
 * Sekarang `exp` menjadi jendela menganggur yang pendek dan diperbarui selama
 * sesinya dipakai, sementara klaim `abs` memikul batas mutlak yang dihitung
 * sekali saat login dan TAK PERNAH bergeser. Tanpa `abs`, memperbarui `exp`
 * berarti sesi yang dipakai tiap hari tak pernah berakhir sama sekali.
 */
describe('SessionService — jendela menganggur & pagu mutlak', () => {
  const JENDELA_MENIT = 60;
  const PAGU_JAM = 12;
  const sekarang = () => Math.floor(Date.now() / 1000);

  const buatService = (jendelaMenit = JENDELA_MENIT, paguJam = PAGU_JAM) =>
    new SessionService(
      new JwtService({ secret: 'test-secret', signOptions: { expiresIn: jendelaMenit * 60 } }),
      {
        get: (kunci: string) => (kunci === 'session.idleMinutes' ? jendelaMenit : paguJam),
      } as unknown as ConfigService,
    );

  const bacaKlaim = (token: string): { exp: number; abs?: number } =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8')) as {
      exp: number;
      abs?: number;
    };

  it('token login membawa pagu mutlak, dan exp-nya jendela menganggur yang jauh lebih pendek', () => {
    const service = buatService();
    const klaim = bacaKlaim(service.issue(42));

    expect(klaim.abs).toBeGreaterThan(sekarang() + PAGU_JAM * 3600 - 60);
    expect(klaim.exp).toBeLessThan(sekarang() + JENDELA_MENIT * 60 + 60);
    // Inilah bedanya dengan keadaan lama: sesi yang ditinggal mati jauh sebelum
    // pagunya, dan itu yang membuat sesi kemarin tak lagi hidup hari ini.
    expect(klaim.exp).toBeLessThan(klaim.abs as number);
  });

  it('perpanjang menggeser jendela menganggur tanpa menggeser pagunya', () => {
    const service = buatService();
    const awal = service.issue(42);
    const klaimAwal = bacaKlaim(awal);

    const lanjutan = service.perpanjang(service.verify(awal)!);
    const klaimLanjutan = bacaKlaim(lanjutan!);

    expect(klaimLanjutan.abs).toBe(klaimAwal.abs);
    expect(klaimLanjutan.exp).toBeGreaterThanOrEqual(klaimAwal.exp);
  });

  /**
   * Penjaga terpenting berkas ini. Tanpa pagu, memperbarui jendela pada tiap
   * permintaan membuat sesi orang yang membuka aplikasi tiap hari tak pernah
   * berakhir -- persis keadaan yang sedang diperbaiki, hanya dengan cara lain.
   */
  it('perpanjangan berhenti di pagu, tidak melewatinya', () => {
    const service = buatService();
    const hampirHabis = service.verify(service.issue(42))!;
    hampirHabis.abs = sekarang() + 120; // pagu tinggal dua menit

    const klaim = bacaKlaim(service.perpanjang(hampirHabis)!);

    expect(klaim.exp).toBeLessThanOrEqual(hampirHabis.abs as number);
    expect(klaim.exp).toBeGreaterThan(sekarang());
  });

  it('pagu yang sudah lewat tidak dapat diperpanjang sama sekali', () => {
    const service = buatService();
    const kedaluwarsa = service.verify(service.issue(42))!;
    kedaluwarsa.abs = sekarang() - 1;

    expect(service.perpanjang(kedaluwarsa)).toBeNull();
  });

  /**
   * Token yang diterbitkan SEBELUM perubahan ini tak punya klaim `abs`. Ia
   * dibiarkan habis sendiri menurut umur lamanya, bukan diperpanjang tanpa
   * batas -- memperpanjang token tanpa pagu berarti menghidupkan kembali
   * persoalan yang sama pada sesi yang sedang berjalan.
   */
  it('token lama tanpa pagu tidak diperpanjang', () => {
    const service = buatService();
    const tanpaPagu = service.verify(service.issue(42))!;
    delete tanpaPagu.abs;

    expect(service.perpanjang(tanpaPagu)).toBeNull();
  });

  it('perluDiperpanjang: tidak untuk token segar, ya untuk yang sisanya tinggal separuh', () => {
    const service = buatService();

    expect(service.perluDiperpanjang(service.issue(42))).toBe(false);

    // Token yang diterbitkan dengan jendela 10 menit, lalu dinilai oleh layanan
    // berjendela 60 menit: sisanya tinggal seperenam, jauh di bawah separuh.
    const tinggalSedikit = buatService(10).issue(42);

    expect(service.perluDiperpanjang(tinggalSedikit)).toBe(true);
  });
});
