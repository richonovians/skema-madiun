import ExcelJS from 'exceljs';
import { IkmMutu } from '@prisma/client';
import { IkmExportService } from './ikm-export.service';

const result = (over: Record<string, unknown> = {}) => ({
  surveyId: 1,
  periode: '2026',
  jumlahResponden: 2,
  nrrPerUnsur: [{ kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 4, bobot: 1, nrrTertimbang: 4 }],
  nilaiIkm: 100,
  mutu: IkmMutu.A,
  dihitungPada: new Date(),
  ...over,
});

describe('IkmExportService', () => {
  const service = new IkmExportService();

  describe('buildFilename', () => {
    it('sanitasi periode & memilih ekstensi sesuai format', () => {
      expect(service.buildFilename(1, '2026/Q1', 'csv')).toBe('hasil-ikm-1-2026_Q1.csv');
      expect(service.buildFilename(1, '2026', 'excel')).toBe('hasil-ikm-1-2026.xlsx');
      expect(service.buildFilename(1, '2026', 'pdf')).toBe('hasil-ikm-1-2026.pdf');
    });
  });

  describe('toCsv', () => {
    it('menghasilkan CSV berisi data survei & baris unsur', () => {
      const buffer = service.toCsv({
        surveyJudul: 'Survei A',
        opdNama: 'Dinas X',
        result: result() as never,
      });
      const csv = buffer.toString('utf-8');
      expect(csv).toContain('Survei A');
      expect(csv).toContain('Dinas X');
      expect(csv).toContain('Nilai IKM,100');
      expect(csv).toContain('U1,Persyaratan,4,1,4');
    });

    it('nilaiIkm null → menampilkan "Belum dapat dinilai"', () => {
      const buffer = service.toCsv({
        surveyJudul: 'Survei A',
        opdNama: 'Dinas X',
        result: result({ nilaiIkm: null, mutu: null, nrrPerUnsur: [] }) as never,
      });
      expect(buffer.toString('utf-8')).toContain('Belum dapat dinilai');
    });

    it('nilai dengan koma di-escape dengan tanda kutip', () => {
      const buffer = service.toCsv({
        surveyJudul: 'Survei, dengan koma',
        opdNama: 'Dinas X',
        result: result() as never,
      });
      expect(buffer.toString('utf-8')).toContain('"Survei, dengan koma"');
    });
  });

  describe('toExcel', () => {
    it('menghasilkan berkas xlsx valid yang dapat dibaca ulang', async () => {
      const buffer = await service.toExcel({
        surveyJudul: 'Survei A',
        opdNama: 'Dinas X',
        result: result() as never,
      });
      expect(buffer.subarray(0, 2).toString()).toBe('PK'); // magic bytes zip (xlsx)

      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interop: exceljs types predate Buffer<T> generik di @types/node terbaru
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.getWorksheet('Hasil IKM');
      expect(sheet).toBeDefined();
      expect(sheet?.getRow(1).getCell(2).value).toBe('Survei A');
    });
  });

  describe('toPdf', () => {
    it('menghasilkan berkas PDF valid (magic bytes %PDF)', async () => {
      const buffer = await service.toPdf({
        surveyJudul: 'Survei A',
        opdNama: 'Dinas X',
        result: result() as never,
      });
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });
});
