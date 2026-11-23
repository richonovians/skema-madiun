import { akhirHariWibBerikutnya, ambilDraf, hapusDraf, simpanDraf, ttlDuaJam } from './drafLokal';

const KUNCI = 'pengaduan';

/**
 * Medan yang boleh ikut tersimpan. Daftar putih, BUKAN daftar hitam: apa pun
 * yang kelak ditambahkan ke formulir tak akan diam-diam ikut ke penyimpanan
 * peramban hanya karena tak ada yang ingat mengecualikannya.
 */
const MEDAN = [
  'level',
  'department',
  'category',
  'title',
  'description',
  'incidentDate',
  'incidentLocation',
  'isAnonim',
];

/**
 * Draf pengaduan yang tertahan karena penolakan yang menuntut pelapornya pergi
 * lalu kembali: persetujuan PDP (14 September 2026), batas harian, dan sesi
 * berakhir (23 November 2026). DISIMPAN HANYA saat penolakan itu terjadi,
 * bukan pada tiap ketikan.
 *
 * PINDAH KE IndexedDB 23 November 2026, keputusan pengguna. Sebelumnya draf
 * ini di sessionStorage dan lampirannya sengaja tidak ikut, demi privasi di
 * komputer bersama. Kini draf selamat saat tab ditutup dan LAMPIRAN IKUT,
 * dengan harga isi dan berkas polos di disk sampai TTL habis. Alasan lengkap
 * dan batasnya ada di `drafLokal.js`.
 *
 * TTL per keadaan: persetujuan dan sesi 2 jam (perjalanannya hitungan menit),
 * batas harian sampai akhir hari WIB berikutnya (warga diminta kembali besok).
 * Keadaan tak dikenal memakai yang pendek.
 *
 * Lampiran disimpan sebagai ArrayBuffer beserta nama, tipe, dan
 * `lastModified`, lalu dibangun ulang menjadi `File` saat diambil. Objek
 * `File` tidak disimpan langsung karena Safari lama gagal menyimpannya di
 * IndexedDB.
 *
 * `pemilik` adalah id akun pengetik, WAJIB, dan datang dari argumen saja,
 * tidak pernah dari isi formulir.
 */
function kedaluwarsaUntuk(keadaan, sekarang) {
  return keadaan === 'batas_harian' ? akhirHariWibBerikutnya(sekarang) : ttlDuaJam(sekarang);
}

const objek = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function saringMedan(sumber) {
  const isi = {};
  for (const medan of MEDAN) {
    if (objek(sumber) && medan in sumber) isi[medan] = sumber[medan];
  }
  return isi;
}

function lampiranSah(l) {
  return (
    objek(l) &&
    typeof l.nama === 'string' &&
    typeof l.tipe === 'string' &&
    l.data != null &&
    typeof l.data.byteLength === 'number'
  );
}

/** @returns {Promise<boolean>} `false` bila tidak tersimpan, apa pun sebabnya. */
export async function simpanDrafPengaduan(formData, files, { pemilik, keadaan, sekarang = Date.now() } = {}) {
  if (pemilik == null) return false;
  let lampiran;
  try {
    lampiran = await Promise.all(
      (files ?? []).map(async (berkas) => ({
        nama: berkas.name,
        tipe: berkas.type,
        lastModified: berkas.lastModified,
        data: await berkas.arrayBuffer(),
      })),
    );
  } catch {
    // Simpan sebagian lebih buruk dari tidak menyimpan: layar akan mengaku
    // lampirannya ikut padahal tidak.
    return false;
  }
  return simpanDraf(KUNCI, {
    pemilik,
    kedaluwarsa: kedaluwarsaUntuk(keadaan, sekarang),
    isi: { medan: saringMedan(formData), lampiran },
  });
}

/** @returns {Promise<{pemilik: number, medan: object, files: File[]}|null>} */
export async function ambilDrafPengaduan({ sekarang } = {}) {
  const entri = await ambilDraf(KUNCI, { sekarang });
  if (!entri) return null;
  if (!objek(entri.isi.medan)) {
    await hapusDraf(KUNCI);
    return null;
  }
  const lampiran = Array.isArray(entri.isi.lampiran) ? entri.isi.lampiran : [];
  const files = lampiran
    .filter(lampiranSah)
    .map((l) => new File([l.data], l.nama, { type: l.tipe, lastModified: l.lastModified }));
  return { pemilik: entri.pemilik, medan: saringMedan(entri.isi.medan), files };
}

export function hapusDrafPengaduan() {
  return hapusDraf(KUNCI);
}

/**
 * Kalimat yang memberi tahu pelapor bahwa isiannya tersimpan, di mana, sampai
 * kapan, dan cara menghapusnya. Kalimat terakhir untuk komputer bersama.
 */
export function teksDrafTersimpan(keadaan, adaLampiran) {
  const apa = adaLampiran ? 'Isian dan lampiran Anda' : 'Isian Anda';
  const sampai = keadaan === 'batas_harian' ? 'sampai akhir hari besok' : 'selama 2 jam';
  return `${apa} disimpan di peramban ini ${sampai}. Keluar dari akun akan menghapusnya.`;
}
