import { jsPDF } from 'jspdf';
import { PADDING_SEL_TABEL } from '../pdf';
import {
  KOLOM_DAFTAR_PENGADUAN,
  KOLOM_LAPORAN_RINGKAS,
  KOLOM_MONITORING_PENGADUAN,
  KOLOM_MONITORING_SURVEI,
  KOLOM_SURVEI_OPD,
} from '../pdfKolom';

/**
 * Sel data dibungkus lewat splitTextToSize, tetapi kepala kolom digambar dalam
 * satu baris. Kepala yang lebih lebar daripada kolomnya karena itu MELIMPAH ke
 * kolom sebelahnya alih-alih terpotong -- terlihat pada ekspor 13 September 2026,
 * ketika "Responden" menempel ke "Nilai IKM".
 *
 * Uji sebelumnya hanya mengukur sel DATA, sehingga cacat ini lewat tanpa
 * tertangkap. Yang di bawah memeriksa SETIAP kepala pada SETIAP susunan kolom
 * sekaligus, sehingga susunan baru pun ikut terjaga.
 */
const LEBAR_ISI_TEGAK = 595.28 - 40 * 2;
const LEBAR_ISI_MENDATAR = 841.89 - 40 * 2;

const susunan = [
  ['KOLOM_DAFTAR_PENGADUAN', KOLOM_DAFTAR_PENGADUAN, LEBAR_ISI_TEGAK],
  ['KOLOM_MONITORING_PENGADUAN', KOLOM_MONITORING_PENGADUAN, LEBAR_ISI_MENDATAR],
  ['KOLOM_MONITORING_SURVEI', KOLOM_MONITORING_SURVEI, LEBAR_ISI_TEGAK],
  ['KOLOM_SURVEI_OPD', KOLOM_SURVEI_OPD, LEBAR_ISI_TEGAK],
  ['KOLOM_LAPORAN_RINGKAS', KOLOM_LAPORAN_RINGKAS, 320],
];

describe.each(susunan)('kepala kolom %s', (_nama, kolom, lebarIsi) => {
  it('setiap kepala muat di dalam kolomnya sendiri', () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    // Kepala digambar tebal 9pt; ukurannya harus diambil dengan fon yang sama.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    const totalBobot = kolom.reduce((jml, k) => jml + k.width, 0);
    const melimpah = kolom
      .map((k) => {
        const tersedia = (k.width / totalBobot) * lebarIsi - PADDING_SEL_TABEL * 2;
        return { header: k.header, tersedia, dibutuhkan: doc.getTextWidth(k.header) };
      })
      .filter((k) => k.dibutuhkan > k.tersedia);

    expect(melimpah).toEqual([]);
  });
});
