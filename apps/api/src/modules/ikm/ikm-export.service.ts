import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { IkmResultEntity } from './entities/ikm-result.entity';

export interface ExportedFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

interface ExportContext {
  surveyJudul: string;
  opdNama: string;
  result: IkmResultEntity;
}

export const EXPORT_CONTENT_TYPES = {
  csv: 'text/csv; charset=utf-8',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

const EXTENSIONS = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' } as const;

/**
 * Dua desimal, dengan koma sebagai pemisah desimal (kebiasaan baca Indonesia).
 *
 * HANYA untuk PDF. CSV sengaja tetap membawa angka mentah: ia format
 * pertukaran data yang lazim dihitung ulang, dan pembulatan di sana
 * menghilangkan ketelitian tanpa diminta. Excel pun menyimpan angka utuh dan
 * hanya mengatur cara menampilkannya (numFmt), bukan nilainya.
 */
function angkaPdf(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined) return '-';
  return nilai.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format dua desimal untuk sel angka Excel; nilainya sendiri tetap utuh. */
const FORMAT_DUA_DESIMAL = '0.00';

/** Lebar kolom tabel PDF (A4 tegak, margin 50 -> ruang isi 495pt). */
export const KOLOM_PDF = [
  { judul: 'Kode', lebar: 45, kanan: false },
  { judul: 'Unsur', lebar: 250, kanan: false },
  { judul: 'NRR', lebar: 60, kanan: true },
  { judul: 'Bobot', lebar: 60, kanan: true },
  { judul: 'NRR Tertimbang', lebar: 80, kanan: true },
] as const;

/** Lebar isi A4 tegak dengan margin 50pt di kedua sisi. */
export const LEBAR_ISI_A4 = 595.28 - 50 * 2;

/**
 * Isi tabel unsur untuk PDF, sudah dalam bentuk teks siap gambar.
 *
 * Dipisahkan dari penggambarannya supaya urutan kolom dan pembulatan angkanya
 * dapat diperiksa uji tanpa perlu membongkar berkas PDF.
 */
export function barisUnsurPdf(unsur: IkmResultEntity['nrrPerUnsur']): string[][] {
  return unsur.map((u) => [
    u.kodeUnsur,
    u.teks,
    angkaPdf(u.nrr),
    angkaPdf(u.bobot),
    angkaPdf(u.nrrTertimbang),
  ]);
}

/** Jarak teks ke garis sel, kiri dan kanan. */
export const PADDING_SEL = 4;

/** Lebar kolom label pada blok keterangan, berhenti sebelum kolom titik dua. */
const LEBAR_LABEL = 125;

/** Sumbu x titik dua, relatif tepi kiri. Tetap, supaya semuanya sejajar. */
const GESER_TITIK_DUA = 130;

/** Sumbu x nilai keterangan, relatif tepi kiri. */
const GESER_NILAI = 140;

/**
 * Bagian PDFKit yang dipakai penggambar di bawah.
 *
 * Dideklarasikan sebagai bentuk, bukan tipe PDFKit, supaya penggambarnya dapat
 * diuji dengan doc tiruan. Memeriksa letak garis dengan membongkar berkas PDF
 * jauh lebih rapuh daripada mencatat panggilannya.
 */
export interface DokumenPdf {
  y: number;
  font(nama: string): DokumenPdf;
  fontSize(ukuran: number): DokumenPdf;
  text(teks: string, x: number, y: number, opsi?: { width?: number; align?: string }): DokumenPdf;
  moveDown(baris?: number): DokumenPdf;
  heightOfString(teks: string, opsi?: { width?: number }): number;
  moveTo(x: number, y: number): DokumenPdf;
  lineTo(x: number, y: number): DokumenPdf;
  lineWidth(lebar: number): DokumenPdf;
  stroke(): DokumenPdf;
  addPage(): DokumenPdf;
}

/**
 * Blok keterangan sebagai tiga kolom tetap: label, titik dua, nilai.
 *
 * Titik dua sengaja digambar terpisah dan bukan disambung ke labelnya. Kalau
 * disambung, letaknya ikut panjang label, sehingga "Survei:" dan
 * "Jumlah Responden:" berakhir di tempat berbeda dan kolomnya bergerigi.
 */
export function gambarKeterangan(
  doc: DokumenPdf,
  keterangan: [string, string][],
  kiri: number,
): void {
  doc.fontSize(10);
  for (const [label, nilai] of keterangan) {
    const y = doc.y;
    doc.font('Helvetica-Bold').text(label, kiri, y, { width: LEBAR_LABEL });
    doc.font('Helvetica-Bold').text(':', kiri + GESER_TITIK_DUA, y, { width: 6 });
    doc.font('Helvetica').text(nilai, kiri + GESER_NILAI, y, {
      width: LEBAR_ISI_A4 - GESER_NILAI,
    });
    doc.moveDown(0.35);
  }
}

/**
 * Tabel unsur berkisi penuh.
 *
 * Garis tegaknya perlu karena tiga kolom angka berdampingan sama-sama rata
 * kanan; tanpa pemisah, nilai NRR, Bobot, dan NRR Tertimbang mudah tertukar
 * saat dibaca cepat. Garis tegak digambar sekali per potongan halaman, bukan
 * per baris, supaya baris yang uraiannya membungkus tidak menghasilkan garis
 * bertumpuk.
 */
export function gambarTabelUnsur(
  doc: DokumenPdf,
  baris: string[][],
  { kiri, batasBawah }: { kiri: number; batasBawah: number },
): void {
  const batasKolom = [kiri];
  for (const kolom of KOLOM_PDF) {
    batasKolom.push(batasKolom[batasKolom.length - 1] + kolom.lebar);
  }
  const kanan = batasKolom[batasKolom.length - 1];

  let atasPotongan = doc.y;

  const mendatar = (y: number) => {
    doc.moveTo(kiri, y).lineTo(kanan, y).lineWidth(0.7).stroke();
  };

  const tutupPotongan = (bawah: number) => {
    for (const x of batasKolom) {
      doc.moveTo(x, atasPotongan).lineTo(x, bawah).lineWidth(0.7).stroke();
    }
  };

  const selBaris = (isi: string[], atas: number) => {
    let bawah = atas + PADDING_SEL;
    isi.forEach((teks, i) => {
      doc.text(teks, batasKolom[i] + PADDING_SEL, atas + PADDING_SEL, {
        width: KOLOM_PDF[i].lebar - PADDING_SEL * 2,
        align: KOLOM_PDF[i].kanan ? 'right' : 'left',
      });
      bawah = Math.max(bawah, doc.y);
    });
    return bawah + PADDING_SEL;
  };

  const gambarKepala = () => {
    atasPotongan = doc.y;
    mendatar(atasPotongan);
    doc.font('Helvetica-Bold').fontSize(9);
    doc.y = selBaris(
      KOLOM_PDF.map((k) => k.judul),
      atasPotongan,
    );
    mendatar(doc.y);
  };

  gambarKepala();
  doc.font('Helvetica').fontSize(9);
  for (const isi of baris) {
    const tinggi =
      doc.heightOfString(isi[1], { width: KOLOM_PDF[1].lebar - PADDING_SEL * 2 }) + PADDING_SEL * 2;
    if (doc.y + tinggi > batasBawah) {
      tutupPotongan(doc.y);
      doc.addPage();
      gambarKepala();
      doc.font('Helvetica').fontSize(9);
    }
    doc.y = selBaris(isi, doc.y);
    mendatar(doc.y);
  }
  tutupPotongan(doc.y);
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Membangun berkas laporan hasil IKM (CSV/Excel/PDF) dari data yang sama dengan
 * `GET /surveys/:id/results` — dipisah dari IkmService agar rumus IKM tetap
 * menjadi satu-satunya tanggung jawab layanan itu (rendering ≠ perhitungan).
 */
@Injectable()
export class IkmExportService {
  buildFilename(surveyId: number, periode: string, format: keyof typeof EXTENSIONS): string {
    const safePeriode = periode.replace(/[^a-zA-Z0-9-]/g, '_');
    return `hasil-ikm-${surveyId}-${safePeriode}.${EXTENSIONS[format]}`;
  }

  toCsv(ctx: ExportContext): Buffer {
    const { surveyJudul, opdNama, result } = ctx;
    const rows: (string | number)[][] = [
      ['Laporan Hasil IKM'],
      ['Survei', surveyJudul],
      ['OPD', opdNama],
      ['Periode', result.periode],
      ['Jumlah Responden', result.jumlahResponden],
      ['Nilai IKM', result.nilaiIkm ?? 'Belum dapat dinilai'],
      ['Mutu', result.mutu ?? '-'],
      [],
      ['Kode Unsur', 'Deskripsi Unsur', 'NRR', 'Bobot', 'NRR Tertimbang'],
      ...result.nrrPerUnsur.map((u) => [u.kodeUnsur, u.teks, u.nrr, u.bobot, u.nrrTertimbang]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
    // BOM UTF-8 (\uFEFF) agar Excel mengenali encoding dengan benar saat CSV dibuka langsung.
    return Buffer.from('\uFEFF' + csv, 'utf-8');
  }

  async toExcel(ctx: ExportContext): Promise<Buffer> {
    const { surveyJudul, opdNama, result } = ctx;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hasil IKM');

    // Lebar kolom ditetapkan SEBELUM baris diisi. Teks unsur adalah kalimat
    // resmi PermenPANRB, bukan satu dua kata; dengan lebar seragam ia terpotong
    // sementara kolom angka menganggur lebar.
    sheet.columns = [{ width: 18 }, { width: 58 }, { width: 12 }, { width: 12 }, { width: 16 }];

    const judul = sheet.addRow(['Laporan Hasil IKM']);
    judul.font = { bold: true, size: 14 };

    const keterangan: [string, string | number][] = [
      ['Survei', surveyJudul],
      ['OPD', opdNama],
      ['Periode', result.periode],
      ['Jumlah Responden', result.jumlahResponden],
      ['Nilai IKM', result.nilaiIkm ?? 'Belum dapat dinilai'],
      ['Mutu', result.mutu ?? '-'],
    ];
    for (const [label, nilai] of keterangan) {
      const baris = sheet.addRow([label, nilai]);
      // Hanya labelnya yang ditebalkan: itu yang membuat blok ini terbaca
      // sebagai pasangan label-nilai, bukan sebagai dua kolom data.
      baris.getCell(1).font = { bold: true };
      if (typeof nilai === 'number' && label === 'Nilai IKM') {
        baris.getCell(2).numFmt = FORMAT_DUA_DESIMAL;
      }
    }
    sheet.addRow([]);

    const headerRow = sheet.addRow([
      'Kode Unsur',
      'Deskripsi Unsur',
      'NRR',
      'Bobot',
      'NRR Tertimbang',
    ]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    for (const u of result.nrrPerUnsur) {
      const baris = sheet.addRow([u.kodeUnsur, u.teks, u.nrr, u.bobot, u.nrrTertimbang]);
      // Kalimat unsur dibiarkan membungkus ke bawah, bukan terpotong.
      baris.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      for (const kolom of [3, 4, 5]) {
        baris.getCell(kolom).numFmt = FORMAT_DUA_DESIMAL;
        baris.getCell(kolom).alignment = { horizontal: 'right' };
      }
    }

    // Baris kepala tabel dibekukan: tanpa ini, menggulir daftar unsur membuat
    // pembacanya lupa kolom mana yang sedang dilihat.
    sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  toPdf(ctx: ExportContext): Promise<Buffer> {
    const { surveyJudul, opdNama, result } = ctx;
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const KIRI = doc.page.margins.left;
      const BATAS_BAWAH = doc.page.height - doc.page.margins.bottom - 30;

      doc.font('Helvetica-Bold').fontSize(16).text('Laporan Hasil IKM', { align: 'center' });
      doc.moveDown(1);

      // Keterangan sebagai pasangan label-nilai pada dua kolom tetap. Sebelumnya
      // "Label: nilai" menyatu dalam satu baris teks, sehingga nilainya mulai di
      // tempat berbeda-beda dan tak dapat ditelusuri ke bawah dengan mata.
      const keterangan: [string, string][] = [
        ['Survei', surveyJudul],
        ['OPD', opdNama],
        ['Periode', result.periode],
        ['Jumlah Responden', String(result.jumlahResponden)],
        ['Nilai IKM', result.nilaiIkm === null ? 'Belum dapat dinilai' : angkaPdf(result.nilaiIkm)],
        ['Mutu', result.mutu ?? '-'],
      ];
      gambarKeterangan(doc as unknown as DokumenPdf, keterangan, KIRI);

      if (result.nrrPerUnsur.length > 0) {
        doc.moveDown(1);
        doc.font('Helvetica-Bold').fontSize(12).text('Rincian per Unsur', KIRI, doc.y);
        doc.moveDown(0.6);
        gambarTabelUnsur(doc as unknown as DokumenPdf, barisUnsurPdf(result.nrrPerUnsur), {
          kiri: KIRI,
          batasBawah: BATAS_BAWAH,
        });
      }

      doc.end();
    });
  }
}
