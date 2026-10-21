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
 * ── PAGAR REGRESI SUNGGUHAN SEJAK 21 OKTOBER 2026 ───────────────────────────
 * Cacatnya sudah diperbaiki dan `test.failing()` DICABUT dari ketiga uji di
 * bawah. Sampai hari itu ketiganya beranotasi `test.failing()`, karena harapan
 * biasa membuat berkas ini merah setiap hari atas hal yang sudah diketahui —
 * dan merah yang permanen berhenti dibaca orang. Anotasi itu membalik arahnya:
 * selama cacatnya ada suite hijau, dan begitu atributnya dipasang ketiga uji
 * MERAH dan menuntut anotasinya dicabut. Yang dikunci memang bukan
 * perbaikannya, melainkan MOMEN perbaikannya — dan momen itu sudah lewat, jadi
 * sejak sekarang ketiganya harapan biasa yang memerah bila atributnya hilang
 * lagi.
 *
 * ── Kenapa uji kendalinya tetap tinggal ─────────────────────────────────────
 * Ia lahir karena `test.failing()` menelan kegagalan apa pun — termasuk
 * komponen yang gagal dirender sama sekali — sehingga perlu ada satu uji biasa
 * yang membuktikan modalnya memang terbuka. Alasan itu memang hilang bersama
 * anotasinya, tetapi ujinya tidak dibuang: ia membedakan "atribut hilang" dari
 * "modal tak pernah terbuka", dan dua sebab itu menuntut perbaikan yang sama
 * sekali berbeda.
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

  it('dialognya dapat ditemukan sebagai dialog, dan menyatakan dirinya modal', () => {
    render(<ConfirmActionModal {...PROPS} />);

    // Tanpa `role="dialog"`, pembaca layar tak punya cara mengumumkan bahwa
    // sesuatu terbuka di atas halaman; tanpa `aria-modal`, ia terus membacakan
    // isi halaman di belakangnya seolah masih dapat disentuh.
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('nama yang terbaca untuk dialognya adalah judulnya sendiri', () => {
    render(<ConfirmActionModal {...PROPS} />);

    // Yang diumumkan seharusnya "Hapus Survei, dialog" — bukan "dialog" saja.
    // Pemakai yang tak mendengar judulnya menekan "Ya, Hapus" tanpa tahu apa
    // yang dihapus.
    expect(screen.getByRole('dialog', { name: /hapus survei/i })).toBeInTheDocument();
  });

  it('tombol tutup punya nama yang terbaca, bukan hanya ikon silang', () => {
    render(<ConfirmActionModal {...PROPS} />);

    // Isi tampaknya hanya `<X />` dari lucide-react, jadi namanya seluruhnya
    // bergantung pada `aria-label`. Tanpa itu ia tombol tanpa nama bagi pembaca
    // layar — satu-satunya jalan keluar yang tak dapat disebut. `ModalKirimSurvei`
    // memberi tombol yang sama `aria-label="Tutup"`, dan sejak 21 Oktober 2026
    // modal ini juga.
    expect(screen.getByRole('button', { name: /tutup/i })).toBeInTheDocument();
  });
});
