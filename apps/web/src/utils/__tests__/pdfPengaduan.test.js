import { downloadComplaintPdf } from '../pdf';

/**
 * Arsip satu tiket. Sebelumnya tombol Export PDF MEMOTRET LAYAR (html-to-image
 * jadi PNG lalu ditempel ke PDF seukuran piksel elemennya), sehingga hasilnya
 * tak dapat dicari teksnya, bukan A4 saat dicetak, dan ikut membawa tombol serta
 * bayangan antarmuka. Diganti dokumen teks sungguhan (12 September 2026).
 */
const jejak = { teks: [], argKonstruktor: null, gambarDitempel: 0 };

jest.mock('jspdf', () => {
  const asli = jest.requireActual('jspdf');
  function Pembungkus(...args) {
    global.__jejak.argKonstruktor = args[0];
    const doc = new asli.jsPDF(...args);
    const teksAsli = doc.text.bind(doc);
    doc.text = (isi, x, y, opsi) => {
      (Array.isArray(isi) ? isi : [isi]).forEach((satu) =>
        global.__jejak.teks.push({ isi: String(satu), x }),
      );
      return teksAsli(isi, x, y, opsi);
    };
    doc.addImage = () => {
      global.__jejak.gambarDitempel += 1;
      return doc;
    };
    doc.save = () => doc;
    return doc;
  }
  return { ...asli, jsPDF: Pembungkus };
});

beforeEach(() => {
  jejak.teks = [];
  jejak.argKonstruktor = null;
  jejak.gambarDitempel = 0;
  global.__jejak = jejak;
});

const pengaduan = {
  id: 'TKT-120',
  title: 'Jalan berlubang di depan Pasar Caruban',
  description: 'Sudah tiga bulan lubangnya dibiarkan dan mulai membahayakan pengendara motor.',
  status: 'Diproses',
  categoryLabel: 'Aduan',
  target: 'Dinas Pekerjaan Umum dan Penataan Ruang',
  dateStr: '3 September 2026',
  isAnonim: false,
  reporter: { name: 'Siti Rohmah', nik: '3519012345670001', phone: '081234567890', address: 'Jl. Merdeka 12, Caruban' },
};

const percakapan = [
  { role: 'user', text: 'Mohon segera ditindaklanjuti.', timestamp: '10:15 WIB', createdAt: '2026-09-03T03:15:00.000Z' },
  { role: 'admin', text: 'Sudah kami teruskan ke bidang bina marga.', timestamp: '09:02 WIB', createdAt: '2026-09-04T02:02:00.000Z' },
];

const semuaTeks = () => jejak.teks.map((t) => t.isi).join('\n');

describe('downloadComplaintPdf', () => {
  it('menulis keterangan tiket dengan titik dua sejajar pada satu sumbu x', async () => {
    await downloadComplaintPdf({ complaint: pengaduan, chatHistory: percakapan });

    const titikDua = jejak.teks.filter((t) => t.isi === ':');
    expect(titikDua.length).toBeGreaterThan(3);
    expect(new Set(titikDua.map((t) => t.x)).size).toBe(1);
  });

  it('memuat seluruh isi percakapan, bukan hanya keterangan tiketnya', async () => {
    await downloadComplaintPdf({ complaint: pengaduan, chatHistory: percakapan });

    const teks = semuaTeks();
    expect(teks).toContain('Mohon segera ditindaklanjuti.');
    expect(teks).toContain('Sudah kami teruskan ke bidang bina marga.');
  });

  it('membedakan penulis tiap pesan', async () => {
    await downloadComplaintPdf({ complaint: pengaduan, chatHistory: percakapan });

    const teks = semuaTeks();
    expect(teks).toMatch(/Pelapor/);
    expect(teks).toMatch(/Petugas|Admin/);
  });

  it('berukuran A4, bukan seukuran piksel elemen di layar', async () => {
    await downloadComplaintPdf({ complaint: pengaduan, chatHistory: percakapan });

    expect(jejak.argKonstruktor).toMatchObject({ format: 'a4', orientation: 'portrait' });
  });

  it('tidak menempel gambar apa pun, sebab bukan potret layar', async () => {
    await downloadComplaintPdf({ complaint: pengaduan, chatHistory: percakapan });

    expect(jejak.gambarDitempel).toBe(0);
  });

  it('pelapor anonim ditulis Anonim, bukan dikosongkan', async () => {
    await downloadComplaintPdf({
      complaint: { ...pengaduan, isAnonim: true, reporter: { name: 'Anonim' } },
      chatHistory: [],
    });

    expect(semuaTeks()).toContain('Anonim');
  });

  it('percakapan kosong tetap menghasilkan dokumen, dengan keterangannya', async () => {
    await downloadComplaintPdf({ complaint: pengaduan, chatHistory: [] });

    expect(semuaTeks()).toContain('Jalan berlubang di depan Pasar Caruban');
  });
});

describe('profil pelapor pada dokumen tiket', () => {
  it('dicetak sebagai bagian tersendiri, dengan medan yang sama seperti di layar', async () => {
    await downloadComplaintPdf({ complaint: pengaduan, chatHistory: [] });

    const teks = semuaTeks();
    expect(teks).toContain('Profil Pelapor');
    expect(teks).toContain('3519012345670001');
    expect(teks).toContain('081234567890');
    expect(teks).toContain('Jl. Merdeka 12, Caruban');
  });

  it('pengaduan anonim TIDAK memuat profil pelapor sama sekali', async () => {
    await downloadComplaintPdf({
      complaint: {
        ...pengaduan,
        isAnonim: true,
        // Backend menghilangkan identitas pelapor pada pengaduan anonim, tetapi
        // uji ini sengaja MENGISINYA: yang dijaga adalah keputusan tak mencetak,
        // bukan kebetulan datanya kosong.
        reporter: { name: 'Anonim', nik: '3519012345670001', phone: '081234567890', address: 'Jl. Merdeka 12' },
      },
      chatHistory: [],
    });

    const teks = semuaTeks();
    expect(teks).not.toContain('Profil Pelapor');
    expect(teks).not.toContain('3519012345670001');
    expect(teks).not.toContain('081234567890');
    expect(teks).not.toContain('Jl. Merdeka 12');
  });

  it('pengaduan anonim tetap menyebut pelapornya Anonim pada keterangan tiket', async () => {
    await downloadComplaintPdf({
      complaint: { ...pengaduan, isAnonim: true, reporter: { name: 'Anonim' } },
      chatHistory: [],
    });

    expect(semuaTeks()).toContain('Anonim');
  });
});
