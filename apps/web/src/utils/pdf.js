/**
 * Pembuat PDF laporan sederhana (judul + tabel) memakai jsPDF yang MEMANG SUDAH
 * jadi dependensi proyek.
 *
 * Sebelum ini beberapa tombol "Ekspor PDF" sebenarnya mengunduh berkas .txt
 * berisi catatan "ini simulasi" (lihat app/admin-opd/complaints/page.jsx &
 * features/dashboard/.../KabDashboardHeader.jsx) -- pengguna menekan PDF tapi
 * menerima teks. Util ini menutup celah itu di satu tempat supaya tiap halaman
 * tak menyalin ulang urusan jsPDF.
 *
 * Beda dari pola tangkap-layar (html-to-image + jsPDF) di ComplaintDetailHeader:
 * itu untuk memotret satu tampilan detail apa adanya, sedangkan di sini datanya
 * tabular sehingga digambar langsung sebagai teks -- hasilnya bisa dicari/
 * diseleksi, ukurannya jauh lebih kecil, dan tak bergantung pada DOM yang
 * sedang terlihat di layar.
 */

const PAGE_MARGIN = 40;
const LINE_HEIGHT = 14;
const HEADER_FILL = [241, 245, 249]; // slate-100
const TEXT_DARK = [15, 23, 42]; // slate-900
const TEXT_MUTED = [100, 116, 139]; // slate-500
const GARIS_KISI = [203, 213, 225]; // slate-300

/** Jarak teks ke garis sel tabel, kiri dan kanan. Diekspor agar dapat diuji. */
export const PADDING_SEL_TABEL = 4;

/** Judul + baris keterangan cetak. Mengembalikan sumbu y untuk isi berikutnya. */
function gambarKepalaLaporan(doc, { title, subtitle }) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...TEXT_DARK);
  doc.text(title, PAGE_MARGIN, PAGE_MARGIN + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const dicetakPada = `Dicetak ${new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())}`;
  doc.text(subtitle ? `${subtitle} • ${dicetakPada}` : dicetakPada, PAGE_MARGIN, PAGE_MARGIN + 22);

  return PAGE_MARGIN + 44;
}

/** Digambar SESUDAH seluruh halaman terbentuk, sebab totalnya baru diketahui. */
function gambarNomorHalaman(doc, pageWidth, pageHeight) {
  const total = doc.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  for (let halaman = 1; halaman <= total; halaman += 1) {
    doc.setPage(halaman);
    doc.text(`Halaman ${halaman} dari ${total}`, pageWidth - PAGE_MARGIN, pageHeight - 20, {
      align: 'right',
    });
  }
}

/**
 * @param {object} options
 * @param {string} options.filename Nama berkas unduhan, mis. "Data_Pengaduan.pdf".
 * @param {string} options.title Judul laporan di halaman pertama.
 * @param {string} [options.subtitle] Keterangan tambahan di bawah judul.
 * @param {Array<{header: string, width: number}>} options.columns `width` = bobot
 *   relatif kolom (bukan poin); total bobot dinormalisasi ke lebar area cetak.
 * @param {Array<Array<string|number|null>>} options.rows Isi tabel, satu array per baris.
 * @param {boolean} [options.mendatar] Cetak mendatar. Dipakai laporan berkolom
 *   banyak yang tak muat pada A4 tegak.
 * @param {number} [options.lebarTabel] Lebar tabel dalam poin. Baku: selebar area
 *   cetak. Diperkecil untuk tabel berkolom sedikit, yang kalau dilebarkan penuh
 *   hanya menghasilkan sel-sel kosong.
 * @param {string} [options.emptyLabel] Teks bila `rows` kosong.
 */
