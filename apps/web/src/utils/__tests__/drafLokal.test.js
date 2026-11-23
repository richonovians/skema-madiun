import { IDBFactory } from 'fake-indexeddb';
import {
  BATAS_WAKTU_BUKA_MS,
  DUA_JAM_MS,
  akhirHariWibBerikutnya,
  ambilDraf,
  hapusDraf,
  hapusSemuaDraf,
  sapuDrafKedaluwarsa,
  simpanDraf,
  ttlDuaJam,
} from '../drafLokal';

/**
 * Penyimpanan draf lintas tab (23 November 2026). Keputusan pengguna: draf
 * pengaduan dan survei pindah dari sessionStorage ke IndexedDB supaya selamat
 * saat tab ditutup, dengan harga isi polos di disk sampai TTL habis. Yang
 * dikunci di sini adalah batas harga itu: pemilik wajib, kedaluwarsa
 * ditegakkan setiap kali dibaca, dan tak satu pun kegagalan penyimpanan
 * menjatuhkan halaman.
 */

const T = Date.parse('2026-11-23T08:00:00Z');

// Dibaca langsung dari IndexedDB, tanpa lewat modul yang diuji. `ambilDraf`
// membaca entri kedaluwarsa sebagai null juga ketika entrinya MASIH ADA, jadi
// ia tak dapat membuktikan bahwa entri itu benar-benar terhapus.
const bukaMentah = () =>
  new Promise((resolve, reject) => {
    const buka = indexedDB.open('skema-draf', 1);
    buka.onupgradeneeded = () => buka.result.createObjectStore('draf', { keyPath: 'kunci' });
    buka.onerror = () => reject(buka.error);
    buka.onsuccess = () => resolve(buka.result);
  });
const bacaMentah = async (kunci) => {
  const db = await bukaMentah();
  return new Promise((resolve, reject) => {
    const req = db.transaction('draf', 'readonly').objectStore('draf').get(kunci);
    req.onsuccess = () => {
      db.close();
      resolve(req.result ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
};
const tulisMentah = async (entri) => {
  const db = await bukaMentah();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('draf', 'readwrite');
    tx.objectStore('draf').put(entri);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

describe('TTL', () => {
  it('ttlDuaJam menambah tepat dua jam', () => {
    expect(DUA_JAM_MS).toBe(2 * 60 * 60 * 1000);
    expect(ttlDuaJam(T)).toBe(T + DUA_JAM_MS);
  });

  /**
   * Batas harian diatur ulang pukul 00.00 WIB, jadi draf yang tertahan pada
   * hari H harus hidup sepanjang hari H+1. Hitungannya memakai offset tetap
   * UTC+7, bukan zona waktu mesin: selama tujuh jam setiap hari tanggal UTC
   * dan tanggal WIB berbeda.
   */
  it.each([
    ['Senin 08.00 WIB menjadi Rabu 00.00 WIB', '2026-11-23T01:00:00Z', '2026-11-24T17:00:00Z'],
    ['Senin 23.30 WIB menjadi Rabu 00.00 WIB', '2026-11-23T16:30:00Z', '2026-11-24T17:00:00Z'],
    ['tepat Selasa 00.00 WIB menjadi Kamis 00.00 WIB', '2026-11-23T17:00:00Z', '2026-11-25T17:00:00Z'],
    [
      'Selasa 01.00 WIB (tanggal UTC masih Senin) menjadi Kamis 00.00 WIB',
      '2026-11-23T18:00:00Z',
      '2026-11-25T17:00:00Z',
    ],
  ])('akhirHariWibBerikutnya: %s', (_, masuk, keluar) => {
    expect(akhirHariWibBerikutnya(Date.parse(masuk))).toBe(Date.parse(keluar));
  });
});

describe('simpan dan ambil', () => {
  it('entri yang disimpan kembali utuh', async () => {
    expect(await simpanDraf('k', { pemilik: 10, kedaluwarsa: T + 1000, isi: { a: 1 } })).toBe(true);

    expect(await ambilDraf('k', { sekarang: T })).toEqual({
      kunci: 'k',
      pemilik: 10,
      kedaluwarsa: T + 1000,
      isi: { a: 1 },
    });
  });

  it('ArrayBuffer di dalam isi selamat', async () => {
    const data = new TextEncoder().encode('halo').buffer;
    await simpanDraf('k', { pemilik: 10, kedaluwarsa: T + 1000, isi: { data } });

    const entri = await ambilDraf('k', { sekarang: T });
    expect(new TextDecoder().decode(entri.isi.data)).toBe('halo');
  });

  /** Draf tanpa pemilik akan dituangkan ke akun siapa pun yang masuk berikutnya. */
  it('tanpa pemilik, tidak ada yang disimpan', async () => {
    expect(await simpanDraf('k', { pemilik: null, kedaluwarsa: T + 1000, isi: {} })).toBe(false);
    expect(await simpanDraf('k', { kedaluwarsa: T + 1000, isi: {} })).toBe(false);

    expect(await bacaMentah('k')).toBeNull();
  });

  it('tanpa kedaluwarsa berupa angka, tidak ada yang disimpan', async () => {
    expect(await simpanDraf('k', { pemilik: 10, isi: {} })).toBe(false);

    expect(await bacaMentah('k')).toBeNull();
  });

  it('entri yang lewat TTL dibaca null DAN terhapus dari disk', async () => {
    await simpanDraf('k', { pemilik: 10, kedaluwarsa: T, isi: {} });

    expect(await ambilDraf('k', { sekarang: T })).toBeNull();
    expect(await bacaMentah('k')).toBeNull();
  });

  it('entri rusak dibaca null dan terhapus', async () => {
    await tulisMentah({ kunci: 'k', pemilik: 10, isi: {} });

    expect(await ambilDraf('k', { sekarang: T })).toBeNull();
    expect(await bacaMentah('k')).toBeNull();
  });

  it('kunci yang tak pernah disimpan dibaca null', async () => {
    expect(await ambilDraf('tidak-ada', { sekarang: T })).toBeNull();
  });
});

describe('hapus', () => {
  it('hapusDraf hanya menghapus kunci itu', async () => {
    await simpanDraf('a', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} });
    await simpanDraf('b', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} });

    await hapusDraf('a');

    expect(await bacaMentah('a')).toBeNull();
    expect(await bacaMentah('b')).not.toBeNull();
  });

  it('hapusSemuaDraf mengosongkan semuanya', async () => {
    await simpanDraf('a', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} });
    await simpanDraf('b', { pemilik: 11, kedaluwarsa: T + 1000, isi: {} });

    await hapusSemuaDraf();

    expect(await bacaMentah('a')).toBeNull();
    expect(await bacaMentah('b')).toBeNull();
  });

  it('sapuDrafKedaluwarsa hanya menghapus yang lewat TTL atau rusak', async () => {
    await simpanDraf('basi', { pemilik: 10, kedaluwarsa: T, isi: {} });
    await simpanDraf('hidup', { pemilik: 10, kedaluwarsa: T + 1, isi: {} });
    await tulisMentah({ kunci: 'rusak', isi: {} });

    await sapuDrafKedaluwarsa({ sekarang: T });

    expect(await bacaMentah('basi')).toBeNull();
    expect(await bacaMentah('rusak')).toBeNull();
    expect(await bacaMentah('hidup')).not.toBeNull();
  });
});

