import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmActionModal from '../ConfirmActionModal';
import ConfirmDialog from '../ConfirmDialog';
import ConfirmTypeToDeleteModal from '../ConfirmTypeToDeleteModal';

/**
 * Pagar BUG-015 BAGIAN 2 — fokus tidak dipindahkan ke dalam dialog dan tidak
 * dikurung di sana.
 *
 * Bagian 1 (atribut ARIA `ConfirmActionModal`) ditutup 21 Oktober 2026. Bagian
 * ini yang tersisa, dan laporannya menilainya LEBIH merugikan: `aria-modal="true"`
 * menyuruh pembaca layar menyembunyikan seluruh isi halaman di luar dialog,
 * sementara fokusnya tertinggal di tombol pemicu — yang kini berada di wilayah
 * yang disembunyikan itu. Pemakai mendarat di ruang kosong: dialognya ada,
 * tetapi ia tak berada di dalamnya, dan dua kali Tab membawanya keluar sama
 * sekali. Jejak Tab aslinya direkam pada sesi C-14.
 *
 * ── Kenapa harapan biasa, bukan `test.failing()` ────────────────────────────
 * Kedua pagar BUG-015 dan BUG-017 sebelumnya memakai `test.failing()` karena
 * perbaikannya DITUNDA: anotasi itu mengunci momen perbaikan, bukan
 * perbaikannya. Di sini perbaikannya ada di perubahan yang sama, jadi siklus
 * merah→hijau yang biasa justru yang benar. Berkas ini ditulis lebih dulu dan
 * diamati merah sebelum `useFocusTrap` ada.
 *
 * ── Kenapa `keyDown` ditembakkan tersurat, bukan `userEvent.tab()` ──────────
 * jsdom tak punya urutan Tab bawaan, dan `userEvent.tab()` memindahkan fokus
 * sendiri menurut perhitungannya. Yang hendak dibuktikan di sini adalah
 * pengurungan MILIK KITA yang mencegat Tab dan memindahkan fokusnya, jadi
 * ujinya menembakkan `keydown` yang persis didengar kaitnya.
 */

/** Pentas dengan pemicu di LUAR dialog, supaya pemulihan fokus dapat diamati. */
function Pentas({ Dialog, props = {} }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setBuka(true)}>
        Pemicu
      </button>
      <Dialog {...props} isOpen={buka} onCancel={() => setBuka(false)} />
    </>
  );
}

const pemicu = () => screen.getByRole('button', { name: 'Pemicu' });
const buka = () => {
  // Difokuskan tersurat: `fireEvent.click` tidak memindahkan fokus di jsdom,
  // sedangkan klik sungguhan memindahkannya. Tanpa ini tak ada fokus awal yang
  // dapat dipulihkan, dan uji pemulihannya akan hijau karena sebab yang salah.
  pemicu().focus();
  fireEvent.click(pemicu());
};

const PROPS_AKSI = {
  title: 'Hapus Survei',
  description: 'Survei akan dipindahkan ke Sampah dan dapat dipulihkan kembali.',
  confirmLabel: 'Ya, Hapus',
  danger: true,
  onConfirm: jest.fn(),
};

const PROPS_KETIK = {
  judul: 'Hapus Permanen',
  deskripsi: 'Jawaban responden akan hilang dan tak dapat dikembalikan.',
  teksKonfirmasi: 'Survei Uji',
  onConfirm: jest.fn(),
};

