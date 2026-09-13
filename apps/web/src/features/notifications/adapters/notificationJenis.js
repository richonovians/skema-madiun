import { Bell, ClipboardCheck, Inbox, MessageSquare, RefreshCw } from 'lucide-react';

/**
 * Rupa tiap jenis notifikasi: ikon, warna lingkaran, dan label bagi pembaca
 * layar (13 September 2026).
 *
 * `type` sudah dikirim backend dan diteruskan `adaptNotification` sejak awal,
 * tapi tak pernah dipakai satu komponen pun -- itulah sebabnya daftar riwayat
 * terbaca sebagai dinding teks: tiga "Pengaduan Baru Masuk" beruntun berbentuk
 * persis sama.
 *
 * WARNA BOLEH BERBAGI RONA, ikon tidak. Palet proyek ini praktis hanya punya
 * tiga rona (primary biru, secondary abu-biru, tertiary oranye) ditambah merah
 * untuk galat, sedangkan jenisnya empat dan akan bertambah. Memaksa satu rona
 * per jenis berarti mengarang warna di luar sistem. Jadi ronanya mengikuti
 * ARTI -- pengaduan masuk, percakapan, perubahan status, survei -- dan ikonnya
 * yang menjamin tiap baris terbaca berbeda.
 *
 * `emerald` & `amber` bukan warna baru di proyek ini: keduanya sudah dipakai di
 * 16 dan 7 tempat lain. Tintnya dibuat dari token (`bg-primary/10`) bila
 * tokennya ada, supaya tak ada nilai heksadesimal baru yang diketik tangan.
 */
export const JENIS_NOTIFIKASI = {
  complaint_created: {
    Ikon: Inbox,
    kelasIkon: 'bg-primary/10 text-primary',
    label: 'Pengaduan baru',
  },
  complaint_reply: {
    Ikon: MessageSquare,
    kelasIkon: 'bg-secondary/10 text-secondary',
    label: 'Balasan pengaduan',
  },
  complaint_status_changed: {
    Ikon: RefreshCw,
    kelasIkon: 'bg-amber-50 text-amber-700',
    label: 'Perubahan status pengaduan',
  },
  survey_response_created: {
    Ikon: ClipboardCheck,
    kelasIkon: 'bg-emerald-50 text-emerald-700',
    label: 'Jawaban survei',
  },
};

/**
 * Gaya cadangan. Jenis baru pasti muncul lagi -- `survey_response_created`
 * sendiri baru lahir hari ini -- dan yang belum dikenal harus tetap tampil
 * wajar, bukan meninggalkan lingkaran kosong. Ikonnya SENGAJA tak dipakai
 * jenis mana pun supaya "belum dikenal" tak menyamar sebagai jenis tertentu.
 */
const CADANGAN = {
  Ikon: Bell,
  kelasIkon: 'bg-surface-container text-on-surface-variant',
  label: 'Pemberitahuan',
};

export function gayaJenisNotifikasi(type) {
  return JENIS_NOTIFIKASI[type] ?? CADANGAN;
}
