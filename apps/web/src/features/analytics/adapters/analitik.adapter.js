import {
  cocokPeriode,
  parsePeriodeFilter,
  periodeFromDate,
} from '@/features/surveys/adapters/survey.adapter';

/**
 * Penyaringan & hitungan untuk Statistik & Laporan Admin OPD
 * (`/admin-opd/analytics`, 7 Oktober 2026, permintaan pengguna: "tambahkan
 * filter triwulan dan tahun").
 *
 * SEMUA DISARING DI KLIEN, sama seperti dashboard Admin OPD. `GET /dashboard/opd`
 * dan `GET /statistics` tak menerima parameter periode, jadi penyaring di navbar
 * tak mungkin dilayani server; mengiris di klien juga berarti berganti triwulan
 * tak memicu permintaan jaringan baru.
 *
 * Penyaringnya satu string (`2026-Q2` atau `2026`), dan SELALU lewat
 * `cocokPeriode`/`parsePeriodeFilter`, bukan kesamaan string atau `startsWith`:
 * "Semua Triwulan" melahirkan bentuk tahun saja yang tak pernah sama dengan
 * periode survei mana pun. Cacat itu sudah pernah menimpa dashboard (lihat
 * `periodeSemuaTriwulan.test.jsx`).
 */

/** Bulan, singkatan Indonesia. Indeks 0-11 mengikuti `Date#getMonth`. */
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Empat status `ComplaintStatus` dalam urutan alur penanganan. `key` adalah
 * bentuk frontend (lihat STATUS_MAP di complaint.adapter.js). Warnanya sama
 * dengan STATUS_META di statistics.adapter.js supaya "Selesai" tak berganti
 * rupa antara halaman publik dan halaman ini.
 */
const STATUS = [
  { key: 'Diterima', id: 'diterima', label: 'Diterima', color: '#3b82f6' },
  { key: 'Diproses', id: 'diproses', label: 'Diproses', color: '#f59e0b' },
  { key: 'Selesai', id: 'selesai', label: 'Selesai', color: '#10b981' },
  { key: 'Ditolak', id: 'ditolak', label: 'Ditolak', color: '#ef4444' },
];

/** Batas bulan terakhir bila TIDAK ada penyaring (perilaku halaman sebelum penyaring ada). */
const BULAN_TANPA_PENYARING = 6;

const round = (nilai, desimal) => {
  const faktor = 10 ** desimal;
  return Math.round(nilai * faktor) / faktor;
};

/** Survei yang periodenya lolos penyaring. Penyaring kosong meloloskan semuanya. */
export function saringSurveiPeriode(surveys, periode) {
  return surveys.filter((survey) => cocokPeriode(survey.period, periode));
}

/**
 * Survei yang jenisnya lolos penyaring (8 Oktober 2026). `semua` (atau kosong)
 * meloloskan semuanya, TERMASUK survei dari backend lama yang belum membawa `jenis`;
 * selain itu hanya yang `jenis`-nya persis sama. Survei tanpa `jenis` tidak
 * diperlakukan sebagai Custom ataupun SKM: tak ada yang dikarang.
 */
export function saringSurveiJenis(surveys, jenis) {
  if (!jenis || jenis === 'semua') return surveys;
  return surveys.filter((survey) => survey.jenis === jenis);
}

/**
 * Titik tren IKM pada TAHUN penyaring.
 *
 * Yang dipakai hanya tahunnya, TIDAK triwulannya, dan itu disengaja: tren
 * adalah bentuk perubahan antar-triwulan, dan memangkasnya ke satu triwulan
 * menyisakan satu titik -- garis tanpa arah. Memilih "Triwulan II - 2026" tetap
 * menampilkan keempat triwulan 2026; triwulan di luar tahun itu yang
 * disembunyikan. Pengguna perlu tahu ini, jadi halamannya menuliskannya.
 *
 * Titik dikenali dari `kode` kanonik (`2026-Q2`), bukan dari `periode` yang
 * sudah menjadi label teks.
 */
export function titikTrenTahun(titik, periode) {
  const filter = parsePeriodeFilter(periode);
  if (!filter) return titik;
  return titik.filter((p) => parsePeriodeFilter(p.kode)?.tahun === filter.tahun);
}

/**
 * Bulan-bulan yang tercakup penyaring, sampai bulan `sekarang` (bulan depan dan
 * seterusnya belum punya pengaduan, dan batang kosong untuknya terbaca seperti
 * "tak ada yang mengadu" padahal bulannya belum tiba).
 */
function bulanDalamPeriode(filter, sekarang) {
  const awal = filter.triwulan === null ? 0 : (filter.triwulan - 1) * 3;
  const akhir = filter.triwulan === null ? 11 : awal + 2;
  const bulan = [];
  for (let indeks = awal; indeks <= akhir; indeks += 1) {
    const sudahLewat =
      filter.tahun < sekarang.getFullYear() ||
      (filter.tahun === sekarang.getFullYear() && indeks <= sekarang.getMonth());
    if (sudahLewat) bulan.push({ tahun: filter.tahun, indeks });
  }
  return bulan;
}