export async function downloadTablePdf({
  filename,
  title,
  subtitle,
  columns,
  rows,
  lebarTabel,
  mendatar = false,
  emptyLabel = 'Tidak ada data untuk diekspor.',
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: mendatar ? 'landscape' : 'portrait',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const lebarIsi = Math.min(lebarTabel ?? contentWidth, contentWidth);
  const tepiKanan = PAGE_MARGIN + lebarIsi;

  const totalWeight = columns.reduce((sum, col) => sum + col.width, 0);
  const columnWidths = columns.map((col) => (col.width / totalWeight) * lebarIsi);
  const columnStarts = columnWidths.reduce(
    (acc, width, i) => [...acc, acc[i] + width],
    [PAGE_MARGIN],
  );

  let y = gambarKepalaLaporan(doc, { title, subtitle });

  // Batas atas potongan tabel pada halaman yang sedang digambar, dan garis
  // mendatar terbawah sejauh ini. Keduanya menentukan rentang garis tegak.
  let atasPotongan = 0;
  let garisTerbawah = 0;

  const garisMendatar = (posisi) => {
    doc.setDrawColor(...GARIS_KISI);
    doc.line(PAGE_MARGIN, posisi, tepiKanan, posisi);
    garisTerbawah = posisi;
  };

  // Garis tegak digambar sekali per potongan halaman, bukan per baris: baris
  // yang teksnya membungkus punya tinggi berbeda-beda, dan menggambar per baris
  // menghasilkan potongan garis yang tak bersambung.
  const tutupPotongan = () => {
    doc.setDrawColor(...GARIS_KISI);
    columnStarts.forEach((x) => doc.line(x, atasPotongan, x, garisTerbawah));
  };

  const drawHeaderRow = () => {
    atasPotongan = y - 11;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    // Kepala kolom dibungkus dengan aturan yang SAMA seperti sel isinya. Tanpa
    // ini, kepala yang lebih lebar daripada kolomnya menimpa kolom sebelah
    // alih-alih turun ke baris berikutnya (laporan 13 September 2026: "Responden"
    // menempel ke "Nilai IKM"). Susunan kolom yang dipakai aplikasi sendiri
    // dijaga agar tetap muat satu baris oleh pdfKepalaKolom.test.js; pembungkusan
    // di sini adalah jaring pengaman bagi susunan yang belum terpikirkan.
    const isiKepala = columns.map((col, i) =>
      doc.splitTextToSize(col.header, columnWidths[i] - PADDING_SEL_TABEL * 2),
    );
    const tinggiPita = LINE_HEIGHT * Math.max(...isiKepala.map((b) => b.length)) + 6;

    doc.setFillColor(...HEADER_FILL);
    doc.rect(PAGE_MARGIN, atasPotongan, lebarIsi, tinggiPita, 'F');
    garisMendatar(atasPotongan);
    doc.setTextColor(...TEXT_DARK);
    isiKepala.forEach((baris, i) => {
      doc.text(baris, columnStarts[i] + PADDING_SEL_TABEL, y);
    });
    garisMendatar(atasPotongan + tinggiPita);
    y += tinggiPita + 2;
    doc.setFont('helvetica', 'normal');
  };

  drawHeaderRow();

  if (rows.length === 0) {
    doc.setTextColor(...TEXT_MUTED);
    doc.text(emptyLabel, PAGE_MARGIN + PADDING_SEL_TABEL, y);
    garisMendatar(y + 6);
  }

  doc.setFontSize(9);
  rows.forEach((row) => {
    // Bungkus teks per kolom lebih dulu supaya tinggi baris mengikuti kolom
    // terpanjang -- tanpa ini teks panjang (judul pengaduan) akan saling timpa.
    const wrapped = row.map((cell, i) =>
      doc.splitTextToSize(String(cell ?? '-'), columnWidths[i] - PADDING_SEL_TABEL * 2),
    );
    const rowLines = Math.max(...wrapped.map((lines) => lines.length));
    const rowHeight = rowLines * LINE_HEIGHT;

    if (y + rowHeight > pageHeight - PAGE_MARGIN) {
      tutupPotongan();
      doc.addPage();
      y = PAGE_MARGIN + 10;
      drawHeaderRow();
    }

    doc.setTextColor(...TEXT_DARK);
    wrapped.forEach((lines, i) => {
      doc.text(lines, columnStarts[i] + PADDING_SEL_TABEL, y);
    });

    y += rowHeight + 4;
    garisMendatar(y - LINE_HEIGHT + 2);
  });

  tutupPotongan();

  gambarNomorHalaman(doc, pageWidth, pageHeight);
  doc.save(filename);
}

/** Jarak label ke titik dua pada blok keterangan tiket, dalam poin. */
const GESER_TITIK_DUA = 92;
/** Jarak label ke nilai pada blok keterangan tiket, dalam poin. */
const GESER_NILAI = 102;

/**
 * Tanggal lengkap bila `createdAt` tersedia.
 *
 * Pesan di layar hanya menampilkan jam, dan itu memadai pada percakapan yang
 * sedang berjalan. Arsip tanpa tanggal tidak dapat dirunut.
 */
function waktuPesan(pesan) {
  if (!pesan.createdAt) return pesan.timestamp || '-';
  const tanggal = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
    new Date(pesan.createdAt),
  );
  return pesan.timestamp ? `${tanggal}, ${pesan.timestamp}` : tanggal;
}

/**
 * Arsip satu tiket pengaduan sebagai DOKUMEN TEKS.
 *
 * Sebelumnya tombol Export PDF MEMOTRET LAYAR (html-to-image jadi PNG, lalu
 * ditempel ke PDF seukuran piksel elemennya). Hasilnya tak dapat dicari
 * teksnya, ukurannya bukan A4 sehingga kacau saat dicetak, dan ikut membawa
 * tombol serta bayangan antarmuka. Di sini seluruh isinya digambar sebagai
 * teks, termasuk riwayat percakapannya, sebab itulah gunanya arsip satu tiket.
 *
 * @param {object} options
 * @param {object} options.complaint Bentuk dari complaint.adapter.js.
 * @param {Array<object>} [options.chatHistory] Dari adaptComplaintReplyToChatMessage.
 */
