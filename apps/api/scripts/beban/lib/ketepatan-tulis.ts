/**
 * PEMERIKSAAN KETEPATAN SKENARIO TULIS (§11.4 `docs/TEST_BEBAN.md`).
 *
 * Skenario baca menuntut selisih baris NOL. Skenario tulis menuntut selisih
 * baris SAMA DENGAN jumlah jawaban 2xx: lebih sedikit berarti ada tulisan yang
 * dijawab berhasil tetapi tak pernah sampai, lebih banyak berarti ada tulisan
 * berganda yang tak pernah dijawab. Keduanya tak terlihat dari angka latensi.
 *
 * Modul murni tanpa efek samping, supaya setiap aturannya dapat diuji tanpa
 * server (lihat `akun-beban.ts` untuk cacat yang lahir dari sebaliknya).
 */

export interface Ketepatan {
  tabel: string;
  selisih: number;
  diharapkan: number;
  cocok: boolean;
}

export function nilaiKetepatan(
  tabel: string,
  sebelum: number,
  sesudah: number,
  diharapkan: number,
): Ketepatan {
  const selisih = sesudah - sebelum;
  return { tabel, selisih, diharapkan, cocok: selisih === diharapkan };
}

/** Jumlah jawaban per kode HTTP. `null` = galat jaringan, tanpa kode. */
export function ringkasKode(kode: readonly (number | null)[]): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const k of kode) {
    const kunci = k === null ? 'galat' : String(k);
    hasil[kunci] = (hasil[kunci] ?? 0) + 1;
  }
  return hasil;
}

/**
 * Jumlah permintaan yang SEDANG TERBANG bersamaan pada titik terpadatnya.
 *
 * Inilah bukti bahwa uji balapan memang serentak. Tanpa angka ini, 50
 * permintaan yang ternyata berangkat satu per satu menghasilkan "tepat 10
 * diterima" yang tampak seperti bukti penahan bekerja, padahal tak ada balapan
 * yang pernah terjadi -- persis cacat `curl &` di Git Bash yang membuat uji
 * BUG-065 hijau palsu (16 November 2026).
 *
 * Rentang yang hanya bersentuhan (selesai = mulai berikutnya) tidak dihitung
 * bertumpuk: yang satu sudah selesai ketika yang lain berangkat.
 */
export function puncakSerentak(rentang: readonly { mulai: number; selesai: number }[]): number {
  const peristiwa: [number, number][] = [];
  for (const r of rentang) {
    peristiwa.push([r.mulai, 1], [r.selesai, -1]);
  }
  // Pada waktu yang sama, selesai didahulukan atas mulai.
  peristiwa.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let berjalan = 0;
  let puncak = 0;
  for (const [, d] of peristiwa) {
    berjalan += d;
    puncak = Math.max(puncak, berjalan);
  }
  return puncak;
}

/**
 * Pemutar sesi bergiliran. `POST /surveys/:id/responses` ber-`@Throttle`
 * 10/menit PER PENGGUNA, jadi satu sesi yang dipukul autocannon mengukur 429.
 * Bergiliran rata, bukan acak: dengan N akun dan 10 x N permintaan, setiap akun
 * tepat 10 kali dan tak satu pun menyentuh batasnya.
 */
export function buatPemutar<T>(daftar: readonly T[]): () => T {
  if (daftar.length === 0) {
    throw new Error('Pemutar sesi butuh sedikitnya satu sesi.');
  }
  let i = 0;
  return () => {
    const nilai = daftar[i % daftar.length];
    i += 1;
    return nilai;
  };
}

/**
 * Lama menunggu sebelum mencoba `dev-login` lagi sesudah 429. Rute itu
 * ber-`@Throttle` 30/menit per IP dan tak ikut dilonggarkan `THROTTLE_LIMIT`,
 * sehingga menerbitkan seratus sesi responden pasti menabraknya. Ditambah satu
 * detik supaya tak tiba tepat di tepi jendela.
 */
export function bacaTungguUlang(retryAfter: string | null): number {
  const detik = Number(retryAfter);
  if (retryAfter === null || retryAfter.trim() === '' || !Number.isFinite(detik) || detik < 0) {
    return 60_000;
  }
  return (detik + 1) * 1000;
}
