import { createHmac } from 'node:crypto';
import { signAttachmentPath, verifyAttachmentPath } from './attachment-url.util';

/**
 * TEMUAN AUDIT T1 (7 September 2026), pendekatan (b) atas pilihan pengguna.
 *
 * Sebelum ini `/uploads/complaints/<uuid>-nama.png` disajikan statis TANPA
 * autentikasi apa pun — saya buktikan sendiri: `curl` tanpa kredensial menjawab
 * 200. Penjaganya hanya nama UUID yang "tak tertebak", padahal URL itu
 * dibagikan API dan ikut bocor lewat log, riwayat peramban, tangkapan layar,
 * serta header `Referer`.
 *
 * Yang harus jelas tentang pendekatan ini, dan sudah disampaikan ke pengguna
 * sebelum ia memilih: URL-nya SENDIRI adalah kredensialnya. Ia tidak tahu siapa
 * yang membukanya — siapa pun yang memegangnya dalam masa berlaku dapat
 * membaca. Yang ia tutup adalah akses PERMANEN oleh siapa pun yang menebak atau
 * menemukan jalur, dan itu memang penutupan yang nyata.
 *
 * Karena URL adalah kredensial, tanda tangannya harus mengikat DUA hal
 * sekaligus: jalurnya DAN waktu kedaluwarsanya. Mengikat salah satu saja berarti
 * yang lain dapat diganti tanpa merusak tanda tangan — itulah yang diuji di
 * bawah, satu per satu.
 */
const RAHASIA = 'x'.repeat(32);
const JALUR = '/uploads/complaints/8a7b-foto.png';
const TTL = 3600;
const SEKARANG = 1_764_000_000_000; // ms
/** Pemilik tautan. Ikut ditandatangani sejak 9 Oktober 2026. */
const SUB = 42;

/** Pisahkan `?exp=..&sig=..` menjadi pasangan yang dapat diutak-atik. */
const pisah = (url: string) => {
  const [jalur, kueri] = url.split('?');
  const p = new URLSearchParams(kueri);
  return { jalur, exp: p.get('exp'), sub: p.get('sub'), sig: p.get('sig') };
};

describe('signAttachmentPath', () => {
  it('menempelkan exp & sig pada jalur, tanpa mengubah jalurnya', () => {
    const { jalur, exp, sig } = pisah(signAttachmentPath(JALUR, RAHASIA, TTL, SUB, SEKARANG));

    expect(jalur).toBe(JALUR);
    expect(Number(exp)).toBe(Math.floor(SEKARANG / 1000) + TTL);
    expect(sig).toMatch(/^[A-Za-z0-9_-]{16,}$/); // base64url, tanpa padding
  });

  it('jalur berbeda -> tanda tangan berbeda', () => {
    const a = pisah(signAttachmentPath(JALUR, RAHASIA, TTL, SUB, SEKARANG)).sig;
    const b = pisah(
      signAttachmentPath('/uploads/complaints/lain.png', RAHASIA, TTL, SUB, SEKARANG),
    ).sig;

    expect(a).not.toBe(b);
  });
});

