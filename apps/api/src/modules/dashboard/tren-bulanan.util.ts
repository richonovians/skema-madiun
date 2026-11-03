import { PeriodePointEntity } from './entities/statistics.entity';

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
 * yang membagi deret triwulan.
 */
export function trenBulanan(tanggal: Date[], sekarang: Date): PeriodePointEntity[] {
  if (tanggal.length === 0) return [];

  const indeksBulan = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const hitungan = new Map<number, number>();
  let awal = Infinity;
  for (const d of tanggal) {
    const i = indeksBulan(d);
    hitungan.set(i, (hitungan.get(i) ?? 0) + 1);
    if (i < awal) awal = i;
  }
  const akhir = Math.max(indeksBulan(sekarang), ...hitungan.keys());

  const deret: PeriodePointEntity[] = [];
  for (let i = awal; i <= akhir; i++) {
    const tahun = Math.floor(i / 12);
    const bulan = String((i % 12) + 1).padStart(2, '0');
    deret.push(
      new PeriodePointEntity({ periode: `${tahun}-${bulan}`, value: hitungan.get(i) ?? 0 }),
    );
  }
  return deret;
}
