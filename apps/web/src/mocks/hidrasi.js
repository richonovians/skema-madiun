import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';

/**
 * Menirukan perjalanan sungguhan sebuah halaman: HTML dibentuk di server yang
 * tak dapat melihat localStorage, lalu dihidrasi di peramban yang keadaannya
 * sudah berbeda.
 *
 * Mengembalikan daftar keluhan React. Kosong berarti render pertama di klien
 * sama persis dengan HTML server.
 *
 * @param {React.ReactElement} elemen
 * @param {{ diServer?: () => void, diKlien?: () => void }} keadaan
 */
export async function keluhanHidrasi(elemen, { diServer, diKlien } = {}) {
  diServer?.();
  const htmlServer = renderToString(elemen);

  const wadah = document.createElement('div');
  wadah.innerHTML = htmlServer;
  document.body.appendChild(wadah);

  diKlien?.();
  const keluhan = [];
  let akar;
  await act(async () => {
    akar = hydrateRoot(wadah, elemen, {
      onRecoverableError: (galat) => keluhan.push(String(galat?.message ?? galat)),
    });
  });
  await act(async () => akar.unmount());
  wadah.remove();
  return keluhan;
}