describe('verifyAttachmentPath', () => {
  const tandatangani = (now = SEKARANG) => pisah(signAttachmentPath(JALUR, RAHASIA, TTL, SUB, now));

  it('jalur yang baru ditandatangani -> sah', () => {
    const { jalur, exp, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, exp, String(SUB), sig, RAHASIA, SEKARANG)).toBe('sah');
  });

  it('JALUR diganti, tanda tangan lama dipakai -> tidak sah', () => {
    // Serangan paling jelas: satu URL sah dipakai untuk mengambil lampiran lain.
    const { exp, sig } = tandatangani();
    expect(
      verifyAttachmentPath(
        '/uploads/complaints/milik-orang-lain.png',
        exp,
        String(SUB),
        sig,
        RAHASIA,
        SEKARANG,
      ),
    ).toBe('tidak-sah');
  });

  it('EXP diperpanjang sendiri -> tidak sah', () => {
    // Kalau tanda tangan hanya mengikat jalur, baris ini akan lulus dan masa
    // berlakunya jadi hiasan.
    const { jalur, sig } = tandatangani();
    const jauh = String(Math.floor(SEKARANG / 1000) + 999_999);
    expect(verifyAttachmentPath(jalur, jauh, String(SUB), sig, RAHASIA, SEKARANG)).toBe(
      'tidak-sah',
    );
  });

  it('exp yang SAH tapi sudah lewat -> kedaluwarsa (dibedakan dari tidak sah)', () => {
    // Dibedakan supaya galat "tautan kadaluarsa, muat ulang halaman" dapat
    // dijelaskan ke pengguna tanpa menyamakannya dengan upaya pemalsuan.
    const { jalur, exp, sig } = tandatangani();
    const sesudah = SEKARANG + (TTL + 1) * 1000;
    expect(verifyAttachmentPath(jalur, exp, String(SUB), sig, RAHASIA, sesudah)).toBe(
      'kedaluwarsa',
    );
  });

  it('tepat pada detik kedaluwarsa masih sah, satu detik sesudahnya tidak', () => {
    const { jalur, exp, sig } = tandatangani();
    const tepat = (Math.floor(SEKARANG / 1000) + TTL) * 1000;
    expect(verifyAttachmentPath(jalur, exp, String(SUB), sig, RAHASIA, tepat)).toBe('sah');
    expect(verifyAttachmentPath(jalur, exp, String(SUB), sig, RAHASIA, tepat + 1000)).toBe(
      'kedaluwarsa',
    );
  });

  it.each([
    ['tanpa sig', SEKARANG, null],
    ['sig kosong', SEKARANG, ''],
  ])('%s -> tanpa-tanda-tangan', (_nama, _now, sig) => {
    const { jalur, exp } = tandatangani();
    expect(
      verifyAttachmentPath(jalur, exp, String(SUB), sig as string | null, RAHASIA, SEKARANG),
    ).toBe('tanpa-tanda-tangan');
  });

  it('tanpa exp -> tanpa-tanda-tangan', () => {
    const { jalur, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, null, String(SUB), sig, RAHASIA, SEKARANG)).toBe(
      'tanpa-tanda-tangan',
    );
  });

  it('exp bukan angka -> tidak sah, bukan diloloskan', () => {
    const { jalur, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, 'besok', String(SUB), sig, RAHASIA, SEKARANG)).toBe(
      'tidak-sah',
    );
  });

  it('rahasia berbeda -> tidak sah', () => {
    const { jalur, exp, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, exp, String(SUB), sig, 'y'.repeat(32), SEKARANG)).toBe(
      'tidak-sah',
    );
  });

  it('sig sepanjang benar tapi isinya acak -> tidak sah (tanpa melempar)', () => {
    // Perbandingan waktu-tetap menuntut panjang sama; panjang beda tak boleh
    // membuatnya MELEDAK, cukup ditolak.
    const { jalur, exp, sig } = tandatangani();
    const acak = 'A'.repeat((sig as string).length);
    expect(verifyAttachmentPath(jalur, exp, String(SUB), acak, RAHASIA, SEKARANG)).toBe(
      'tidak-sah',
    );
    expect(verifyAttachmentPath(jalur, exp, String(SUB), 'pendek', RAHASIA, SEKARANG)).toBe(
      'tidak-sah',
    );
  });

  it('KUNCI DIPISAH DOMAIN: rahasia sesi mentah tak dapat menandatangani', () => {
    // Kalau SESSION_JWT_SECRET dipakai langsung sebagai kunci HMAC, tanda tangan
    // lampiran dan tanda tangan lain yang memakai rahasia sama jadi saling dapat
    // dipertukarkan. Uji ini memastikan turunan kunci benar-benar diterapkan.
    const { jalur, exp } = tandatangani();
    const mentah = createHmac('sha256', RAHASIA).update(`${jalur}\n${exp}`).digest('base64url');

    expect(verifyAttachmentPath(jalur, exp, String(SUB), mentah, RAHASIA, SEKARANG)).toBe(
      'tidak-sah',
    );
  });
});

