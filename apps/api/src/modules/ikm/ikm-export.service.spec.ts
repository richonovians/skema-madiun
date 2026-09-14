import ExcelJS from 'exceljs';
import { IkmMutu } from '@prisma/client';
import { IkmExportService, barisUnsurPdf, KOLOM_PDF, LEBAR_ISI_A4 } from './ikm-export.service';

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
      // Baris 1 kini judul laporan; blok keterangan mulai baris 2.
      expect(sheet?.getRow(1).getCell(1).value).toBe('Laporan Hasil IKM');
      expect(sheet?.getRow(2).getCell(2).value).toBe('Survei A');
    });
  });

  /**
   * Bentuk berkasnya, bukan sekadar "dapat dibuka". Hasil ekspor ini dibaca
   * petugas di layar dan di kertas; tiga hal di bawah yang menentukan terbaca
   * atau tidaknya, dan ketiganya dapat diperiksa langsung dari berkasnya.
   */
  describe('toExcel — bentuk yang terbaca', () => {
    const bukaSheet = async (over: Record<string, unknown> = {}) => {
      const buffer = await service.toExcel({
        surveyJudul: 'Survei A',
        opdNama: 'Dinas X',
        result: result(over) as never,
      });
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as never);
      return wb.getWorksheet('Hasil IKM')!;
    };

    it('kolom uraian unsur jauh lebih lebar daripada kolom angka', async () => {
      // Teks unsur adalah kalimat resmi PermenPANRB, bukan satu dua kata.
      // Dengan lebar seragam ia terpotong, sementara kolom angka menganggur.
      const sheet = await bukaSheet();

      const uraian = sheet.getColumn(2).width ?? 0;
      const angka = sheet.getColumn(3).width ?? 0;
      expect(uraian).toBeGreaterThan(angka * 2);
    });

    it('baris kepala tabel dibekukan, agar tetap terlihat saat digulir', async () => {
      const sheet = await bukaSheet();

      //  bertipe gabungan; hanya ragam beku yang punya ySplit.
      const tampilan = sheet.views?.[0] as { state?: string; ySplit?: number } | undefined;
      expect(tampilan?.state).toBe('frozen');
      expect(tampilan?.ySplit).toBeGreaterThan(0);
    });

    it('angka pecahan dibatasi dua desimal, bukan ekor panjang pembagian', async () => {
      // NRR lahir dari pembagian: 19/6 tersimpan sebagai 3.1666666666666665.
      // Nilainya tetap utuh di sel; yang diatur hanya cara menampilkannya.
      const sheet = await bukaSheet({
        nrrPerUnsur: [
          { kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 19 / 6, bobot: 0.111, nrrTertimbang: 0.351 },
        ],
      });

      const barisUnsur = sheet.lastRow!;
      expect(barisUnsur.getCell(3).numFmt).toBe('0.00');
      expect(barisUnsur.getCell(3).value).toBeCloseTo(3.1666, 3);
    });

    it('label keterangan ditebalkan, sehingga blok atas terbaca sebagai pasangan label-nilai', async () => {
      const sheet = await bukaSheet();

      const labelSurvei = sheet.getRow(2).getCell(1);
      expect(labelSurvei.value).toBe('Survei');
      expect(labelSurvei.font?.bold).toBe(true);
      expect(sheet.getRow(2).getCell(2).font?.bold).toBeFalsy();
    });
  });

  describe('barisUnsurPdf', () => {
    it('membulatkan dua desimal dengan koma, dan menjaga urutan kolomnya', () => {
      // NRR lahir dari pembagian: tanpa pembulatan, 19/6 tercetak sebagai
      // 3.1666666666666665 di tengah tabel.
      expect(
        barisUnsurPdf([
          { kodeUnsur: 'U1', teks: 'Persyaratan', nrr: 19 / 6, bobot: 0.111, nrrTertimbang: 0.351 },
        ] as never),
      ).toEqual([['U1', 'Persyaratan', '3,17', '0,11', '0,35']]);
    });
  });

  describe('lebar tabel PDF', () => {
    it('seluruh kolom muat dalam lebar halaman, tanpa ada yang terdorong keluar', () => {
      // Kolom digambar pada jarak tetap yang bertambah ke kanan; satu kolom
      // yang dilebarkan tanpa memperhitungkan sisanya akan mendorong kolom
      // terakhir keluar halaman, dan itu tak terlihat dari uji isi mana pun.
      const total = KOLOM_PDF.reduce((jumlah, kolom) => jumlah + kolom.lebar, 0);

      expect(total).toBeLessThanOrEqual(LEBAR_ISI_A4);
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
