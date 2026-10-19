/**
 * Contoh respons berhasil dan gagal untuk halaman Dokumentasi API.
 *
 * SUMBER KEBENARANNYA BUKAN DOKUMEN OPENAPI, dan itu harus dinyatakan: dokumen
 * itu tidak mendeklarasikan satu pun respons galat -- hanya 200 pada 61
 * operasi dan 201 pada 4 (terukur 5 Oktober 2026). Bentuk envelope di bawah
 * diukur langsung ke API yang berjalan, dan `message: 'OK'` dibaca dari
 * `response.interceptor.ts` (ia memang selalu 'OK', bahkan untuk 201).
 *
 * Yang DIAMBIL dari dokumen hanyalah: status suksesnya, skema `data`-nya, dan
 * apakah operasinya butuh sesi (`security`). Sisanya perilaku runtime.
 */
import { nilaiContoh, pathTerisi } from './snippet';

/** `meta` SELALU memuat keduanya, pada respons sukses maupun gagal. Naskah
 * halaman sempat menyebut `meta` hanya soal `pagination`; itu tidak lengkap. */
function meta(operasi) {
  return { timestamp: '<ISO-8601>', path: pathTerisi(operasi.path) };
}

function dataContoh(operasi) {
  const skema = operasi.skemaRespons;
  if (!skema) return null;

  const satu = {};
  for (const p of skema.properti) satu[p.nama] = nilaiContoh(p);
  // Satu anggota saja untuk respons berdaftar: dua anggota identik hanya
  // memperpanjang blok tanpa menjelaskan apa pun.
  return skema.daftar ? [satu] : satu;
}

export function responsBerhasil(operasi) {
  return JSON.stringify(
    {
      success: true,
      statusCode: operasi.statusSukses ?? 200,
      message: 'OK',
      data: dataContoh(operasi),
      meta: meta(operasi),
    },
    null,
    2,
  );
}

/** Terukur verbatim dari API hidup, 5 Oktober 2026. */
const GALAT_SESI = {
  statusCode: 401,
  message: 'Autentikasi diperlukan',
  code: 'UNAUTHORIZED',
  details: 'Autentikasi diperlukan',
};

/** Satu-satunya kode yang `details`-nya ARRAY, bukan string. */
const GALAT_VALIDASI = {
  statusCode: 400,
  message: 'Validation failed',
  code: 'BAD_REQUEST',
  details: ['<satu pesan per medan yang gagal>'],
};

/**
 * Satu contoh gagal per endpoint, dipilih dari kebenaran dokumen: operasi
 * ber-`security` dicontohkan dengan 401, endpoint publik dengan 400. Kode lain
 * yang mungkin muncul didaftar terpisah oleh `kodeGalatLain`, bukan dicontohkan
 * -- mencontohkan 404 pada endpoint yang belum tentu membalas 404 berarti
 * berjanji atas nama API.
 */
export function responsGagal(operasi) {
  const galat = operasi.butuhSesi ? GALAT_SESI : GALAT_VALIDASI;

  // Envelope galat TIDAK punya `data` sama sekali -- ini bentuk yang berbeda,
  // bukan envelope sukses dengan `data: null`.
  return JSON.stringify(
    {
      success: false,
      statusCode: galat.statusCode,
      message: galat.message,
      error: { code: galat.code, details: galat.details },
      meta: meta(operasi),
    },
    null,
    2,
  );
}

export function kodeGalatLain(operasi) {
  const lain = [];
  if (operasi.butuhSesi) lain.push('403 — peran yang sedang dipakai tak berwenang');
  if (operasi.parameterPath.length > 0) lain.push('404 — sumber daya tak ditemukan');

  const adaMasukan =
    Boolean(operasi.skemaBadan) ||
    operasi.parameterQuery.length > 0 ||
    operasi.parameterPath.length > 0;
  // 400 tak diulang pada endpoint publik: di sana ia justru yang dicontohkan.
  if (operasi.butuhSesi && adaMasukan) {
    lain.push('400 — badan atau parameter tak lolos validasi');
  }

  // 429 SELALU disebut, termasuk pada endpoint publik: throttle global berlaku
  // bagi semua rute. Angka handler sendiri dipakai bila ia menimpanya; bila
  // tidak, dipakai angka global yang diterbitkan backend.
  const batas = operasi.batasLaju ?? operasi.batasLajuGlobal;
  if (batas) {
    const detik = Math.round(batas.ttlMs / 1000);
    lain.push(`429 — batas laju, ${batas.limit} permintaan per ${detik} detik`);
  } else {
    lain.push('429 — batas laju terlampaui');
  }

  return lain;
}

/**
 * ISYARAT, bukan janji -- dan kata "mungkin" di namanya disengaja.
 *
 * Aturan "skemanya array DAN mendeklarasikan `page` + `limit`" diuji ke API
 * hidup: benar pada 7 endpoint, SALAH pada `GET /surveys/active`, yang
 * mendeklarasikan kedua parameter itu tetapi membalas tanpa `meta.pagination`.
 * Karena itu paginationnya tidak pernah ikut dicontohkan; yang ditampilkan
 * hanya catatan bahwa ia dapat muncul.
 */
export function mungkinBerpaginasi(operasi) {
  if (!operasi.skemaRespons?.daftar) return false;
  const nama = new Set(operasi.parameterQuery.map((p) => p.nama));
  return nama.has('page') && nama.has('limit');
}
