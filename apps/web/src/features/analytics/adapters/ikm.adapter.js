import { IKM_MUTU_LABEL } from '@/utils/enumLabels';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';
import { VALUE_LABEL } from '@/features/statistics/adapters/statistics.adapter';

/**
 * Terjemahkan IkmResultEntity backend (GET /surveys/:id/results) ke bentuk yang
 * dipakai komponen. Satu
 * tempat -- perubahan kontrak backend cukup diubah di sini (INT-6).
 *
 * Label mutu (A=Sangat Baik dst, lihat utils/enumLabels.js) BUKAN dikarang --
 * tabel resmi PermenPANRB 14/2017 (docs/PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md
 * baris 388-395), sama seperti yang dipakai IkmService.mutuFromNilai di
 * backend, cuma huruf mutu (A/B/C/D) itu sendiri sudah dihitung backend, di
 * sini cuma tambah label deskriptifnya.
 *
 * CATATAN GAP: `trend` per unsur & `skmYearlyTrend` (tren multi-tahun) TIDAK
 * ADA sumber backend -- perlu data historis lintas periode yang belum
 * dibangun (Fase 3, INT-15, terblokir keputusan D5). Jangan dikarang di sini.
 * `skmDistribution` (sebaran skor tiap unsur per kategori nilai) juga tak
 * tersedia -- backend cuma simpan NRR rata-rata, bukan distribusi per nilai.
 */

export function adaptIkmMetrics(result) {
  return {
    ikm: {
      value: result.nilaiIkm,
      trend: null, // gap: butuh data historis, lihat catatan di atas
      status: null,
    },
    // Rata-rata SEMUA jawaban skala (1-4), BUKAN IKM (7 Oktober 2026). Tetap
    // terisi untuk survei tanpa 9 unsur baku, yang `ikm.value`-nya null. `?? null`:
    // respons dari backend lama tak membawa kuncinya, dan `undefined` yang lolos
    // akan menyeberang ke komponen sebagai nilai bertipe tak menentu.
    averageScore: {
      value: result.nilaiRataRata ?? null,
    },
    // Jenis survei dan NILAI SURVEI survei custom (8 Oktober 2026), diteruskan
    // apa adanya: layar analisis memakai `jenis` untuk memilih antara Nilai IKM
    // dan Nilai Survei, tanpa menghitung ulang. `jenis` tidak dikarang bila
    // backend lama belum mengirimnya.
    jenis: result.jenis,
    nilaiSurvei: result.nilaiSurvei ?? null,
    totalRespondents: {
      value: result.jumlahResponden,
      badge: null,
    },
    quality: {
      grade: result.mutu ? `${result.mutu} - ${IKM_MUTU_LABEL[result.mutu]}` : null,
    },
  };
}

/**
 * `sebaranSkor` backend (GET /surveys/:id/results, 8 Oktober 2026) -> bentuk
 * kartu Distribusi Skor: per pertanyaan skala, empat nilai berlabel beserta
 * persentasenya.
 *
 * `persen` EKSAK, tidak dibulatkan: ia menjadi lebar segmen bilah, dan tiga
 * segmen 1/3 yang dibulatkan berjumlah 99%. Pembulatan untuk teks dilakukan
 * komponennya. `total` 0 memberi persen 0, bukan NaN.
 *
 * `null`/`undefined` tetap `undefined`, BUKAN larik kosong: tampilan harus bisa
 * membedakan "backend belum mengirimnya" dari "survei ini tak punya pertanyaan
 * skala" (larik kosong dari backend).
 */
export function adaptSebaranSkor(sebaranSkor) {
  if (sebaranSkor == null) return undefined;
  return sebaranSkor.map((p) => ({
    id: p.pertanyaanId,
    kode: p.kodeUnsur ?? null,
    teks: p.teks,
    total: p.total,
    nilai: p.sebaran.map((s) => ({
      nilai: s.nilai,
      label: VALUE_LABEL[s.nilai] ?? `Nilai ${s.nilai}`,
      jumlah: s.jumlah,
      persen: p.total > 0 ? (s.jumlah / p.total) * 100 : 0,
    })),
  }));
}

export function adaptIkmServiceElements(nrrPerUnsur) {
  return nrrPerUnsur.map((u) => ({
    code: u.kodeUnsur,
    name: u.teks,
    nrr: u.nrr,
    weighted: u.nrrTertimbang,
    status: null, // gap: backend tak hitung mutu per-unsur, hanya per-survei
    trend: null, // gap: butuh data historis, lihat catatan di atas
  }));
}

/**
 * Terjemahkan IkmDashboardItemEntity (GET /dashboard/ikm, Admin Kabupaten) ke
 * bentuk yang dipakai IkmLeaderboard.jsx (opdId/opdName/ikmScore).
 */
export function adaptIkmDashboardItem(item) {
  return {
    peringkat: item.peringkat,
    opdId: item.opdId,
    opdName: item.opdNama,
    jenisLayanan: item.jenisLayanan,
    surveyId: item.surveyId,
    judul: item.judul,
    periode: formatPeriodeLabel(item.periode),
    ikmScore: item.nilaiIkm,
    mutu: item.mutu,
    jumlahResponden: item.jumlahResponden,
  };
}

export function adaptIkmDashboard(dashboard) {
  return {
    items: dashboard.items.map(adaptIkmDashboardItem),
    rataRataIkm: dashboard.rataRataIkm,
    totalOpd: dashboard.totalOpd,
    totalResponden: dashboard.totalResponden,
    // INT-13 (2026-08-05): dulu gap total, kini terisi dari GET /dashboard/ikm
    // yg diperluas. systemActivityPercent = definisi developer (D3, lihat
    // komentar backend DashboardService) -- proxy "% OPD aktif dgn survei
    // aktif saat ini", BUKAN metrik resmi Diskominfo.
    openComplaints: dashboard.openComplaints,
    newComplaints: dashboard.newComplaints,
    systemActivityPercent: dashboard.systemActivityPercent,
  };
}