/**
 * Seluruh angka tab Analisis Pengaduan, dihitung dari pengaduan yang LOLOS
 * penyaring.
 *
 * Tiga angka resolusi di sini dihitung ulang dari baris-barisnya, BUKAN diambil
 * dari `GET /dashboard/opd`. Endpoint itu menghitung atas SELURUH pengaduan OPD
 * tanpa periode; menyandingkannya dengan hitungan yang tersaring akan
 * menampilkan "Completion Rate" sepanjang masa di bawah judul triwulan tertentu.
 * Rumusnya mencerminkan `DashboardService.getOpdDashboard` persis:
 *
 *   completionRate = selesai / total * 100, dibulatkan 2 desimal
 *   averageHours   = rata-rata (updatedAt - createdAt) pengaduan SELESAI, 1 desimal
 *   openTickets    = `diterima` + `diproses`
 *
 * `updatedAt` pengaduan selesai dipakai sebagai waktu selesainya karena itulah
 * satu-satunya penanda yang ada; backend memakai pendekatan yang sama.
 *
 * @param {{complaints: object[], categories: {kode: string, nama: string}[], periode: string, sekarang?: Date}} masukan
 */
export function hitungAnalitikPengaduan({
  complaints,
  categories,
  periode,
  sekarang = new Date(),
}) {
  const filter = parsePeriodeFilter(periode);

  // Pengaduan tanpa `createdAt` tak dapat ditempatkan pada periode mana pun,
  // jadi tak lolos saat ada penyaring -- dan tetap masuk bila tak ada.
  const dalamPeriode = complaints.filter((c) => {
    if (!filter) return true;
    if (!c.createdAt) return false;
    return cocokPeriode(periodeFromDate(c.createdAt), periode);
  });
  const total = dalamPeriode.length;

  const labelKategori = Object.fromEntries(categories.map((c) => [c.kode, c.nama]));
  const hitungKategori = {};
  for (const c of dalamPeriode) {
    const kode = c.kategori || 'lainnya';
    hitungKategori[kode] = (hitungKategori[kode] || 0) + 1;
  }
  const kategori = Object.entries(hitungKategori)
    .map(([kode, count]) => ({ name: labelKategori[kode] || kode, count }))
    .sort((a, b) => b.count - a.count);

  const statusDistribution = STATUS.map(({ key, id, label, color }) => {
    const count = dalamPeriode.filter((c) => c.status === key).length;
    return {
      id,
      label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color,
    };
  });
  const jumlah = (id) => statusDistribution.find((s) => s.id === id).count;

  const selesai = dalamPeriode.filter(
    (c) => c.status === 'Selesai' && c.createdAt && c.updatedAt,
  );
  const averageHours =
    selesai.length > 0
      ? round(
          selesai.reduce(
            (acc, c) => acc + (new Date(c.updatedAt) - new Date(c.createdAt)) / 3_600_000,
            0,
          ) / selesai.length,
          1,
        )
      : null;

  return {
    categories: kategori,
    totalComplaints: total,
    statusDistribution,
    resolutionStats: {
      averageHours,
      completionRate: total > 0 ? round((jumlah('selesai') / total) * 100, 2) : null,
      openTickets: jumlah('diterima') + jumlah('diproses'),
    },
    volumeMonthly: volumeBulanan(dalamPeriode, filter, sekarang),
  };
}

function volumeBulanan(pengaduan, filter, sekarang) {
  const kunci = (tahun, indeks) => `${tahun}-${String(indeks).padStart(2, '0')}`;
  const ember = new Map();

  // Dengan penyaring, SETIAP bulan yang tercakup digambar -- termasuk yang nol --
  // supaya bentuk periodenya terbaca utuh. Tanpa penyaring tinggal bulan yang
  // punya data, enam terakhir, seperti sebelum penyaring ada.
  if (filter) {
    for (const { tahun, indeks } of bulanDalamPeriode(filter, sekarang)) {
      ember.set(kunci(tahun, indeks), { month: BULAN[indeks], received: 0, completed: 0 });
    }
  }
  for (const c of pengaduan) {
    if (!c.createdAt) continue;
    const d = new Date(c.createdAt);
    const k = kunci(d.getFullYear(), d.getMonth());
    if (!ember.has(k)) {
      ember.set(k, { month: BULAN[d.getMonth()], received: 0, completed: 0 });
    }
    const bulan = ember.get(k);
    bulan.received += 1;
    if (c.status === 'Selesai') bulan.completed += 1;
  }

  const terurut = [...ember.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  return filter ? terurut : terurut.slice(-BULAN_TANPA_PENYARING);
}
