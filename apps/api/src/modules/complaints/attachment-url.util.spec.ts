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

/** Pisahkan `?exp=..&sig=..` menjadi pasangan yang dapat diutak-atik. */
const pisah = (url: string) => {
  const [jalur, kueri] = url.split('?');
  const p = new URLSearchParams(kueri);
  return { jalur, exp: p.get('exp'), sig: p.get('sig') };
};

describe('signAttachmentPath', () => {
  it('menempelkan exp & sig pada jalur, tanpa mengubah jalurnya', () => {
    const { jalur, exp, sig } = pisah(signAttachmentPath(JALUR, RAHASIA, TTL, SEKARANG));

    expect(jalur).toBe(JALUR);
    expect(Number(exp)).toBe(Math.floor(SEKARANG / 1000) + TTL);
    expect(sig).toMatch(/^[A-Za-z0-9_-]{16,}$/); // base64url, tanpa padding
  });

  it('jalur berbeda -> tanda tangan berbeda', () => {
    const a = pisah(signAttachmentPath(JALUR, RAHASIA, TTL, SEKARANG)).sig;
    const b = pisah(signAttachmentPath('/uploads/complaints/lain.png', RAHASIA, TTL, SEKARANG)).sig;

    expect(a).not.toBe(b);
  });
});

describe('verifyAttachmentPath', () => {
  const tandatangani = (now = SEKARANG) => pisah(signAttachmentPath(JALUR, RAHASIA, TTL, now));

  it('jalur yang baru ditandatangani -> sah', () => {
    const { jalur, exp, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, exp, sig, RAHASIA, SEKARANG)).toBe('sah');
  });

  it('JALUR diganti, tanda tangan lama dipakai -> tidak sah', () => {
    // Serangan paling jelas: satu URL sah dipakai untuk mengambil lampiran lain.
    const { exp, sig } = tandatangani();
    expect(
      verifyAttachmentPath('/uploads/complaints/milik-orang-lain.png', exp, sig, RAHASIA, SEKARANG),
    ).toBe('tidak-sah');
  });

  it('EXP diperpanjang sendiri -> tidak sah', () => {
    // Kalau tanda tangan hanya mengikat jalur, baris ini akan lulus dan masa
    // berlakunya jadi hiasan.
    const { jalur, sig } = tandatangani();
    const jauh = String(Math.floor(SEKARANG / 1000) + 999_999);
    expect(verifyAttachmentPath(jalur, jauh, sig, RAHASIA, SEKARANG)).toBe('tidak-sah');
  });

  it('exp yang SAH tapi sudah lewat -> kedaluwarsa (dibedakan dari tidak sah)', () => {
    // Dibedakan supaya galat "tautan kadaluarsa, muat ulang halaman" dapat
    // dijelaskan ke pengguna tanpa menyamakannya dengan upaya pemalsuan.
    const { jalur, exp, sig } = tandatangani();
    const sesudah = SEKARANG + (TTL + 1) * 1000;
    expect(verifyAttachmentPath(jalur, exp, sig, RAHASIA, sesudah)).toBe('kedaluwarsa');
  });

  it('tepat pada detik kedaluwarsa masih sah, satu detik sesudahnya tidak', () => {
    const { jalur, exp, sig } = tandatangani();
    const tepat = (Math.floor(SEKARANG / 1000) + TTL) * 1000;
    expect(verifyAttachmentPath(jalur, exp, sig, RAHASIA, tepat)).toBe('sah');
    expect(verifyAttachmentPath(jalur, exp, sig, RAHASIA, tepat + 1000)).toBe('kedaluwarsa');
  });

  it.each([
    ['tanpa sig', SEKARANG, null],
    ['sig kosong', SEKARANG, ''],
  ])('%s -> tanpa-tanda-tangan', (_nama, _now, sig) => {
    const { jalur, exp } = tandatangani();
    expect(verifyAttachmentPath(jalur, exp, sig as string | null, RAHASIA, SEKARANG)).toBe(
      'tanpa-tanda-tangan',
    );
  });

  it('tanpa exp -> tanpa-tanda-tangan', () => {
    const { jalur, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, null, sig, RAHASIA, SEKARANG)).toBe('tanpa-tanda-tangan');
  });

  it('exp bukan angka -> tidak sah, bukan diloloskan', () => {
    const { jalur, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, 'besok', sig, RAHASIA, SEKARANG)).toBe('tidak-sah');
  });

  it('rahasia berbeda -> tidak sah', () => {
    const { jalur, exp, sig } = tandatangani();
    expect(verifyAttachmentPath(jalur, exp, sig, 'y'.repeat(32), SEKARANG)).toBe('tidak-sah');
  });

  it('sig sepanjang benar tapi isinya acak -> tidak sah (tanpa melempar)', () => {
    // Perbandingan waktu-tetap menuntut panjang sama; panjang beda tak boleh
    // membuatnya MELEDAK, cukup ditolak.
    const { jalur, exp, sig } = tandatangani();
    const acak = 'A'.repeat((sig as string).length);
    expect(verifyAttachmentPath(jalur, exp, acak, RAHASIA, SEKARANG)).toBe('tidak-sah');
    expect(verifyAttachmentPath(jalur, exp, 'pendek', RAHASIA, SEKARANG)).toBe('tidak-sah');
  });

  it('KUNCI DIPISAH DOMAIN: rahasia sesi mentah tak dapat menandatangani', () => {
    // Kalau SESSION_JWT_SECRET dipakai langsung sebagai kunci HMAC, tanda tangan
    // lampiran dan tanda tangan lain yang memakai rahasia sama jadi saling dapat
    // dipertukarkan. Uji ini memastikan turunan kunci benar-benar diterapkan.
    const { jalur, exp } = tandatangani();
    const mentah = createHmac('sha256', RAHASIA).update(`${jalur}\n${exp}`).digest('base64url');

    expect(verifyAttachmentPath(jalur, exp, mentah, RAHASIA, SEKARANG)).toBe('tidak-sah');
  });
});
