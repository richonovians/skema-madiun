import axios from 'axios';
// Sengaja memakai ulang clearSession() alih-alih menghapus key di sini: daftar
// artefak sesi (token & role, masing-masing di localStorage DAN cookie) hanya
// boleh punya satu definisi. Menyalinnya ke sini persis yang dulu bikin
// pembersihan tak sinkron.
//
// TIDAK ADA impor berputar: sejak 8 September 2026 authStorage mengimpor satu
// modul, `services/apiBase.js`, dan modul itu tak mengimpor apa pun. Arah
// impornya tetap satu arah -- api.js -> authStorage -> apiBase.
import {clearSession, perbaruiMasaBerlakuSesi} from '@/features/authentication/services/authStorage';
import { API_BASE_URL } from './apiBase';

// Konfigurasi instance Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  // WAJIB untuk sesi SSO (2026-08-27): tokennya kini dititipkan backend sebagai
  // cookie `session` HttpOnly, dan axios TIDAK mengirim cookie pada permintaan
  // lintas-origin kecuali diminta -- frontend :3000 memanggil API :3001, jadi
  // tanpa ini setiap panggilan setelah login SSO akan 401 padahal cookie-nya ada.
  //
  // Sisi backend sudah menyiapkannya sejak awal: `credentials: true` di
  // app.setup.ts dengan origin EKSPLISIT (bukan '*', yang justru dilarang
  // dipasangkan dengan credentials oleh peramban).
  withCredentials: true,
});