/**
 * IndexedDB dapat tak tersedia atau menolak dibuka (mode privat, kebijakan
 * situs, kuota). Draf yang gagal disimpan bukan alasan menjatuhkan formulir,
 * tetapi pemanggilnya harus TAHU, supaya layar tidak mengaku menyimpan.
 */
describe('penyimpanan tak tersedia', () => {
  it('indexedDB tidak ada: simpan false, sisanya tidak melempar', async () => {
    global.indexedDB = undefined;

    expect(await simpanDraf('k', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} })).toBe(false);
    expect(await ambilDraf('k', { sekarang: T })).toBeNull();
    await expect(hapusDraf('k')).resolves.toBeUndefined();
    await expect(hapusSemuaDraf()).resolves.toBeUndefined();
    await expect(sapuDrafKedaluwarsa({ sekarang: T })).resolves.toBeUndefined();
  });

  it('indexedDB.open melempar: simpan false', async () => {
    global.indexedDB = {
      open() {
        throw new Error('akses ditolak');
      },
    };

    expect(await simpanDraf('k', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} })).toBe(false);
    expect(await ambilDraf('k', { sekarang: T })).toBeNull();
  });
});

/**
 * Pembukaan pertama IndexedDB di WebKit dapat menggantung tanpa pernah
 * memanggil onsuccess maupun onerror. Tanpa batas waktu, logout (yang
 * menunggu `hapusSemuaDraf`) dan putaran Kirim (yang menunggu simpan draf)
 * ikut menggantung selamanya.
 */
describe('pembukaan yang macet', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('open() yang tak pernah menjawab ditolak setelah batas waktu, tanpa melempar', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    global.indexedDB = { open: () => ({}) };
    expect(BATAS_WAKTU_BUKA_MS).toBe(2000);

    const simpan = simpanDraf('k', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} });
    const hapus = hapusSemuaDraf();
    await jest.advanceTimersByTimeAsync(BATAS_WAKTU_BUKA_MS);

    await expect(simpan).resolves.toBe(false);
    await expect(hapus).resolves.toBeUndefined();
  });

  it('onsuccess yang datang sesudah onblocked menutup koneksinya', async () => {
    const close = jest.fn();
    const permintaan = {};
    global.indexedDB = { open: () => permintaan };

    const simpan = simpanDraf('k', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} });
    permintaan.onblocked();
    await expect(simpan).resolves.toBe(false);
    permintaan.result = { close };
    permintaan.onsuccess();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('onsuccess yang datang sesudah batas waktu menutup koneksinya', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    const close = jest.fn();
    const permintaan = {};
    global.indexedDB = { open: () => permintaan };

    const simpan = simpanDraf('k', { pemilik: 10, kedaluwarsa: T + 1000, isi: {} });
    await jest.advanceTimersByTimeAsync(BATAS_WAKTU_BUKA_MS);
    await expect(simpan).resolves.toBe(false);
    permintaan.result = { close };
    permintaan.onsuccess();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
