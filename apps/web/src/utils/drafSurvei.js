const AWALAN = 'skema:draf-survei:';
const kunci = (surveyId) => `${AWALAN}${surveyId}`;

/**
 * Draf jawaban survei bersesi yang tertahan karena sesi berakhir saat dikirim
 * (23 November 2026). Pasangan `drafPengaduan.js`.
 *
 * KENAPA sessionStorage: jawaban uraian dapat memuat data pribadi, dan
 * sessionStorage ikut mati saat tabnya ditutup. Perjalanan yang dilindungi
 * cukup satu tab, yaitu masuk kembali lalu membuka survei yang sama.
 *
 * SELALU BERPEMILIK. Satu-satunya keadaan yang menyimpan draf ini melewati
 * keluar-masuk akun, jadi di komputer bersama orang lain dapat masuk di tab
 * yang sama. Tanpa id pemilik, tidak ada yang disimpan; draf semacam itu akan
 * dituangkan ke akun siapa pun yang masuk berikutnya.
 */
export function simpanDrafSurvei(surveyId, answers, pemilik) {
  if (pemilik == null) return;
  try {
    sessionStorage.setItem(kunci(surveyId), JSON.stringify({ answers: answers ?? {}, pemilik }));
  } catch {
    // Penyimpanan diblokir (mode privat, kebijakan situs). Draf yang gagal
    // disimpan bukan alasan menjatuhkan halaman survei.
  }
}

/** @returns {{answers: object, pemilik: number}|null} `null` bila tak ada atau isinya tak masuk akal. */
export function ambilDrafSurvei(surveyId) {
  try {
    const mentah = sessionStorage.getItem(kunci(surveyId));
    if (!mentah) return null;

    const isi = JSON.parse(mentah);
    const objek = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
    if (!objek(isi) || !objek(isi.answers) || isi.pemilik == null) return null;
    return { answers: isi.answers, pemilik: isi.pemilik };
  } catch {
    return null;
  }
}

export function hapusDrafSurvei(surveyId) {
  try {
    sessionStorage.removeItem(kunci(surveyId));
  } catch {
    // Sama seperti di atas: tak ada yang perlu digagalkan karena ini.
  }
}
