import type { PerangkatSesi } from './penyimpan-sesi.interface';

/** Panjang `User-Agent` yang disimpan. Sisanya dipotong. */
const UA_MAKS = 180;

interface PermintaanRingan {
  headers?: Record<string, unknown>;
  ip?: string;
}

/**
 * Keterangan perangkat untuk daftar sesi aktif.
 *
 * DIPOTONG, bukan disimpan apa adanya: `User-Agent` dikendalikan sepenuhnya oleh
 * klien dan tak punya batas panjang, sehingga menyimpannya utuh berarti satu
 * permintaan dapat menitipkan untai sebesar apa pun ke penyimpan sesi.
 *
 * Nilai ini TIDAK PERNAH menentukan hak akses. Ia hanya ditampilkan kepada
 * pemilik akun supaya ia mengenali perangkatnya sendiri, jadi klien yang
 * memalsukannya hanya menipu dirinya sendiri.
 *
 * DI PENGEMBANGAN `ip` SELALU BERISI GATEWAY DOCKER, dan itu BUKAN kerusakan.
 * Terukur 7 Oktober 2026: nginx sendiri mencatat `172.18.0.1` sebagai
 * `$remote_addr`, dan nilai itu persis gateway jaringan `skm-network`. Docker
 * Desktop mem-NAT lalu lintas host ke container, sehingga alamat klien aslinya
 * sudah hilang SEBELUM nginx melihatnya; `X-Forwarded-For` karena itu hanya
 * dapat meneruskan alamat gateway, dan `trust proxy` meneruskannya dengan
 * setia. Di produksi nginx berdiri tanpa NAT di depannya dan nilainya menjadi
 * alamat klien sungguhan. Jangan menambal ini di sisi aplikasi.
 */
export function perangkatDari(req: PermintaanRingan): PerangkatSesi {
  const ua = req.headers?.['user-agent'];
  return {
    ...(typeof ua === 'string' && ua ? { ua: ua.slice(0, UA_MAKS) } : {}),
    ...(req.ip ? { ip: req.ip } : {}),
  };
}