// Interceptor Request: Menyematkan token JWT jika ada
api.interceptors.request.use(
  (config) => {
    // Pada Next.js sisi client, kita bisa mengambil token dari localStorage/cookie.
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor Response: buka envelope backend { success, statusCode, message, data, meta }
// agar pemanggil cukup pakai response.data sebagai payload asli, bukan response.data.data.
// meta (termasuk meta.pagination untuk endpoint terpaginasi) dipindah ke response.meta
// supaya tidak hilang. Endpoint non-JSON (mis. unduhan file) tidak match 'success' -> dibiarkan apa adanya.
/**
 * Nama header pembawa waktu berakhirnya sesi sesudah diperpanjang server
 * (17 September 2026). Dikonsumsi di kedua interceptor di bawah: perpanjangan
 * ikut menumpang pada respons apa pun, bukan pada endpoint khusus.
 */
const HEADER_SESI_BERAKHIR = 'x-sesi-berakhir';

function serapPerpanjanganSesi(response) {
  const nilai = response?.headers?.[HEADER_SESI_BERAKHIR];
  if (nilai === undefined || nilai === null) return;
  perbaruiMasaBerlakuSesi(Number(nilai));
}

/**
 * Pesan untuk galat yang TAK membawa amplop backend (BUG-075, 17 November 2026).
 *
 * Halaman 502/503/504 nginx berisi HTML, dan jaringan putus atau timeout tak
 * membawa jawaban sama sekali. Tanpa pesan cadangan, `error.message` bawaan
 * axios -- "Request failed with status code 502", "Network Error",
 * "timeout of 10000ms exceeded" -- tampil kepada warga lewat `ErrorState`,
 * justru saat layanan padam.
 *
 * Dikenali dari `error.code` axios, bukan dari bunyi pesannya. Pembatalan
 * (`ERR_CANCELED`) dibiarkan apa adanya: itu keputusan kode, bukan kegagalan.
 */
function pesanTanpaJawaban(error) {
  if (error.code === 'ERR_CANCELED') return null;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'Server terlalu lama menjawab. Coba lagi dalam beberapa saat.';
  }
  return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.';
}

function pesanTanpaAmplop(status) {
  if (status >= 500) {
    return 'Layanan sedang tidak dapat dihubungi. Coba lagi dalam beberapa saat.';
  }
  return `Permintaan tidak dapat diproses (kode ${status}).`;
}

/**
 * Buka amplop JSON yang terbungkus Blob (BUG-075).
 *
 * Permintaan ber-`responseType: 'blob'` -- ekspor hasil IKM -- menerima
 * jawaban galatnya sebagai Blob juga, sehingga amplop backend tak terlihat
 * sebagai objek dan pesan cadangan "layanan tak dapat dihubungi" tampil
 * padahal backend menyebut sebabnya. Hanya Blob berlabel JSON yang dibaca;
 * halaman HTML nginx dan JSON rusak mengembalikan `null` dan jatuh ke pesan
 * cadangan.
 *
 * `FileReader` dipakai bila `blob.text()` tak ada (Blob jsdom).
 */
async function bacaAmplopBlob(data) {
  if (typeof Blob === 'undefined' || !(data instanceof Blob)) return null;
  if (!/json/i.test(data.type)) return null;
  try {
    const teks =
      typeof data.text === 'function'
        ? await data.text()
        : await new Promise((selesai, gagal) => {
            const pembaca = new FileReader();
            pembaca.onload = () => selesai(pembaca.result);
            pembaca.onerror = () => gagal(pembaca.error);
            pembaca.readAsText(data);
          });
    const amplop = JSON.parse(teks);
    return amplop && typeof amplop === 'object' ? amplop : null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => {
    serapPerpanjanganSesi(response);
    const envelope = response.data;
    if (envelope && typeof envelope === 'object' && 'success' in envelope) {
      response.meta = envelope.meta;
      response.data = envelope.data;
    }
    return response;
  },
  async (error) => {
    if (!error.response) {
      error.message = pesanTanpaJawaban(error) ?? error.message;
    }
    if (error.response) {
      // Amplop dari Blob menggantikan `data` supaya `kodeGalat()` dan cabang
      // 400/401 di bawah membacanya sama seperti jawaban JSON biasa.
      const amplopBlob = await bacaAmplopBlob(error.response.data);
      if (amplopBlob) error.response.data = amplopBlob;
      const envelope = error.response.data;
      // Sematkan pesan error dari backend ke error.message agar catch(err) langsung
      // dapat pesan yang relevan (default axios cuma "Request failed with status code 4xx").
      if (envelope && typeof envelope === 'object' && 'message' in envelope) {
        error.message = envelope.message;
      } else {
        error.message = pesanTanpaAmplop(error.response.status);
      }
      // Penolakan `ValidationPipe` (BUG-080, 9 November 2026). Backend
      // menjawabnya dengan pesan tetap 'Validation failed' dan daftar kalimat
      // class-validator berbahasa Inggris di `error.details`; tak satu pun
      // layak dibaca warga. Dikenali dari BENTUKNYA -- 400 dengan `details`
      // berupa daftar, yang hanya dihasilkan penolakan DTO -- bukan dari bunyi
      // pesannya. Penolakan 400 dari aturan bisnis membawa pesan tunggal yang
      // menyebut sebabnya, dan pesan itu tetap diteruskan.
      if (error.response.status === 400 && Array.isArray(envelope?.error?.details)) {
        error.message = 'Isian belum lengkap atau tidak sesuai. Periksa kembali lalu coba lagi.';
      }
      if (error.response.status === 401) {
        // SATU pengecualian, ditambahkan bersama multi-role (5 September 2026):
        // "peran belum dipilih" BUKAN sesi mati. Sesinya masih sah sepenuhnya;
        // yang dibutuhkan hanya satu pilihan peran. Membuang sesi di sini
        // memaksa akun ber-role banyak login ulang tanpa sebab, dan justru
        // menghalanginya mencapai halaman pemilih peran.
        //
        // Dibedakan lewat `error.code` dari backend, bukan lewat pencocokan
        // pesan: pesan bisa diubah kapan saja tanpa ada yang memerah.
        const kode = envelope?.error?.code;
        if (kode === 'ROLE_SELECTION_REQUIRED') {
          if (typeof window !== 'undefined' && window.location.pathname !== '/pilih-peran') {
            // Halaman pemilih peran sendiri memanggil GET /auth/me, jadi
            // mengarahkannya ke dirinya sendiri = pemuatan ulang tanpa henti.
            window.location.assign('/pilih-peran');
          }
          return Promise.reject(error);
        }

        if (typeof window !== 'undefined') {
          // SEBELUMNYA hanya `localStorage.removeItem('token')` -- `role` di
          // localStorage dan KEDUA cookie (`token`, `role`) dibiarkan utuh,
          // sehingga proxy.js (yang membaca cookie) masih menganggap sesi hidup
          // dan tetap membuka /admin-* padahal seluruh API-nya 401. Kini seluruh
          // artefak sesi dibersihkan sekaligus.
          //
          // Aman untuk 401 SELAIN yang di atas: backend memakainya khusus
          // "Autentikasi diperlukan" (sesi tak sah), sedangkan penolakan karena
          // peran/akses dikembalikan sebagai 403 -- lihat RolesGuard &
          // opd-scope.util.ts.
          //
          // Tanpa Bearer, yang baru ditolak server adalah cookie `session`
          // (atau ketiadaannya) -- cookie yang sama yang akan dibawa logout.
          // Mengirim logout di situ pasti 401 juga (BUG-063: pengunjung
          // beranda menembakkan satu logout untuk setiap 401). Dengan Bearer,
          // cookie-nya belum pernah diperiksa dan logout tetap dikirim.
          const membawaBearer = Boolean(error.config?.headers?.Authorization);
          clearSession({ sesiServerSudahDitolak: !membawaBearer });
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Apakah galat ini penolakan autentikasi (sesi tak sah)?
 *
 * Tinggal di layer service, BUKAN di komponen: `error.response.status` adalah
 * bentuk respons backend, dan AGENTS.md melarang komponen menyentuh backend
 * langsung. Komponen cukup bertanya "sesi saya masih sah?" tanpa tahu HTTP.
 *
 * Pembedaannya menentukan perilaku, bukan sekadar pesan (2026-08-28):
 * - 401 -> sesi memang habis. Interceptor di atas sudah membuang artefaknya,
 *   jadi antarmuka harus berhenti berpura-pura ada sesi.
 * - galat TANPA `response` sama sekali (jaringan mati, API sedang restart, nginx
 *   menjawab 502, timeout) -> sesi bisa jadi masih baik-baik saja. Pengguna TAK
 *   BOLEH dikeluarkan karena servernya sedang tak terjangkau; yang benar adalah
 *   mengatakan apa yang gagal dan menawarkan mencoba lagi.
 *
 * Aman memakai 401 sebagai penanda tunggal: backend memakainya KHUSUS untuk
 * "Autentikasi diperlukan", sedangkan penolakan karena peran/kepemilikan selalu
 * 403 (lihat RolesGuard & opd-scope.util.ts).
 */
export function isUnauthorizedError(error) {
  return error?.response?.status === 401;
}

/**
 * Kode galat dari backend (`error.code` pada amplopnya), atau `null`.
 *
 * Tinggal di sini karena alasan yang sama seperti `isUnauthorizedError`:
 * bentuk amplop respons adalah urusan layer service, dan komponen cukup
 * bertanya "penolakan jenis apa ini?" tanpa tahu bentuk HTTP-nya.
 *
 * Dipakai untuk menawarkan JALAN KELUAR yang tepat -- mis. `CONSENT_REQUIRED`
 * memunculkan tombol menuju halaman persetujuan. Mencocokkan bunyi pesan akan
 * bekerja hari ini dan diam-diam berhenti bekerja pada penyuntingan teks
 * berikutnya, tanpa ada satu uji pun yang memerah.
 */
export function kodeGalat(error) {
  const kode = error?.response?.data?.error?.code;
  return typeof kode === 'string' ? kode : null;
}

export default api;
