import { downloadTablePdf } from '../pdf';
import {
  KOLOM_DAFTAR_PENGADUAN,
  KOLOM_LAPORAN_RINGKAS,
  LEBAR_TABEL_RINGKAS,
  KOLOM_MONITORING_PENGADUAN,
  KOLOM_MONITORING_SURVEI,
  KOLOM_SURVEI_OPD,
} from '../pdfKolom';

/**
 * Diuji dengan jsPDF SUNGGUHAN, bukan doc tiruan: yang dipersoalkan adalah
 * lebar huruf sebenarnya. Doc tiruan memakai perkiraan "sekian aksara per
 * baris", dan perkiraan itu justru yang membuat cacat ini lolos selama ini.
 *
 * Cacatnya terukur pada berkas contoh 12 September 2026: kolom Status dan
 * Tanggal masing-masing hanya 73,6pt, sehingga SETIAP baris terpotong dua
 * ("Menunggu" lalu "Verifikasi", "3 September" lalu "2026").
 */
const gambar = { teks: [], garis: [], argKonstruktor: null };

jest.mock('jspdf', () => {
  const asli = jest.requireActual('jspdf');
  function Pembungkus(...args) {
    global.__gambar.argKonstruktor = args[0];
    const doc = new asli.jsPDF(...args);
    const teksAsli = doc.text.bind(doc);
    doc.text = (isi, x, y, opsi) => {
      global.__gambar.teks.push({ isi, x, baris: Array.isArray(isi) ? isi.length : 1 });
      return teksAsli(isi, x, y, opsi);
    };
    const garisAsli = doc.line.bind(doc);
    doc.line = (x1, y1, x2, y2) => {
      global.__gambar.garis.push({ x1, y1, x2, y2 });
      return garisAsli(x1, y1, x2, y2);
    };
    doc.save = () => doc;
    return doc;
  }
  return { ...asli, jsPDF: Pembungkus };
});

beforeEach(() => {
  gambar.teks = [];
  gambar.garis = [];
  gambar.argKonstruktor = null;
  global.__gambar = gambar;
});

/** Berapa baris yang dipakai sel yang isinya persis `isi`. */
const barisSel = (isi) => {
  const sel = gambar.teks.find(
    (t) => (Array.isArray(t.isi) ? t.isi.join(' ') : String(t.isi)) === isi,
  );
  return sel ? sel.baris : null;
};

describe('kolom daftar pengaduan', () => {
  const cetak = (baris) =>
    downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Laporan Pengaduan Masyarakat',
      columns: KOLOM_DAFTAR_PENGADUAN,
      rows: [baris],
    });

  it('label status terpanjang muat satu baris', async () => {
    await cetak(['#120', 'Judul singkat', 'Siti Rohmah', 'Menunggu Verifikasi', '1 Januari 2026']);

    expect(barisSel('Menunggu Verifikasi')).toBe(1);
  });

  it('tanggal terpanjang muat satu baris', async () => {
    await cetak(['#120', 'Judul singkat', 'Siti Rohmah', 'Diproses', '12 September 2026']);

    expect(barisSel('12 September 2026')).toBe(1);
  });

  it('nomor tiket muat satu baris', async () => {
    await cetak(['#12045', 'Judul singkat', 'Siti Rohmah', 'Diproses', '1 Januari 2026']);

    expect(barisSel('#12045')).toBe(1);
  });

  it('kepala kolom ditulis huruf biasa, menyamai laporan IKM', () => {
    expect(KOLOM_DAFTAR_PENGADUAN.map((k) => k.header)).toEqual([
      'No. Tiket',
      'Judul Keluhan',
      'Pelapor',
      'Status',
      'Tanggal',
    ]);
  });
});

describe('tabel ringkas dua kolom', () => {
  it('tidak dilebarkan sampai tepi halaman', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Laporan Tahunan Kinerja Kabupaten',
      columns: KOLOM_LAPORAN_RINGKAS,
      lebarTabel: LEBAR_TABEL_RINGKAS,
      rows: [['Indeks Kepuasan Masyarakat', '82,44']],
    });

    const kanan = Math.max(...gambar.garis.map((g) => Math.max(g.x1, g.x2)));
    // Lebar isi A4 dengan margin 40pt = 515pt. Tabel ringkas harus jauh di
    // dalamnya, bukan sekadar sedikit lebih sempit.
    expect(kanan).toBeLessThan(40 + 515 * 0.8);
  });
});

