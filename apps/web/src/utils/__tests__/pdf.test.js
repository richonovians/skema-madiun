import { downloadTablePdf } from '../pdf';

/**
 * Pembuat PDF laporan tabel (daftar pengaduan & survei).
 *
 * Yang diuji bukan "PDF-nya jadi", melainkan letak garis pemisah barisnya.
 * Tinggi baris mengikuti kolom terpanjang -- judul pengaduan kerap membungkus
 * dua sampai tiga baris -- dan garis yang dihitung dari tinggi SATU baris akan
 * jatuh di tengah baris itu, mencoret teksnya.
 */
const panggilan = { line: [], text: [] };
/** Ukuran font isi tabel di pdf.js. */
const UKURAN_FONT = 9;

const dokumenPalsu = {
  internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  setFillColor: jest.fn(),
  setDrawColor: jest.fn(),
  rect: jest.fn(),
  addPage: jest.fn(),
  setPage: jest.fn(),
  getNumberOfPages: () => 1,
  save: jest.fn(),
  // Satu baris teks per 20 aksara: cukup untuk memaksa pembungkusan.
  splitTextToSize: (teks, lebar) => {
    const perBaris = Math.max(1, Math.floor(lebar / 6));
    const potongan = [];
    for (let i = 0; i < String(teks).length; i += perBaris) {
      potongan.push(String(teks).slice(i, i + perBaris));
    }
    return potongan.length ? potongan : [''];
  },
  // jsPDF menggambar array teks sebagai beberapa baris berjarak
  // fontSize * lineHeightFactor (baku 1.15). Doc palsu ini HARUS menirunya:
  // tanpa itu hanya baris pertama yang terekam, dan uji letak garis pemisah
  // lolos tanpa pernah memeriksa baris terbawah -- persis kesalahan yang
  // sempat terjadi saat berkas ini ditulis.
  text: jest.fn((isi, x, y) => {
    const baris = Array.isArray(isi) ? isi : [isi];
    baris.forEach((satu, i) => {
      panggilan.text.push({ isi: satu, x, y: y + i * UKURAN_FONT * 1.15 });
    });
  }),
  line: jest.fn((x1, y1, x2, y2) => panggilan.line.push({ x1, y1, x2, y2 })),
};

jest.mock('jspdf', () => ({ jsPDF: jest.fn(() => dokumenPalsu) }));

beforeEach(() => {
  panggilan.line = [];
  panggilan.text = [];
});

/** Posisi y teks isi tabel saja, tanpa nomor halaman di kaki halaman. */
const yBarisTabel = () =>
  panggilan.text.filter((t) => !String(t.isi).startsWith('Halaman')).map((t) => t.y);

const mendatar = () => panggilan.line.filter((g) => g.y1 === g.y2);
const tegak = () => panggilan.line.filter((g) => g.x1 === g.x2);

describe('downloadTablePdf', () => {
  const kolom = [
    { header: 'Tiket', width: 1 },
    { header: 'Judul', width: 4 },
  ];

  it('garis pemisah jatuh DI BAWAH baris terpanjang, bukan menembusnya', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Daftar Pengaduan',
      columns: kolom,
      rows: [
        [
          'PGD001',
          'Judul pengaduan yang sangat panjang sehingga terpaksa membungkus menjadi beberapa baris sekaligus',
        ],
      ],
    });

    // Nomor halaman dikecualikan: ia digambar di kaki halaman, jauh di bawah
    // seluruh isi tabel, sehingga ikut terhitung akan membuat uji ini selalu
    // gagal tanpa ada yang salah pada garisnya.
    const yTeksTerbawah = Math.max(...yBarisTabel());
    const garis = mendatar().at(-1);

    expect(garis.y1).toBeGreaterThan(yTeksTerbawah);
  });

  it('baris pendek pun garisnya tetap di bawah teksnya (kontrol)', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Daftar Pengaduan',
      columns: kolom,
      rows: [['PGD002', 'Singkat']],
    });

    expect(mendatar().at(-1).y1).toBeGreaterThan(Math.max(...yBarisTabel()));
  });

  it('menggambar garis tegak pada tiap batas kolom, termasuk kedua tepi luar', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Daftar Pengaduan',
      columns: kolom,
      rows: [['PGD001', 'Singkat'], ['PGD002', 'Singkat juga']],
    });

    // 2 kolom -> 3 batas: tepi kiri, satu pemisah, tepi kanan.
    const x = [...new Set(tegak().map((g) => g.x1))];
    expect(x).toHaveLength(kolom.length + 1);
  });

  it('menutup tiap baris dengan garis mendatar, ditambah batas atas dan pemisah kepala', async () => {
    const baris = [['PGD001', 'Singkat'], ['PGD002', 'Singkat juga']];

    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Daftar Pengaduan',
      columns: kolom,
      rows: baris,
    });

    expect(mendatar()).toHaveLength(2 + baris.length);
  });

  it('garis tegak membentang dari batas atas tabel sampai garis mendatar terbawah', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Daftar Pengaduan',
      columns: kolom,
      rows: [['PGD001', 'Singkat'], ['PGD002', 'Singkat juga']],
    });

    const y = mendatar().map((g) => g.y1);
    const atas = Math.min(...y);
    const bawah = Math.max(...y);
    // Tanpa penjagaan ini, tabel tanpa garis tegak sama sekali akan LOLOS:
    // perulangan di bawah tak pernah berjalan, dan uji ini jadi hampa.
    expect(tegak().length).toBeGreaterThan(0);
    for (const g of tegak()) {
      expect(Math.min(g.y1, g.y2)).toBe(atas);
      expect(Math.max(g.y1, g.y2)).toBe(bawah);
    }
  });
});
