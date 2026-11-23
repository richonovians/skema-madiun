import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { simpanDraf } from '@/utils/drafLokal';
import SapuDrafKedaluwarsa from '../SapuDrafKedaluwarsa';

/**
 * Sapuan saat aplikasi dimuat (23 November 2026). Tanpanya, draf basi hanya
 * terhapus bila formulir yang sama dibuka lagi; draf batas harian yang tak
 * pernah dilanjutkan akan menetap di disk tanpa batas waktu.
 *
 * Dibaca langsung dari IndexedDB, sebab `ambilDraf` membaca entri basi sebagai
 * null juga ketika entrinya masih ada.
 */
const bacaMentah = (kunci) =>
  new Promise((resolve, reject) => {
    const buka = indexedDB.open('skema-draf', 1);
    buka.onupgradeneeded = () => buka.result.createObjectStore('draf', { keyPath: 'kunci' });
    buka.onerror = () => reject(buka.error);
    buka.onsuccess = () => {
      const db = buka.result;
      const req = db.transaction('draf', 'readonly').objectStore('draf').get(kunci);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    };
  });

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

it('menghapus draf basi dan membiarkan yang masih hidup, tanpa merender apa pun', async () => {
  await simpanDraf('basi', { pemilik: 10, kedaluwarsa: Date.now() - 1, isi: {} });
  await simpanDraf('hidup', { pemilik: 10, kedaluwarsa: Date.now() + 60000, isi: {} });

  const { container } = render(<SapuDrafKedaluwarsa />);

  expect(container).toBeEmptyDOMElement();
  await waitFor(async () => expect(await bacaMentah('basi')).toBeNull());
  expect(await bacaMentah('hidup')).not.toBeNull();
});
