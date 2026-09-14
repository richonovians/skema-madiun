import { gambarKeterangan, gambarTabelUnsur, KOLOM_PDF, PADDING_SEL } from './ikm-export.service';

type Tulisan = { teks: string; x: number; y: number; lebar?: number; align?: string };
type Garis = { x1: number; y1: number; x2: number; y2: number };

/**
 * Doc tiruan sebatas yang dipakai penggambar: cukup untuk memeriksa KOORDINAT,
 * bukan untuk menghasilkan PDF. Dibuat karena membongkar berkas PDF sungguhan
 * demi memastikan letak sebuah garis jauh lebih rapuh daripada mencatat
 * panggilannya.
 *
 * Pembungkusan teks ikut dimodelkan. Tanpa itu tinggi baris selalu satu baris,
 * dan uji apa pun tentang baris yang membungkus akan lulus tanpa pernah
 * benar-benar diuji.
 */
function docPalsu() {
  const TINGGI_BARIS = 11;
  const tulisan: Tulisan[] = [];
  const garis: Garis[] = [];
  let pena: { x: number; y: number } | null = null;

  const hitungTinggi = (teks: string, lebar: number) => {
    const muat = Math.max(1, Math.floor(lebar / 5));
    return Math.max(1, Math.ceil(teks.length / muat)) * TINGGI_BARIS;
  };

  const doc = {
    y: 100,
    jumlahHalaman: 1,
    tulisan,
    garis,
    font: () => doc,
    fontSize: () => doc,
    lineWidth: () => doc,
    stroke: () => doc,
    text(teks: string, x: number, y: number, o: { width?: number; align?: string } = {}) {
      tulisan.push({ teks, x, y, lebar: o.width, align: o.align });
      doc.y = y + hitungTinggi(teks, o.width ?? 100);
      return doc;
    },
    moveDown(n = 1) {
      doc.y += TINGGI_BARIS * n;
      return doc;
    },
    heightOfString(teks: string, o: { width?: number } = {}) {
      return hitungTinggi(teks, o.width ?? 100);
    },
    moveTo(x: number, y: number) {
      pena = { x, y };
      return doc;
    },
    lineTo(x: number, y: number) {
      if (pena) garis.push({ x1: pena.x, y1: pena.y, x2: x, y2: y });
      pena = { x, y };
      return doc;
    },
    addPage() {
      doc.jumlahHalaman += 1;
      doc.y = 50;
      return doc;
    },
  };
  return doc;
}

const KIRI = 50;
const BATAS_BAWAH = 760;

const KETERANGAN: [string, string][] = [
  ['Survei', 'Survei Kepuasan Masyarakat'],
  ['OPD', 'Dinas Kesehatan'],
  ['Periode', '2026-Q3'],
  ['Jumlah Responden', '128'],
  ['Nilai IKM', '82,44'],
  ['Mutu', 'B'],
];

const duaBaris = [
  ['U1', 'Persyaratan', '3,17', '0,11', '0,35'],
  ['U2', 'Kemudahan prosedur', '3,42', '0,11', '0,38'],
];

const mendatar = (g: Garis[]) => g.filter((x) => x.y1 === x.y2);
const tegak = (g: Garis[]) => g.filter((x) => x.x1 === x.x2);

describe('gambarKeterangan', () => {
  it('menggambar titik dua sejajar pada satu sumbu x untuk setiap label', () => {
    const doc = docPalsu();

    gambarKeterangan(doc, KETERANGAN, KIRI);

    const titikDua = doc.tulisan.filter((t) => t.teks === ':');
    expect(titikDua).toHaveLength(KETERANGAN.length);
    expect(new Set(titikDua.map((t) => t.x)).size).toBe(1);
  });

  it('menempatkan nilai di kanan titik dua, bukan menimpanya', () => {
    const doc = docPalsu();

    gambarKeterangan(doc, KETERANGAN, KIRI);

    const xTitikDua = doc.tulisan.find((t) => t.teks === ':')!.x;
    const xNilai = doc.tulisan.find((t) => t.teks === '128')!.x;
    expect(xNilai).toBeGreaterThan(xTitikDua);
  });

  it('label berhenti sebelum titik dua, sehingga label panjang tidak menabraknya', () => {
    const doc = docPalsu();

    gambarKeterangan(doc, KETERANGAN, KIRI);

    const label = doc.tulisan.find((t) => t.teks === 'Jumlah Responden')!;
    const xTitikDua = doc.tulisan.find((t) => t.teks === ':')!.x;
    expect(label.x + label.lebar!).toBeLessThanOrEqual(xTitikDua);
  });
});

describe('gambarTabelUnsur', () => {
  it('menutup tiap baris dengan garis mendatar, ditambah batas atas dan bawah kepala', () => {
    const doc = docPalsu();

    gambarTabelUnsur(doc, duaBaris, { kiri: KIRI, batasBawah: BATAS_BAWAH });

    // 1 batas atas + 1 pemisah kepala + 1 per baris isi.
    expect(mendatar(doc.garis)).toHaveLength(2 + duaBaris.length);
  });

  it('menggambar garis tegak pada tiap batas kolom, termasuk kedua tepi luar', () => {
    const doc = docPalsu();

    gambarTabelUnsur(doc, duaBaris, { kiri: KIRI, batasBawah: BATAS_BAWAH });

    const x = tegak(doc.garis).map((g) => g.x1);
    let batas = KIRI;
    const diharapkan = [batas, ...KOLOM_PDF.map((k) => (batas += k.lebar))];
    expect([...new Set(x)].sort((a, b) => a - b)).toEqual(diharapkan);
  });

  it('garis tegak membentang dari batas atas sampai batas bawah tabel', () => {
    const doc = docPalsu();

    gambarTabelUnsur(doc, duaBaris, { kiri: KIRI, batasBawah: BATAS_BAWAH });

    const y = mendatar(doc.garis).map((g) => g.y1);
    const atas = Math.min(...y);
    const bawah = Math.max(...y);
    for (const g of tegak(doc.garis)) {
      expect(Math.min(g.y1, g.y2)).toBe(atas);
      expect(Math.max(g.y1, g.y2)).toBe(bawah);
    }
  });

  it('memberi jarak sel, sehingga teks tidak menempel pada garis kolom', () => {
    const doc = docPalsu();

    gambarTabelUnsur(doc, duaBaris, { kiri: KIRI, batasBawah: BATAS_BAWAH });

    const sel = doc.tulisan.find((t) => t.teks === 'Persyaratan')!;
    expect(sel.x).toBe(KIRI + KOLOM_PDF[0].lebar + PADDING_SEL);
    expect(sel.lebar).toBe(KOLOM_PDF[1].lebar - PADDING_SEL * 2);
  });
});
