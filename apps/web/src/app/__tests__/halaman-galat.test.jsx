import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NotFound from '../not-found';
import Error from '../error';
import GlobalError, { IsiGalatGlobal } from '../global-error';

/**
 * HALAMAN GALAT (25 September 2026).
 *
 * Sebelum ini apps/web tak punya satu pun `error.jsx` maupun `not-found.jsx` di
 * seluruh 44 halamannya. Akibatnya galat di rute mana pun menampilkan layar
 * bawaan Next, dan URL salah ketik menampilkan 404 bawaan Next: berbahasa
 * Inggris, tanpa jalan pulang, dan tanpa tanda bahwa ini situs pemerintah
 * kabupaten. Untuk layanan yang justru dipakai orang saat sedang kesulitan, itu
 * merusak kepercayaan lebih cepat daripada fiturnya membangunnya.
 *
 * Yang paling penting dijaga berkas ini adalah penegasan terakhir di tiap blok:
 * `error.message` TIDAK BOLEH ikut terender. Pesan galat mentah dapat memuat
 * nama tabel, jalur berkas di peladen, atau potongan kueri. Yang ditampilkan
 * hanya `error.digest` -- kode acak yang menunjuk ke log peladen, sehingga
 * warga punya sesuatu untuk disebut saat melapor tanpa ada yang bocor.
 */
const PESAN_RAHASIA = 'PrismaClientKnownRequestError: relation "users" does not exist';

describe('not-found', () => {
  it('menjelaskan yang terjadi dalam bahasa Indonesia', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: /halaman tidak ditemukan/i })).toBeInTheDocument();
  });

  it('menyediakan jalan pulang', () => {
    // Root layout tak memuat navbar, jadi tanpa tautan ini halaman 404 menjadi
    // jalan buntu: tak ada satu pun cara kembali selain tombol back peramban.
    render(<NotFound />);

    expect(screen.getByRole('link', { name: /beranda/i })).toHaveAttribute('href', '/');
  });

  it('TIDAK menawarkan "coba lagi"', () => {
    // Mengulang 404 menjanjikan yang tak dapat ditepati. Alasan yang sama sudah
    // tertulis di komentar ErrorState untuk layar /survei/:id.
    render(<NotFound />);

    expect(screen.queryByRole('button', { name: /coba lagi/i })).not.toBeInTheDocument();
  });
});

describe('error', () => {
  const galat = (tambahan = {}) => Object.assign(new global.Error(PESAN_RAHASIA), tambahan);

  let konsol;

  beforeEach(() => {
    // `error.jsx` sengaja mencatat galatnya ke konsol sampai ada pemantauan
    // galat sungguhan. Dibungkam agar keluaran uji tetap bersih, lalu DITEGASKAN
    // di kasus terakhir supaya pembungkaman ini tak diam-diam menjadi cara
    // perilakunya hilang tanpa ada yang memerah.
    konsol = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => konsol.mockRestore());

  it('menjelaskan yang terjadi tanpa membocorkan pesan galat mentah', () => {
    render(<Error error={galat({ digest: 'a1b2c3d4' })} reset={jest.fn()} />);

    expect(screen.getByRole('heading', { name: /terjadi gangguan/i })).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(PESAN_RAHASIA, 'i'))).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('relation "users"');
  });

  it('menampilkan kode rujukan bila ada', () => {
    render(<Error error={galat({ digest: 'a1b2c3d4' })} reset={jest.fn()} />);

    expect(screen.getByText(/a1b2c3d4/)).toBeInTheDocument();
  });

  it('tidak menampilkan baris kode kosong bila digest tak ada', () => {
    // Next hanya mengisi `digest` pada build produksi. Baris "Kode:" yang
    // kosong membuat orang mengira ada yang gagal dimuat.
    render(<Error error={galat()} reset={jest.fn()} />);

    expect(screen.queryByText(/^Kode:/i)).not.toBeInTheDocument();
  });

  it('memanggil reset saat "coba lagi" ditekan', () => {
    const reset = jest.fn();
    render(<Error error={galat()} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('juga menyediakan jalan pulang, bukan hanya mengulang', () => {
    // Galat yang menetap membuat "coba lagi" jadi lingkaran. Tanpa tautan ini
    // pengguna terkurung di halaman yang sama.
    render(<Error error={galat()} reset={jest.fn()} />);

    expect(screen.getByRole('link', { name: /beranda/i })).toHaveAttribute('href', '/');
  });

  it('menyebutkan alamat pelaporan yang nyata', () => {
    render(<Error error={galat()} reset={jest.fn()} />);

    expect(screen.getByText(/diskominfo@madiunkab\.go\.id/i)).toBeInTheDocument();
  });

  it('mencatat galatnya ke konsol', () => {
    // Bukan pengganti pemantauan galat: yang tercetak di konsol peramban warga
    // tak pernah sampai ke siapa pun. Ini membuat galat terlihat saat ada yang
    // membuka DevTools, dan itulah satu-satunya yang dijanjikan.
    const e = galat();
    render(<Error error={e} reset={jest.fn()} />);

    expect(konsol).toHaveBeenCalledWith(e);
  });
});

describe('global-error', () => {
  /**
   * Yang diuji isinya, bukan pembungkusnya. Pembungkus wajib merender
   * `<html><body>` sendiri karena ia MENGGANTIKAN root layout yang gagal, dan
   * merender `<html>` di dalam `<div>` milik jsdom memicu peringatan penyarangan
   * yang mengotori keluaran uji tanpa membuktikan apa pun.
   */
  it('menjelaskan yang terjadi dan menyediakan cara memuat ulang', () => {
    const muatUlang = jest.fn();
    render(<IsiGalatGlobal digest="z9y8x7w6" onMuatUlang={muatUlang} />);

    expect(screen.getByRole('heading', { name: /terjadi gangguan/i })).toBeInTheDocument();
    expect(screen.getByText(/z9y8x7w6/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /muat ulang/i }));
    expect(muatUlang).toHaveBeenCalledTimes(1);
  });

  it('juga tidak membocorkan pesan galat mentah', () => {
    render(<IsiGalatGlobal digest={undefined} onMuatUlang={jest.fn()} />);

    expect(document.body.textContent).not.toContain('relation "users"');
    expect(screen.queryByText(/^Kode:/i)).not.toBeInTheDocument();
  });

  it('pembungkusnya merender html berbahasa Indonesia', () => {
    // Tanpa root layout, `lang` harus dipasang di sini sendiri; kalau tidak,
    // pembaca layar membacakan halaman ini dengan pelafalan yang salah.
    const elemen = GlobalError({ error: new global.Error(PESAN_RAHASIA) });

    expect(elemen.type).toBe('html');
    expect(elemen.props.lang).toBe('id');
  });
});
