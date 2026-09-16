import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BuilderLayout from '../BuilderLayout';
import BuilderSidebar from '../BuilderSidebar';
import BuilderCanvas from '../BuilderCanvas';
import BuilderToolbar from '../BuilderToolbar';

/**
 * BUILDER SATU LAYAR DI PONSEL (16 September 2026, laporan pengguna: builder
 * "menampilkan 2 layar atas dan bawah").
 *
 * Terukur di Chrome pada 360px dan 390px, layar setinggi 800px:
 *
 *   <aside> 304px  "w-full md:w-80 max-h-[38vh] ... overflow-y-auto"  <- palet
 *   <div>   432px  "flex-1 overflow-y-auto w-full"                     <- kanvas
 *   304 + 432 + 64 (bilah atas) = 800 = tinggi layar, habis terbagi dua
 *
 * Dua daerah gulir mandiri yang masing-masing memegang sebagian layar. Pada
 * 768px ke atas hanya ada satu, sebab susunannya berdampingan -- jadi cacat ini
 * hidup khusus di bawah `md`.
 *
 * `max-h-[38vh]` itu sendiri dulu perbaikan atas keluhan lain (24 Agustus 2026):
 * tanpanya palet memakan seluruh tinggi isinya dan kanvas cuma kebagian ~90px.
 * Yang keliru bukan angkanya, melainkan mengunci tinggi builder ke layar di
 * perangkat yang layarnya sependek itu. Di bawah `md` seluruh builder kini
 * menggulir sebagai SATU halaman, dan paletnya tertutup secara baku.
 *
 * jsdom tak memuat Tailwind dan tak menghitung tata letak, jadi berkas ini
 * menjaga kontrak kelas dan keadaan buka/tutupnya. Bukti bahwa daerah gulirnya
 * benar-benar tinggal satu datang dari pengukuran peramban, dilaporkan terpisah.
 */
describe('BuilderLayout — satu halaman di bawah md', () => {
  const pasang = () => render(<BuilderLayout>{<p>isi kanvas</p>}</BuilderLayout>);

  it('lapisan layar-penuh baru berlaku mulai md', () => {
    const { container } = pasang();

    const luar = container.firstChild;

    expect(luar.className).not.toMatch(/(^|\s)fixed\b/);
    expect(luar.className).toMatch(/\bmd:fixed\b/);
  });

  it('wadah kanvasnya tidak menggulir sendiri di layar sempit', () => {
    const { container } = pasang();

    const wadah = container.querySelector('[data-wadah-kanvas]');

    expect(wadah).not.toBeNull();
    expect(wadah.className).not.toMatch(/(^|\s)overflow-y-auto\b/);
    expect(wadah.className).toMatch(/\bmd:overflow-y-auto\b/);
  });

  /**
   * PASANGAN kontrol. Susunan dua kolom di layar lebar adalah inti builder ini;
   * membuat ponselnya satu layar dengan cara meratakan semuanya jadi satu kolom
   * di segala lebar menukar satu cacat dengan cacat yang lebih besar.
   */
  it('KONTROL: susunan dua kolom mulai md tetap ada', () => {
    const { container } = pasang();

    const dalam = container.querySelector('[data-baris-builder]');

    expect(dalam.className).toMatch(/\bmd:flex-row\b/);
    expect(dalam.className).toMatch(/\bflex-col\b/);
  });
});

