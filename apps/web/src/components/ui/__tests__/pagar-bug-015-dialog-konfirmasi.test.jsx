import React from 'react';
import { render, screen } from '@testing-library/react';
import ConfirmActionModal from '../ConfirmActionModal';

/**
 * Pagar regresi BUG-015 — `ConfirmActionModal` tak dapat dipakai pembaca layar.
 *
 * Modal ini yang menjaga tindakan paling destruktif di aplikasi: membuang
 * survei ke Sampah dan memusnahkannya permanen. Ia tak punya `role="dialog"`,
 * tak punya `aria-modal`, nama aksesibelnya kosong, dan tombol tutupnya hanya
 * berisi ikon tanpa teks apa pun.
 *
 * ── Kenapa `test.failing()`, bukan harapan biasa ────────────────────────────
 * Cacatnya BELUM diperbaiki. Ditulis sebagai harapan biasa, berkas ini merah
 * setiap hari karena hal yang sudah diketahui — dan merah yang permanen
 * berhenti dibaca orang. `test.failing()` membalik arahnya: selama cacatnya
 * ada, suite hijau; begitu atributnya dipasang, uji itu MERAH dan menuntut
 * anotasinya dicabut. Sejak saat itu ia jadi pagar regresi sungguhan. Yang
 * dikunci bukan perbaikannya, melainkan MOMEN perbaikannya.
 *
 * ── Kenapa ada uji kendali yang wajib lulus ─────────────────────────────────
 * `test.failing()` menelan kegagalan apa pun — termasuk komponen yang gagal
 * dirender sama sekali. Uji pertama di bawah karena itu uji biasa: ia
 * membuktikan modalnya memang terbuka dan terbaca, sehingga kegagalan ketiga
 * uji sesudahnya benar-benar berasal dari atribut yang hilang, bukan dari
 * render yang tak pernah terjadi.
 *
 * ── Kenapa ini kelalaian, bukan gaya rumah ──────────────────────────────────
 * `ModalKirimSurvei.jsx` di berkas sebelah memasang `role="dialog"`,
 * `aria-modal="true"`, `aria-labelledby`, DAN `aria-label="Tutup"` pada tombol
 * silangnya — polanya sudah dikuasai tim. Perbandingan itu yang membuat
 * ketiadaannya di sini terbaca sebagai terlewat.
 */

const PROPS = {
  isOpen: true,
  title: 'Hapus Survei',
  description: 'Survei akan dipindahkan ke Sampah dan dapat dipulihkan kembali.',
  confirmLabel: 'Ya, Hapus',
  danger: true,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe('BUG-015 — dialog konfirmasi destruktif & pembaca layar', () => {
  it('kendali — modal terbuka merender judul, penjelasan, dan kedua tombolnya', () => {
    render(<ConfirmActionModal {...PROPS} />);

    expect(screen.getByText('Hapus Survei')).toBeInTheDocument();
    expect(screen.getByText(/dipindahkan ke sampah/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ya, Hapus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
  });

  test.failing('dialognya dapat ditemukan sebagai dialog, dan menyatakan dirinya modal', () => {
    render(<ConfirmActionModal {...PROPS} />);

    // Tanpa `role="dialog"`, pembaca layar tak punya cara mengumumkan bahwa
    // sesuatu terbuka di atas halaman; tanpa `aria-modal`, ia terus membacakan
    // isi halaman di belakangnya seolah masih dapat disentuh.
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test.failing('nama yang terbaca untuk dialognya adalah judulnya sendiri', () => {
    render(<ConfirmActionModal {...PROPS} />);

    // Yang diumumkan seharusnya "Hapus Survei, dialog" — bukan "dialog" saja.
    // Pemakai yang tak mendengar judulnya menekan "Ya, Hapus" tanpa tahu apa
    // yang dihapus.
    expect(screen.getByRole('dialog', { name: /hapus survei/i })).toBeInTheDocument();
  });

  test.failing('tombol tutup punya nama yang terbaca, bukan hanya ikon silang', () => {
    render(<ConfirmActionModal {...PROPS} />);

    // Tombol silangnya berisi `<X />` dari lucide-react dan tak lebih. Bagi
    // pembaca layar ia tombol tanpa nama — satu-satunya jalan keluar yang tak
    // dapat disebut. `ModalKirimSurvei` memberi tombol yang sama
    // `aria-label="Tutup"`.
    expect(screen.getByRole('button', { name: /tutup/i })).toBeInTheDocument();
  });
});
