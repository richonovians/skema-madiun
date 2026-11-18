/**
 * Pembantu tata letak untuk spec Playwright (BUG-087 sampai BUG-089).
 *
 * jsdom tak menata letak apa pun, jadi "dapat dicapai di layar pendek" hanya
 * dapat diukur di peramban sungguhan. Yang diukur janji kepada pengguna, bukan
 * caranya: elemen yang digulir ke dalam pandangan harus utuh di dalam layar.
 * Wilayah gulir mana yang bergerak (latar, kartu, atau badan kartu) tak
 * dipersoalkan.
 */

/**
 * Gulir elemen ke TENGAH pandangan, lalu kembalikan kotaknya.
 *
 * Bukan `locator.scrollIntoViewIfNeeded()`. Pada modal Ubah Status 568x320
 * (18 November 2026) cara itu berhenti dengan kolom catatan masih menjorok
 * 1,25 px di bawah layar: `scrollTop` 31 padahal gulirnya sanggup sampai 190.
 * Elemen yang hampir utuh terlihat dianggap sudah cukup dan tepinya yang
 * berpiksel pecahan tak dikejar, sehingga uji memerah atas kartu yang
 * sebenarnya dapat digulir. `block: 'center'` menggulir sejauh yang dapat
 * digulir wadahnya, dan elemen di wadah yang tak dapat digulir tetap di
 * tempatnya -- cacat yang hendak ditangkap tetap merah.
 *
 * GULIR HALAMAN YANG TERKUNCI DIANGGAP GAGAL (BUG-090, 18 November 2026).
 * `useBodyScrollLock` memasang `overflow: hidden` pada `body`, dan wadah
 * semacam itu TETAP dapat digulir lewat kode -- `scrollIntoView` menggulirnya
 * -- padahal jari dan roda tetikus tak dapat. Pada modal kirim survei, yang
 * latarnya terkurung di dalam halaman, uji "dapat digulir" lulus karena itu
 * walau penggunanya tak dapat menggulir apa pun. Bila gulir tadi menggeser
 * halaman yang terkunci, kotaknya dikembalikan `null` sehingga `utuhTerlihat`
 * menjawab `false`, dan posisi gulir halaman dipulihkan.
 *
 * @returns {Promise<{x:number,y:number,width:number,height:number}|null>}
 */
export async function kotakSesudahGulir(locator) {
  const halamanTerkunciTergulir = await locator.evaluate((el) => {
    const akar = document.scrollingElement ?? document.documentElement;
    const sebelum = [akar.scrollTop, akar.scrollLeft, document.body.scrollTop];
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const terkunci = getComputedStyle(document.body).overflow === 'hidden';
    const bergeser =
      akar.scrollTop !== sebelum[0] ||
      akar.scrollLeft !== sebelum[1] ||
      document.body.scrollTop !== sebelum[2];
    if (terkunci && bergeser) {
      akar.scrollTop = sebelum[0];
      akar.scrollLeft = sebelum[1];
      document.body.scrollTop = sebelum[2];
      return true;
    }
    return false;
  });
  if (halamanTerkunciTergulir) return null;
  return locator.boundingBox();
}

/** Kotak utuh di dalam layar `lebar` x `tinggi`, dengan toleransi subpiksel. */
export function utuhTerlihat(kotak, tinggi, lebar) {
  return (
    kotak !== null &&
    kotak.y >= -0.5 &&
    kotak.y + kotak.height <= tinggi + 0.5 &&
    kotak.x >= -0.5 &&
    kotak.x + kotak.width <= lebar + 0.5
  );
}
