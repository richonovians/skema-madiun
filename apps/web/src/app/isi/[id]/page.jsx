import { permanentRedirect } from 'next/navigation';

/**
 * Alamat LAMA pengisian survei. QR dan tautan yang sudah tercetak serta
 * tersebar sejak 4 September 2026 menunjuk ke sini, jadi rute ini TIDAK
 * dibuang: ia mengalihkan permanen (308) ke `/survei/:id` (8 September 2026).
 *
 * Komponen server, tanpa 'use client': pengalihannya terjadi sebelum satu byte
 * JavaScript pun dikirim ke peramban, sehingga pengunjung tak pernah melihat
 * halaman kosong yang sekejap lalu berpindah.
 *
 * Rute ini, seperti penggantinya, berada DI LUAR `config.matcher` milik
 * proxy.js. Jangan menambahkan '/isi' maupun '/survei' ke matcher itu: ia akan
 * memantulkan setiap pengisi tanpa sesi ke '/', dan gejalanya terlihat seperti
 * survei yang hilang, bukan seperti masalah proxy.
 *
 * `permanentRedirect` (308), bukan `redirect` (307): alamatnya benar-benar
 * pindah dan tak akan kembali. Peramban menyimpan pengalihan permanen, jadi
 * `/survei/:id` sebaiknya dianggap final.
 */
export default async function IsiSurveiLamaPage({ params }) {
  const { id } = await params;
  permanentRedirect(`/survei/${id}`);
}