describe('BuilderSidebar — palet yang bisa ditutup di ponsel', () => {
  it('tidak lagi dibatasi 38vh dan tidak menggulir sendiri di layar sempit', () => {
    const { container } = render(<BuilderSidebar />);

    const palet = container.querySelector('aside');

    expect(palet.className).not.toMatch(/max-h-\[38vh\]/);
    expect(palet.className).not.toMatch(/(^|\s)overflow-y-auto\b/);
  });

  it('menyediakan tombol pengalih yang hanya muncul di bawah md', () => {
    render(<BuilderSidebar />);

    const tombol = screen.getByRole('button', { name: /tambah pertanyaan/i });

    expect(tombol.className).toMatch(/\bmd:hidden\b/);
  });

  /**
   * Mulai `md` pembungkusnya DILARUTKAN dengan `display: contents`, bukan
   * dijadikan `flex`. Kotak tips memakai `mt-auto` untuk menempel ke dasar
   * palet, dan `auto` mengukur induk terdekatnya: dengan pembungkus `flex` ia
   * mengukur tinggi pembungkus, lalu tipsnya melompat naik merapat ke daftar
   * komponen. `contents` mengembalikan ketiga bagian menjadi anak langsung
   * <aside>, jadi susunan layar lebar tetap sama persis seperti sebelum panel
   * ini ada.
   */
  it('isinya tertutup secara baku di layar sempit, larut mulai md', () => {
    const { container } = render(<BuilderSidebar />);

    const isi = container.querySelector('[data-isi-palet]');

    expect(isi).not.toBeNull();
    expect(isi.className).toMatch(/(^|\s)hidden\b/);
    expect(isi.className).toMatch(/\bmd:contents\b/);
  });

  it('menekan tombolnya membuka isinya', () => {
    const { container } = render(<BuilderSidebar />);

    fireEvent.click(screen.getByRole('button', { name: /tambah pertanyaan/i }));

    const isi = container.querySelector('[data-isi-palet]');

    expect(isi.className).not.toMatch(/(^|\s)hidden\b/);
  });

  it('keadaan buka/tutupnya diumumkan ke pembaca layar', () => {
    render(<BuilderSidebar />);

    const tombol = screen.getByRole('button', { name: /tambah pertanyaan/i });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(tombol);

    expect(tombol).toHaveAttribute('aria-expanded', 'true');
  });

  /**
   * PASANGAN kontrol. Palet yang "satu layar" karena isinya dicabut dari DOM
   * juga meluluskan uji di atas, sambil membuang satu-satunya cara menambah
   * pertanyaan.
   */
  it('KONTROL: seluruh kendali penambah pertanyaan tetap ada', () => {
    render(<BuilderSidebar />);

    expect(screen.getByRole('button', { name: /tambah 9 unsur baku/i })).toBeInTheDocument();
    for (const label of ['Skala Nilai 1-4', 'Pilihan Ganda', 'Uraian']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});

describe('BuilderCanvas — tidak menggulir sendiri di bawah md', () => {
  it('gulirannya sendiri baru berlaku mulai md', () => {
    const { container } = render(<BuilderCanvas questions={[]} title="Coba" periode={null} />);

    const kanvas = container.querySelector('main');

    expect(kanvas.className).not.toMatch(/(^|\s)overflow-y-auto\b/);
    expect(kanvas.className).toMatch(/\bmd:overflow-y-auto\b/);
  });
});

/**
 * GARIS MELINTANG DI ATAS BILAH PALET, HANYA DI 320px (16 September 2026,
 * laporan pengguna).
 *
 * Terukur di Chrome, dan batasnya tajam:
 *
 *   320px  navbar admin (z=40) 77px | bilah builder (z=50) 64px -> 13px mengintip
 *   360px  64px | 64px -> tertutup rapat
 *   390px  64px | 64px -> tertutup rapat
 *
 * Di 320px isi navbar admin membungkus sehingga ia tumbuh jadi 77px, sementara
 * bilah atas builder mematok `h-16` = 64px. Sisa 13px berikut garis bawahnya
 * muncul sebagai garis melintang penuh lebar.
 *
 * Tokennya sendiri TIDAK salah: `--tinggi-navbar-opd` ikut berubah jadi 77px di
 * <=320px dan <main> menyisakan 93px, jadi halaman admin lain aman. Yang tak
 * mengikuti token itu hanya bilah ini. Angka 64 yang ditulis tangan itulah
 * sumbernya, dan mengikatnya ke token membuat keduanya tak bisa lagi berselisih.
 */
describe('BuilderToolbar — menutup navbar yang ditimpanya', () => {
  it('tingginya mengikuti token navbar, bukan angka yang ditulis tangan', () => {
    const { container } = render(<BuilderToolbar />);

    const bilah = container.querySelector('header');

    expect(bilah.className).not.toMatch(/(^|\s)h-16\b/);
    expect(bilah.className).toMatch(/min-h-\[var\(--tinggi-navbar-opd\)\]/);
  });

  /**
   * PASANGAN kontrol. Di `md` ke atas builder menjadi lapisan `fixed` sendiri
   * dan navbar admin tak lagi ikut bermain, jadi tinggi 72px di sana memang
   * miliknya sendiri dan harus bertahan.
   */
  it('KONTROL: tinggi khusus md tetap dipertahankan', () => {
    const { container } = render(<BuilderToolbar />);

    // Tanpa `\b` di ujung: `]` dan spasi sama-sama bukan karakter kata, jadi
    // batas kata di sana tak pernah cocok dan ujinya memerah tanpa sebab.
    const bilah = container.querySelector('header');

    expect(bilah.className).toMatch(/md:h-\[72px\]/);
    // `min-height` MENGALAHKAN `height` bila ia lebih besar. Tanpa penyetelan
    // ulang ini, batas 80px dari token ikut berlaku di md dan bilah tumbuh jadi
    // 80px -- menimpa 8px pertama kanvas, yang barisnya hanya menyisakan 72px.
    // Terukur di Chrome: 80px di 768/1024/1280 sebelum `md:min-h-0` dipasang.
    expect(bilah.className).toMatch(/md:min-h-0/);
  });
});

/**
 * BILAH PALET MENEMPEL DI BAWAH NAVBAR (16 September 2026, permintaan pengguna).
 *
 * Sejak builder menggulir sebagai satu halaman, bilah "Tambah Pertanyaan"
 * tertinggal di atas dan harus dikejar setiap kali hendak menambah pertanyaan.
 */
describe('BuilderSidebar — bilahnya mengikuti navbar di ponsel', () => {
  it('menempel di bawah navbar, dan hanya di bawah md', () => {
    const { container } = render(<BuilderSidebar />);

    const palet = container.querySelector('aside');

    expect(palet.className).toMatch(/(^|\s)sticky\b/);
    expect(palet.className).toMatch(/top-\[var\(--tinggi-navbar-opd\)\]/);
    expect(palet.className).toMatch(/\bmd:static\b/);
  });

  /**
   * Panel yang terbuka DAN menempel akan menutupi kanvas yang sedang disusun.
   * Menutup sendiri sesudah pertanyaan ditambahkan yang membuat keduanya bisa
   * hidup bersama.
   */
  it('menutup sendiri sesudah unsur baku ditambahkan', () => {
    const onAddBaku = jest.fn();
    const { container } = render(<BuilderSidebar canDrag onAddBaku={onAddBaku} />);
    fireEvent.click(screen.getByRole('button', { name: /tambah pertanyaan/i }));

    fireEvent.click(screen.getByRole('button', { name: /tambah 9 unsur baku/i }));

    expect(onAddBaku).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-isi-palet]').className).toMatch(/(^|\s)hidden\b/);
  });

  it('menutup sendiri sesudah komponen kustom ditambahkan', () => {
    const onAddCustom = jest.fn();
    const { container } = render(<BuilderSidebar canDrag onAddCustom={onAddCustom} />);
    fireEvent.click(screen.getByRole('button', { name: /tambah pertanyaan/i }));

    fireEvent.click(screen.getByText('Skala Nilai 1-4'));

    expect(onAddCustom).toHaveBeenCalledWith('Skala Penilaian 1-4');
    expect(container.querySelector('[data-isi-palet]').className).toMatch(/(^|\s)hidden\b/);
  });
});
