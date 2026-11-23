import { ambilDraf, hapusDraf, simpanDraf, ttlDuaJam } from './drafLokal';

const kunci = (surveyId) => `survei:${surveyId}`;
const objek = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Draf jawaban survei bersesi yang tertahan karena sesi berakhir saat dikirim
 * (23 November 2026). Pasangan `drafPengaduan.js`.
 *
 * PINDAH KE IndexedDB pada hari yang sama, keputusan pengguna: draf selamat
 * saat tab ditutup, dengan harga jawaban polos di disk sampai TTL habis.
 * Alasan dan batasnya ada di `drafLokal.js`. TTL-nya 2 jam, karena
 * perjalanannya hanya masuk kembali lalu membuka survei yang sama.
 *
 * SELALU BERPEMILIK. Tanpa id pemilik, tidak ada yang disimpan; draf semacam
 * itu akan dituangkan ke akun siapa pun yang masuk berikutnya.
 */
export function simpanDrafSurvei(surveyId, answers, pemilik, { sekarang = Date.now() } = {}) {
  if (pemilik == null) return Promise.resolve(false);
  return simpanDraf(kunci(surveyId), {
    pemilik,
    kedaluwarsa: ttlDuaJam(sekarang),
    isi: { answers: answers ?? {} },
  });
}

/** @returns {Promise<{answers: object, pemilik: number}|null>} */
export async function ambilDrafSurvei(surveyId, { sekarang } = {}) {
  const entri = await ambilDraf(kunci(surveyId), { sekarang });
  if (!entri) return null;
  if (!objek(entri.isi.answers)) {
    await hapusDraf(kunci(surveyId));
    return null;
  }
  return { answers: entri.isi.answers, pemilik: entri.pemilik };
}

export function hapusDrafSurvei(surveyId) {
  return hapusDraf(kunci(surveyId));
}
