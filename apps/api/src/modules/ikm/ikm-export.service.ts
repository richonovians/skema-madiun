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

    sheet.addRow(['Survei', surveyJudul]);
    sheet.addRow(['OPD', opdNama]);
    sheet.addRow(['Periode', result.periode]);
    sheet.addRow(['Jumlah Responden', result.jumlahResponden]);
    sheet.addRow(['Nilai IKM', result.nilaiIkm ?? 'Belum dapat dinilai']);
    sheet.addRow(['Mutu', result.mutu ?? '-']);
    sheet.addRow([]);

    const headerRow = sheet.addRow([
      'Kode Unsur',
      'Deskripsi Unsur',
      'NRR',
      'Bobot',
      'NRR Tertimbang',
    ]);
    headerRow.font = { bold: true };
    for (const u of result.nrrPerUnsur) {
      sheet.addRow([u.kodeUnsur, u.teks, u.nrr, u.bobot, u.nrrTertimbang]);
    }
    sheet.columns.forEach((col) => {
      col.width = 24;
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  toPdf(ctx: ExportContext): Promise<Buffer> {
    const { surveyJudul, opdNama, result } = ctx;
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Laporan Hasil IKM', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Survei: ${surveyJudul}`);
      doc.text(`OPD: ${opdNama}`);
      doc.text(`Periode: ${result.periode}`);
      doc.text(`Jumlah Responden: ${result.jumlahResponden}`);
      doc.text(`Nilai IKM: ${result.nilaiIkm ?? 'Belum dapat dinilai'}`);
      doc.text(`Mutu: ${result.mutu ?? '-'}`);
      doc.moveDown();

      if (result.nrrPerUnsur.length > 0) {
        doc.fontSize(12).text('Rincian per Unsur', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        for (const u of result.nrrPerUnsur) {
          doc.text(
            `${u.kodeUnsur} — ${u.teks}: NRR=${u.nrr}, Bobot=${u.bobot}, NRR Tertimbang=${u.nrrTertimbang}`,
          );
        }
      }

      doc.end();
    });
  }
}
