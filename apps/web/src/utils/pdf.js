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

/**
 * @param {object} options
 * @param {string} options.filename Nama berkas unduhan, mis. "Data_Pengaduan.pdf".
 * @param {string} options.title Judul laporan di halaman pertama.
 * @param {string} [options.subtitle] Keterangan tambahan di bawah judul.
 * @param {Array<{header: string, width: number}>} options.columns `width` = bobot
 *   relatif kolom (bukan poin); total bobot dinormalisasi ke lebar area cetak.
 * @param {Array<Array<string|number|null>>} options.rows Isi tabel, satu array per baris.
 * @param {string} [options.emptyLabel] Teks bila `rows` kosong.
 */
export async function downloadTablePdf({
  filename,
  title,
  subtitle,
  columns,
  rows,
  emptyLabel = 'Tidak ada data untuk diekspor.',
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  const totalWeight = columns.reduce((sum, col) => sum + col.width, 0);
  const columnWidths = columns.map((col) => (col.width / totalWeight) * contentWidth);
  const columnStarts = columnWidths.reduce(
    (acc, width, i) => [...acc, acc[i] + width],
    [PAGE_MARGIN],
  );

  // --- Kepala laporan ---
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

  let y = PAGE_MARGIN + 44;

  const drawHeaderRow = () => {
    doc.setFillColor(...HEADER_FILL);
    doc.rect(PAGE_MARGIN, y - 11, contentWidth, LINE_HEIGHT + 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_DARK);
    columns.forEach((col, i) => {
      doc.text(col.header, columnStarts[i] + 4, y);
    });
    y += LINE_HEIGHT + 8;
    doc.setFont('helvetica', 'normal');
  };

  drawHeaderRow();

  if (rows.length === 0) {
    doc.setTextColor(...TEXT_MUTED);
    doc.text(emptyLabel, PAGE_MARGIN + 4, y);
  }

  doc.setFontSize(9);
  rows.forEach((row) => {
    // Bungkus teks per kolom lebih dulu supaya tinggi baris mengikuti kolom
    // terpanjang -- tanpa ini teks panjang (judul pengaduan) akan saling timpa.
    const wrapped = row.map((cell, i) =>
      doc.splitTextToSize(String(cell ?? '-'), columnWidths[i] - 8),
    );
    const rowLines = Math.max(...wrapped.map((lines) => lines.length));
    const rowHeight = rowLines * LINE_HEIGHT;

    if (y + rowHeight > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN + 10;
      drawHeaderRow();
    }

    doc.setTextColor(...TEXT_DARK);
    wrapped.forEach((lines, i) => {
      doc.text(lines, columnStarts[i] + 4, y);
    });

    y += rowHeight + 4;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(PAGE_MARGIN, y - LINE_HEIGHT + 2, pageWidth - PAGE_MARGIN, y - LINE_HEIGHT + 2);
  });

  // --- Nomor halaman (setelah seluruh halaman terbentuk) ---
  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.text(`Halaman ${page} dari ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 20, {
      align: 'right',
    });
  }

  doc.save(filename);
}