describe('BUG-015 bagian 2 — fokus dialog dipindahkan ke dalam dan dikurung', () => {
  it('kendali — pemicu ada di luar dialog, dan dialognya terbuka saat ditekan', () => {
    render(<Pentas Dialog={ConfirmActionModal} props={PROPS_AKSI} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    buka();

    const dialog = screen.getByRole('dialog', { name: /hapus survei/i });
    expect(dialog).toBeInTheDocument();
    // Kalau baris ini gagal, seluruh uji di bawah tak berarti apa-apa: ia
    // membuktikan pemicunya memang DI LUAR dialog, sehingga "fokus tertinggal
    // di pemicu" benar-benar berarti fokus di luar.
    expect(dialog).not.toContainElement(pemicu());
  });

  it('fokus mendarat di wadah dialognya, bukan tertinggal di pemicu', () => {
    render(<Pentas Dialog={ConfirmActionModal} props={PROPS_AKSI} />);
    buka();

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('Tab dari elemen terfokus terakhir melingkar kembali ke yang pertama', () => {
    render(<Pentas Dialog={ConfirmActionModal} props={PROPS_AKSI} />);
    buka();

    const pertama = screen.getByRole('button', { name: /tutup/i });
    const terakhir = screen.getByRole('button', { name: 'Ya, Hapus' });

    terakhir.focus();
    fireEvent.keyDown(terakhir, { key: 'Tab' });

    expect(pertama).toHaveFocus();
  });

  it('Shift+Tab dari elemen pertama melingkar ke yang terakhir', () => {
    render(<Pentas Dialog={ConfirmActionModal} props={PROPS_AKSI} />);
    buka();

    const pertama = screen.getByRole('button', { name: /tutup/i });
    const terakhir = screen.getByRole('button', { name: 'Ya, Hapus' });

    pertama.focus();
    fireEvent.keyDown(pertama, { key: 'Tab', shiftKey: true });

    expect(terakhir).toHaveFocus();
  });

  it('fokus pulih ke pemicu begitu dialognya ditutup', () => {
    render(<Pentas Dialog={ConfirmActionModal} props={PROPS_AKSI} />);
    buka();
    expect(pemicu()).not.toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(pemicu()).toHaveFocus();
  });

  it('ConfirmDialog ikut terpasang — fokusnya tidak tertinggal di luar', () => {
    render(
      <Pentas
        Dialog={ConfirmDialog}
        props={{ title: 'Tutup Survei', description: 'Survei tak lagi menerima jawaban.' }}
      />,
    );
    buka();

    // Kait yang ADA tetapi tak pernah dipanggil adalah bentuk kegagalan yang
    // paling mudah terjadi di pekerjaan ini, jadi tiap dialog diperiksa sendiri.
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('ConfirmTypeToDeleteModal memakai penimpaan: fokus mendarat di medan ketiknya', () => {
    render(<Pentas Dialog={ConfirmTypeToDeleteModal} props={PROPS_KETIK} />);
    buka();

    // Di sinilah pekerjaan utama pemakai, dan mendaratkannya di sini aman sebab
    // tombol Hapus Permanen mati sampai ketikannya cocok.
    expect(screen.getByLabelText(/ketik/i)).toHaveFocus();
  });

  it('batas lingkaran bergeser saat tombol yang tadinya mati menjadi hidup', () => {
    render(<Pentas Dialog={ConfirmTypeToDeleteModal} props={PROPS_KETIK} />);
    buka();

    const medan = screen.getByLabelText(/ketik/i);
    const batal = screen.getByRole('button', { name: 'Batal' });
    const hapus = screen.getByRole('button', { name: 'Hapus Permanen' });

    // Yang diuji di sini BATASNYA, bukan tiap langkah Tab. Berpindah antar
    // elemen di DALAM dialog adalah pekerjaan peramban, dan jsdom tak punya
    // urutan Tab bawaan — menuntutnya di sini berarti menuntut pengurungan
    // mengambil alih seluruh urutan Tab, dan itu mengunci implementasi alih-alih
    // perilaku. Yang menjadi milik kita hanya tepiannya.

    // Selagi mati, Hapus Permanen bukan anggota: Batal-lah anggota TERAKHIR,
    // jadi Tab darinya melingkar pulang ke medan ketik.
    expect(hapus).toBeDisabled();
    batal.focus();
    fireEvent.keyDown(batal, { key: 'Tab' });
    expect(medan).toHaveFocus();

    fireEvent.change(medan, { target: { value: 'Survei Uji' } });
    expect(hapus).toBeEnabled();

    // Batasnya kini pindah ke Hapus Permanen: Tab darinya yang melingkar,
    expect(hapus).toBeEnabled();
    hapus.focus();
    fireEvent.keyDown(hapus, { key: 'Tab' });
    expect(medan).toHaveFocus();

    // dan Batal berhenti menjadi tepi, jadi Tab darinya tidak dicegat lagi.
    // Dua harapan ini bersama-sama membuktikan daftarnya DIHITUNG ULANG, bukan
    // disinggahkan saat dialog terbuka.
    batal.focus();
    fireEvent.keyDown(batal, { key: 'Tab' });
    expect(batal).toHaveFocus();
  });
});
