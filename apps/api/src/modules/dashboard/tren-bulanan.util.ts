import { buildPeriode } from '../surveys/utils/periode.util';
import { PeriodePointEntity } from './entities/statistics.entity';

/**
 * Jumlah pengaduan dalam satu bulan kalender, `bulan` berformat "YYYY-MM".
 *
 * Dihitung Postgres, bukan Node (BUG-068, 13 November 2026): sebelumnya
 * seluruh baris `complaints` dimuat ke memori hanya untuk dihitung di sini,
 * dan permintaan pertama `GET /statistics` mencapai 4,6 detik pada 310.000
 * pengaduan. Kini yang menyeberang paling banyak satu baris per bulan.
 */
export interface HitunganBulan {
  bulan: string;
  jumlah: number;
}

const indeksDariBulan = (bulan: string): number => {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  return tahun * 12 + (nomorBulan - 1);
};

/**
 * Jumlah kejadian per bulan kalender, `periode` berformat "YYYY-MM"
 * (2 November 2026, tren pengaduan halaman statistik publik).
 *
 * Deretnya UTUH sejak bulan kejadian pertama sampai bulan `sekarang`, dan
 * bulan tanpa kejadian bernilai 0. Dua alasan:
 *   - bulan yang dilewati membuat grafik garis menarik garis lurus melintasi
 *     bulan kosong, seolah ada pengaduan di sana;
 *   - tampilan Tahunan dijumlahkan frontend dari deret ini, jadi memotongnya
 *     ke dua belas bulan terakhir akan membuat angka tahunan kurang.
 *
 * Bulan ditentukan menurut zona waktu server, sama dengan `periodeFromDate`
 * yang membagi deret triwulan. Karena pembagiannya kini dikerjakan Postgres,
 * zona itu dikirim ke kuerinya -- lihat `DashboardService.agregatPengaduanBulanan`.
 */
export function trenBulanan(hitungan: HitunganBulan[], sekarang: Date): PeriodePointEntity[] {
  if (hitungan.length === 0) return [];

  const perIndeks = new Map<number, number>();
  let awal = Infinity;
  for (const { bulan, jumlah } of hitungan) {
    const i = indeksDariBulan(bulan);
    perIndeks.set(i, (perIndeks.get(i) ?? 0) + jumlah);
    if (i < awal) awal = i;
  }
  const akhir = Math.max(sekarang.getFullYear() * 12 + sekarang.getMonth(), ...perIndeks.keys());

  const deret: PeriodePointEntity[] = [];
  for (let i = awal; i <= akhir; i++) {
    const tahun = Math.floor(i / 12);
    const bulan = String((i % 12) + 1).padStart(2, '0');
    deret.push(
      new PeriodePointEntity({ periode: `${tahun}-${bulan}`, value: perIndeks.get(i) ?? 0 }),
    );
  }
  return deret;
}

/**
 * Jumlah pengaduan per triwulan ("YYYY-Qn"), dijumlahkan dari hitungan bulanan.
 *
 * Berbeda dengan `trenBulanan`, triwulan tanpa pengaduan TIDAK diisi 0: bentuk
 * ini mempertahankan keluaran lama (`bucketByPeriode` hanya membuat ember untuk
 * periode yang punya baris), yang sudah dipakai halaman statistik.
 */
export function trenTriwulan(hitungan: HitunganBulan[]): PeriodePointEntity[] {
  const perPeriode = new Map<string, number>();
  for (const { bulan, jumlah } of hitungan) {
    const [tahun, nomorBulan] = bulan.split('-').map(Number);
    const triwulan = (Math.floor((nomorBulan - 1) / 3) + 1) as 1 | 2 | 3 | 4;
    const periode = buildPeriode(tahun, triwulan);
    perPeriode.set(periode, (perPeriode.get(periode) ?? 0) + jumlah);
  }
  return Array.from(perPeriode.entries())
    .map(([periode, value]) => new PeriodePointEntity({ periode, value }))
    .sort((a, b) => a.periode.localeCompare(b.periode));
}