describe('monitoring pengaduan kabupaten', () => {
  /**
   * Tujuh kolom butuh sekitar 755pt, sedangkan A4 TEGAK hanya menyediakan
   * 515pt. Karena itu laporan ini satu-satunya yang dicetak mendatar; membuang
   * kolom demi muat tegak berarti mengurangi isi laporannya.
   */
  const cetak = (baris) =>
    downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Monitoring Pengaduan',
      columns: KOLOM_MONITORING_PENGADUAN,
      mendatar: true,
      rows: [baris],
    });

  const barisContoh = [
    '#PGD20260912K2F8',
    'Dinas Komunikasi dan Informatika',
    'Lainnya',
    'Jalan berlubang di depan Pasar Caruban',
    'Siti Rohmah',
    'Menunggu Verifikasi',
    '12 September 2026',
  ];

  it('dicetak mendatar', async () => {
    await cetak(barisContoh);

    expect(gambar.argKonstruktor).toMatchObject({ orientation: 'landscape' });
  });

  it('nama OPD terpanjang muat satu baris', async () => {
    await cetak(barisContoh);

    expect(barisSel('Dinas Komunikasi dan Informatika')).toBe(1);
  });

  it('status dan tanggal muat satu baris', async () => {
    await cetak(barisContoh);

    expect(barisSel('Menunggu Verifikasi')).toBe(1);
    expect(barisSel('12 September 2026')).toBe(1);
  });
});

describe('monitoring survei kabupaten', () => {
  it('periode dan nama OPD muat satu baris pada halaman tegak', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Monitoring Survei',
      columns: KOLOM_MONITORING_SURVEI,
      rows: [[
        'Survei Kepuasan Layanan Puskesmas',
        'Dinas Komunikasi dan Informatika',
        'Triwulan III - 2026',
        'Aktif',
        '128',
        '82,44',
      ]],
    });

    expect(barisSel('Triwulan III - 2026')).toBe(1);
    expect(barisSel('Dinas Komunikasi dan Informatika')).toBe(1);
  });
});

describe('daftar survei OPD', () => {
  it('tanpa kolom OPD, sebab seluruhnya OPD sendiri', () => {
    expect(KOLOM_SURVEI_OPD.map((k) => k.header)).toEqual([
      'Judul Survei',
      'Periode',
      'Status',
      'Responden',
      'Nilai IKM',
    ]);
  });

  it('periode muat satu baris', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Daftar Survei',
      columns: KOLOM_SURVEI_OPD,
      rows: [['Survei Kepuasan Layanan Loket', 'Triwulan III - 2026', 'Aktif', '128', '82,44']],
    });

    expect(barisSel('Triwulan III - 2026')).toBe(1);
  });
});

describe('kepala tabel yang tak muat', () => {
  /**
   * Susunan kolom yang dipakai aplikasi dijaga pdfKepalaKolom.test.js. Yang
   * diuji di sini adalah perilaku komponennya sendiri bila suatu saat menerima
   * susunan yang keliru: kepala harus DIBUNGKUS, bukan dibiarkan menimpa kolom
   * sebelahnya seperti pada laporan 13 September 2026.
   */
  it('dibungkus ke baris berikutnya, bukan melimpah ke kolom sebelah', async () => {
    await downloadTablePdf({
      filename: 'uji.pdf',
      title: 'Uji',
      columns: [
        { header: 'Jumlah Responden Terverifikasi', width: 1 },
        { header: 'Nilai', width: 5 },
      ],
      rows: [['1', '2']],
    });

    const kepala = gambar.teks.find((t) =>
      (Array.isArray(t.isi) ? t.isi.join(' ') : String(t.isi)).startsWith('Jumlah'),
    );
    expect(kepala.baris).toBeGreaterThan(1);
  });
});