/**
 * TAUTAN DIIKAT PADA ORANG (9 Oktober 2026, pilihan pengguna: jalur B, tegas).
 *
 * Sampai kemarin tanda tangannya hanya mengikat jalur dan waktu, dan docblock
 * di atas menyatakan batas itu tersurat: URL-nya tak tahu siapa yang
 * membukanya. Akibatnya nyata dan bukan hipotetis: ketika peran `opd`
 * seseorang dicabut lewat `sso_cabut_peran_opd`, atau ketika ia menekan
 * `POST /auth/logout-semua`, URL lampiran yang terlanjur ia pegang TETAP SAH
 * sampai `exp` lewat. Sesinya mati, tautannya tidak.
 *
 * `sub` kini ikut ditandatangani, sehingga tautan dapat dicabut per akun.
 *
 * TEGAS, bukan masa tenggang: `PEMISAH_DOMAIN` dinaikkan ke `v2`, jadi seluruh
 * URL terbitan lama batal secara kriptografis seketika, bukan menunggu
 * kedaluwarsa. Harganya tersurat dan diterima pengguna: tab yang sedang
 * terbuka harus dimuat ulang sekali.
 */
describe('tautan diikat pada akun', () => {
  const tandatangani = () => pisah(signAttachmentPath(JALUR, RAHASIA, TTL, SUB, SEKARANG));

  it('URL terbitan membawa sub', () => {
    const url = signAttachmentPath(JALUR, RAHASIA, TTL, SUB, SEKARANG);

    expect(new URLSearchParams(url.split('?')[1]).get('sub')).toBe(String(SUB));
  });

  it('sub yang benar -> sah', () => {
    const { jalur, exp, sig } = tandatangani();

    expect(verifyAttachmentPath(jalur, exp, String(SUB), sig, RAHASIA, SEKARANG)).toBe('sah');
  });

  /** Inti pengikatannya: tautan milik orang lain tak dapat dipakai ulang. */
  it('sub ditukar akun lain -> tidak sah', () => {
    const { jalur, exp, sig } = tandatangani();

    expect(verifyAttachmentPath(jalur, exp, '999', sig, RAHASIA, SEKARANG)).toBe('tidak-sah');
  });

  it('sub hilang -> tanpa tanda tangan', () => {
    const { jalur, exp, sig } = tandatangani();

    expect(verifyAttachmentPath(jalur, exp, null, sig, RAHASIA, SEKARANG)).toBe(
      'tanpa-tanda-tangan',
    );
  });

  /**
   * TEGAS dibuktikan di sini, bukan sekadar dinyatakan di docblock: tanda
   * tangan bergaya v1 (jalur + exp, kunci diturunkan dari `lampiran-url-v1`)
   * ditolak walau `sub` yang benar disertakan.
   */
  it('kunci diturunkan dari domain v1 -> ditolak, walau muatannya sudah bentuk v2', () => {
    const exp = String(Math.floor(SEKARANG / 1000) + TTL);
    // Muatannya SENGAJA sudah bentuk v2 (`jalur\nexp\nsub`); yang berbeda
    // hanya domain penurunan kuncinya. Tanpa ini ujinya hampa: tanda tangan
    // bergaya v1 lama sudah gagal karena `sub` tak ada di masukannya, sehingga
    // ia lulus tanpa pernah menyentuh nilai PEMISAH_DOMAIN. Terbukti lewat
    // mutasi: menurunkan domain ke v1 membuat seluruh uji tetap hijau.
    const kunciV1 = createHmac('sha256', RAHASIA).update('lampiran-url-v1').digest();
    const sigDomainV1 = createHmac('sha256', kunciV1)
      .update(`${JALUR}\n${exp}\n${SUB}`)
      .digest('base64url');

    expect(verifyAttachmentPath(JALUR, exp, String(SUB), sigDomainV1, RAHASIA, SEKARANG)).toBe(
      'tidak-sah',
    );
  });
});
