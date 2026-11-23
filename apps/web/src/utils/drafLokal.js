/**
 * Penyimpanan draf lintas tab di IndexedDB (23 November 2026).
 *
 * KEPUTUSAN PENGGUNA. Sampai PR #66, draf pengaduan dan survei disimpan di
 * sessionStorage, dengan sengaja: isinya data pribadi, dan sessionStorage
 * ikut mati saat tab ditutup. Harganya, menutup tab membuang draf, dan
 * lampiran tidak dapat ikut sama sekali. Pengguna memilih IndexedDB dengan
 * sadar akan harganya: isi draf dan lampiran tersimpan POLOS di disk peramban
 * sampai TTL habis. Enkripsi WebCrypto tidak dipakai karena kuncinya akan
 * tersimpan di profil peramban yang sama, sehingga tidak melindungi apa pun
 * di komputer bersama.
 *
 * Batas harga itu ditegakkan di sini:
 * - setiap entri WAJIB berpemilik (id akun), tanpa pemilik tidak disimpan;
 * - setiap entri membawa `kedaluwarsa`, dan entri basi dihapus saat dibaca
 *   serta saat aplikasi dimuat (`sapuDrafKedaluwarsa`);
 * - logout yang disengaja memanggil `hapusSemuaDraf`.
 *
 * JANGAN memanggil `hapusSemuaDraf` dari `clearSession()`. Interseptor 401 di
 * `services/api.js` memanggil `clearSession()` tepat ketika sesi berakhir di
 * tengah pengisian, yaitu saat draf justru baru akan disimpan dan dibutuhkan.
 *
 * Batas yang diterima: IndexedDB tidak punya penghapusan otomatis, jadi
 * kedaluwarsa hanya ditegakkan saat situs dibuka. Bila warga tak pernah
 * kembali, entrinya tetap di disk melewati TTL.
 *
 * Tak satu pun fungsi di sini melempar galat. Penyimpanan yang ditolak bukan
 * alasan menjatuhkan formulir; `simpanDraf` mengembalikan `false` supaya
 * pemanggilnya tidak mengaku menyimpan.
 */

const NAMA_DB = 'skema-draf';
const VERSI_DB = 1;
const STORE = 'draf';

export const DUA_JAM_MS = 2 * 60 * 60 * 1000;
const SEHARI_MS = 24 * 60 * 60 * 1000;
// Indonesia tidak memakai DST, jadi WIB selalu UTC+7.
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

export function ttlDuaJam(sekarang) {
  return sekarang + DUA_JAM_MS;
}

/**
 * Pukul 00.00 WIB lusa, yaitu akhir hari WIB berikutnya. Untuk draf yang
 * tertahan batas harian: batasnya diatur ulang pukul 00.00 WIB, jadi warga
 * yang kembali kapan pun keesokan harinya masih menemukan drafnya.
 */
export function akhirHariWibBerikutnya(sekarang) {
  const awalHariIniWib = Math.floor((sekarang + OFFSET_WIB_MS) / SEHARI_MS) * SEHARI_MS;
  return awalHariIniWib + 2 * SEHARI_MS - OFFSET_WIB_MS;
}

function bukaDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined' || indexedDB === null) {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const permintaan = indexedDB.open(NAMA_DB, VERSI_DB);
    permintaan.onupgradeneeded = () => {
      const db = permintaan.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'kunci' });
      }
    };
    permintaan.onsuccess = () => resolve(permintaan.result);
    permintaan.onerror = () => reject(permintaan.error);
    permintaan.onblocked = () => reject(new Error('IndexedDB terblokir'));
  });
}

/**
 * Satu transaksi. `kerja` menerima object store dan boleh mengembalikan
 * IDBRequest; hasilnya diteruskan sesudah transaksi tuntas, bukan sesudah
 * permintaannya saja, supaya penulisan sudah benar-benar tersimpan.
 */
async function transaksi(mode, kerja) {
  const db = await bukaDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const permintaan = kerja(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(permintaan ? permintaan.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transaksi IndexedDB dibatalkan'));
    });
  } finally {
    db.close();
  }
}

const objek = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function entriSah(entri) {
  return (
    objek(entri) &&
    typeof entri.kunci === 'string' &&
    entri.pemilik != null &&
    typeof entri.kedaluwarsa === 'number' &&
    objek(entri.isi)
  );
}

export async function simpanDraf(kunci, { pemilik, kedaluwarsa, isi } = {}) {
  if (pemilik == null || typeof kedaluwarsa !== 'number') return false;
  try {
    await transaksi('readwrite', (store) => store.put({ kunci, pemilik, kedaluwarsa, isi }));
    return true;
  } catch {
    return false;
  }
}

export async function ambilDraf(kunci, { sekarang = Date.now() } = {}) {
  try {
    const entri = await transaksi('readonly', (store) => store.get(kunci));
    if (!entri) return null;
    if (!entriSah(entri) || entri.kedaluwarsa <= sekarang) {
      await hapusDraf(kunci);
      return null;
    }
    return entri;
  } catch {
    return null;
  }
}

export async function hapusDraf(kunci) {
  try {
    await transaksi('readwrite', (store) => store.delete(kunci));
  } catch {
    // Sama seperti simpan: tidak ada yang perlu digagalkan karena ini.
  }
}

export async function hapusSemuaDraf() {
  try {
    await transaksi('readwrite', (store) => store.clear());
  } catch {
    // Logout tetap berjalan walau penyimpanan menolak dibuka.
  }
}

export async function sapuDrafKedaluwarsa({ sekarang = Date.now() } = {}) {
  try {
    await transaksi('readwrite', (store) => {
      const kursor = store.openCursor();
      kursor.onsuccess = () => {
        const posisi = kursor.result;
        if (!posisi) return;
        const entri = posisi.value;
        if (!entriSah(entri) || entri.kedaluwarsa <= sekarang) posisi.delete();
        posisi.continue();
      };
      return undefined;
    });
  } catch {
    // Sapuan berikutnya akan mencoba lagi saat aplikasi dimuat ulang.
  }
}