export async function downloadComplaintPdf({ complaint, chatHistory = [] }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  let y = gambarKepalaLaporan(doc, {
    title: 'Detail Pengaduan',
    subtitle: `Nomor tiket ${complaint.id ?? '-'}`,
  });

  /** Pindah halaman bila sisa ruang tak cukup untuk blok setinggi `tinggi`. */
  const pastikanMuat = (tinggi) => {
    if (y + tinggi <= pageHeight - PAGE_MARGIN) return;
    doc.addPage();
    y = PAGE_MARGIN + 10;
  };

  const judulBagian = (teks) => {
    pastikanMuat(LINE_HEIGHT * 3);
    y += LINE_HEIGHT * 0.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TEXT_DARK);
    doc.text(teks, PAGE_MARGIN, y);
    y += 6;
    doc.setDrawColor(...GARIS_KISI);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += LINE_HEIGHT;
  };

  const paragraf = (teks, { tebal = false, warna = TEXT_DARK } = {}) => {
    doc.setFont('helvetica', tebal ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...warna);
    const baris = doc.splitTextToSize(String(teks ?? '-'), contentWidth);
    pastikanMuat(baris.length * LINE_HEIGHT);
    doc.text(baris, PAGE_MARGIN, y);
    y += baris.length * LINE_HEIGHT;
  };

  const keterangan = [
    ['No. Tiket', complaint.id],
    ['Judul', complaint.title],
    ['Status', complaint.status],
    ['Kategori', complaint.categoryLabel ?? complaint.kategori],
    ['Tujuan', complaint.target],
    ['Pelapor', complaint.reporter?.name],
    ['Tanggal Masuk', complaint.dateStr],
  ];
  /** Satu baris "label : nilai" pada tiga kolom tetap. */
  const barisKeterangan = ([label, nilai]) => {
    const baris = doc.splitTextToSize(String(nilai ?? '-'), contentWidth - GESER_NILAI);
    pastikanMuat(baris.length * LINE_HEIGHT);
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(label, PAGE_MARGIN, y);
    // Titik dua digambar TERPISAH, bukan disambung ke labelnya: kalau disambung
    // letaknya ikut panjang label sehingga kolomnya bergerigi.
    doc.text(':', PAGE_MARGIN + GESER_TITIK_DUA, y);
    doc.setFont('helvetica', 'normal');
    doc.text(baris, PAGE_MARGIN + GESER_NILAI, y);
    y += baris.length * LINE_HEIGHT;
  };

  keterangan.forEach(barisKeterangan);

  // Profil pelapor DIHILANGKAN SELURUHNYA pada pengaduan anonim. Bukan sekadar
  // dikosongkan: bagian berjudul "Profil Pelapor" yang isinya serba "-" tetap
  // mengundang pertanyaan siapa orangnya, sedangkan janji anonimnya adalah
  // bahwa pertanyaan itu tidak dijawab dokumen ini.
  //
  // Medan NIK, telepon, dan alamat memang belum punya sumber di backend
  // (lihat catatan gap di complaint.adapter.js) sehingga umumnya "-". Tetap
  // dicetak agar sama dengan kartu Profil Pelapor di layar.
  if (!complaint.isAnonim) {
    judulBagian('Profil Pelapor');
    [
      ['Nama Lengkap', complaint.reporter?.name],
      ['NIK', complaint.reporter?.nik],
      ['No. Telepon', complaint.reporter?.phone],
      ['Alamat', complaint.reporter?.address],
    ].forEach(barisKeterangan);
  }

  judulBagian('Uraian Pengaduan');
  paragraf(complaint.description);

  judulBagian('Riwayat Percakapan');
  if (chatHistory.length === 0) {
    paragraf('Belum ada percakapan pada tiket ini.', { warna: TEXT_MUTED });
  } else {
    for (const pesan of chatHistory) {
      const penulis = pesan.role === 'user' ? (pesan.senderName ?? 'Pelapor') : 'Petugas';
      paragraf(`${penulis} \u2022 ${waktuPesan(pesan)}`, { tebal: true, warna: TEXT_MUTED });
      paragraf(pesan.text || '(lampiran tanpa teks)');
      const jumlahLampiran = (pesan.attachments ?? []).length;
      if (jumlahLampiran > 0) {
        paragraf(`${jumlahLampiran} lampiran`, { warna: TEXT_MUTED });
      }
      y += LINE_HEIGHT * 0.5;
    }
  }

  gambarNomorHalaman(doc, pageWidth, pageHeight);
  doc.save(`pengaduan-${complaint.id ?? 'tiket'}.pdf`);
}
