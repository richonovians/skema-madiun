/**
 * Membaca dan menanam draf di IndexedDB dari Playwright (23 November 2026).
 *
 * Nama basis data, versi, dan object store DISALIN dari
 * `src/utils/drafLokal.js`: fungsi di dalam `page.evaluate` berjalan di
 * peramban dan tidak dapat mengimpor modul aplikasi. Bila salah satunya
 * berubah di sana, ubah juga di sini.
 *
 * `onupgradeneeded` membuat store yang sama dengan aplikasi, supaya helper
 * tidak gagal pada peramban yang belum pernah menyimpan draf.
 */

export async function bacaDrafIdb(page, kunci) {
  return page.evaluate(
    (k) =>
      new Promise((resolve, reject) => {
        const buka = indexedDB.open('skema-draf', 1);
        buka.onupgradeneeded = () => buka.result.createObjectStore('draf', { keyPath: 'kunci' });
        buka.onerror = () => reject(buka.error);
        buka.onsuccess = () => {
          const db = buka.result;
          const req = db.transaction('draf', 'readonly').objectStore('draf').get(k);
          req.onsuccess = () => {
            db.close();
            const entri = req.result;
            if (!entri) {
              resolve(null);
              return;
            }
            // ArrayBuffer tidak dapat diserialisasi keluar dari page.evaluate;
            // yang dikembalikan hanya ukurannya.
            const lampiran = (entri.isi?.lampiran ?? []).map((l) => ({
              nama: l.nama,
              tipe: l.tipe,
              ukuran: l.data?.byteLength ?? 0,
            }));
            resolve({
              pemilik: entri.pemilik,
              kedaluwarsa: entri.kedaluwarsa,
              isi: { ...entri.isi, lampiran },
            });
          };
          req.onerror = () => {
            db.close();
            reject(req.error);
          };
        };
      }),
    kunci,
  );
}

export async function tanamDrafIdb(page, entri) {
  await page.evaluate(
    (e) =>
      new Promise((resolve, reject) => {
        const buka = indexedDB.open('skema-draf', 1);
        buka.onupgradeneeded = () => buka.result.createObjectStore('draf', { keyPath: 'kunci' });
        buka.onerror = () => reject(buka.error);
        buka.onsuccess = () => {
          const db = buka.result;
          const tx = db.transaction('draf', 'readwrite');
          tx.objectStore('draf').put(e);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    entri,
  );
}
