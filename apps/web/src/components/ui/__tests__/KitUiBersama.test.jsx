import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../Table';
import Pagination from '../Pagination';
import Select from '../Select';
import Switch from '../Switch';
import Badge from '../Badge';
import StarRating from '../StarRating';
import FileDropzone from '../FileDropzone';
import ImageViewer from '../ImageViewer';

/**
 * TC-FE-046 — Kit UI bersama.
 *
 * Delapan komponen yang dipakai berulang di hampir setiap halaman, dan sampai
 * 3 September 2026 tak satu pun punya kasus uji. Kerusakan pada komponen
 * bersama tidak berhenti di satu layar — ia menular ke setiap halaman yang
 * memakainya sekaligus, dan justru karena itu paling mahal ditemukan terlambat.
 *
 * Yang diuji adalah kontrak pemakaiannya: apa yang dirender, keadaan apa yang
 * dipatuhi, dan interaksi apa yang benar-benar diteruskan ke pemanggil.
 */

describe('Table (TC-FE-046)', () => {
  it('merender struktur tabel semantik, bukan tumpukan div', () => {
    render(
      <Table>
        <Thead>
          <Tr>
            <Th>Nama OPD</Th>
            <Th>Nilai IKM</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Dinas Kesehatan</Td>
            <Td>88.3</Td>
          </Tr>
        </Tbody>
      </Table>,
    );

    // Peran tabel sungguhan menentukan: pembaca layar mengumumkan jumlah baris
    // & kolom dan mengizinkan penelusuran per sel. Tumpukan div tidak.
    const tabel = screen.getByRole('table');
    expect(within(tabel).getAllByRole('columnheader')).toHaveLength(2);
    expect(within(tabel).getByRole('cell', { name: 'Dinas Kesehatan' })).toBeInTheDocument();
  });

  it('membiarkan isi lebar bergulir sendiri tanpa mendorong halaman', () => {
    const { container } = render(
      <Table>
        <Tbody>
          <Tr>
            <Td>satu</Td>
          </Tr>
        </Tbody>
      </Table>,
    );

    // Tabel lebar harus bergulir DI DALAM wadahnya; tanpa ini seluruh halaman
    // ikut bergeser mendatar di ponsel.
    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });
});

describe('Pagination (TC-FE-046)', () => {
  const render1 = (over = {}) =>
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={47}
        itemsPerPage={10}
        itemName="OPD"
        onPageChange={jest.fn()}
        {...over}
      />,
    );

  it('menghitung rentang baris yang sedang ditampilkan', () => {
    render1();
    expect(screen.getByText('Menampilkan 11-20 dari 47 OPD')).toBeInTheDocument();
  });

  it('memotong rentang pada halaman terakhir yang tak penuh', () => {
    render1({ currentPage: 5 });
    // 41-47, bukan 41-50: halaman terakhir hanya berisi 7 baris.
    expect(screen.getByText('Menampilkan 41-47 dari 47 OPD')).toBeInTheDocument();
  });

  it('menampilkan 0-0 ketika tak ada data sama sekali', () => {
    render1({ currentPage: 1, totalItems: 0, totalPages: 1 });
    // "Menampilkan 1-0" akan terbaca sebagai kekeliruan hitung.
    expect(screen.getByText('Menampilkan 0-0 dari 0 OPD')).toBeInTheDocument();
  });

  it('mengunci tombol mundur di halaman pertama dan maju di halaman terakhir', () => {
    const { rerender } = render1({ currentPage: 1 });
    let tombol = screen.getAllByRole('button');
    expect(tombol[0]).toBeDisabled();
    expect(tombol[1]).toBeEnabled();

    rerender(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalItems={47}
        itemsPerPage={10}
        itemName="OPD"
        onPageChange={jest.fn()}
      />,
    );
    tombol = screen.getAllByRole('button');
    expect(tombol[0]).toBeEnabled();
    expect(tombol[1]).toBeDisabled();
  });

  it('meneruskan nomor halaman tujuan, bukan sekadar memberi tahu ada klik', () => {
    const onPageChange = jest.fn();
    render1({ onPageChange });

    const [mundur, maju] = screen.getAllByRole('button');
    fireEvent.click(maju);
    fireEvent.click(mundur);

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1);
  });
});

describe('Select (TC-FE-046)', () => {
  it('menautkan label ke kotak pilihannya', () => {
    render(
      <Select
        id="periode"
        label="Periode"
        options={[
          { value: '2026-Q1', label: 'Triwulan I' },
          { value: '2026-Q2', label: 'Triwulan II' },
        ]}
        onChange={jest.fn()}
        defaultValue="2026-Q1"
      />,
    );

    // Tanpa tautan label, pembaca layar hanya menyebut "kotak kombo".
    expect(screen.getByLabelText('Periode')).toBeInTheDocument();
  });

  it('menerima daftar string biasa selain daftar objek', () => {
    render(<Select id="jenis" options={['Semua', 'Aktif']} onChange={jest.fn()} defaultValue="Semua" />);

    expect(screen.getByRole('option', { name: 'Semua' })).toHaveValue('Semua');
    expect(screen.getByRole('option', { name: 'Aktif' })).toHaveValue('Aktif');
  });

  it('menjadikan placeholder pilihan yang tak dapat dipilih', () => {
    render(
      <Select
        id="opd"
        placeholder="Pilih Instansi"
        options={[{ value: '1', label: 'Dinas Kesehatan' }]}
        onChange={jest.fn()}
        defaultValue=""
      />,
    );

    // Placeholder yang bisa dipilih akan terkirim sebagai nilai kosong.
    expect(screen.getByRole('option', { name: 'Pilih Instansi' })).toBeDisabled();
  });
});

describe('Switch (TC-FE-046)', () => {
  it('mengumumkan keadaannya lewat role & aria-checked', () => {
    render(<Switch checked onChange={jest.fn()} aria-label="Status akun" />);

    const sakelar = screen.getByRole('switch', { name: 'Status akun' });
    expect(sakelar).toHaveAttribute('aria-checked', 'true');
  });

  it('meneruskan keadaan LAWAN dari yang sekarang', () => {
    const onChange = jest.fn();
    const { rerender } = render(<Switch checked={false} onChange={onChange} aria-label="Aktif" />);

    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<Switch checked onChange={onChange} aria-label="Aktif" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('bertipe button sehingga tak ikut mengirim formulir induknya', () => {
    render(<Switch checked={false} onChange={jest.fn()} aria-label="Aktif" />);
    // Tanpa type="button", menekannya di dalam <form> mengirim formulir.
    expect(screen.getByRole('switch')).toHaveAttribute('type', 'button');
  });
});

describe('Badge (TC-FE-046)', () => {
  it('memakai gaya sesuai variannya', () => {
    render(<Badge variant="success">Aktif</Badge>);
    expect(screen.getByText('Aktif')).toHaveClass('bg-green-100');
  });

  it('jatuh ke varian bawaan untuk nama yang tak dikenal', () => {
    // Salah ketik nama varian tak boleh menghasilkan lencana tanpa gaya sama
    // sekali — teks gelap di atas latar gelap tak terbaca.
    render(<Badge variant="ungu-muda">Entah</Badge>);
    expect(screen.getByText('Entah')).toHaveClass('bg-surface-container-high');
  });
});

describe('StarRating (TC-FE-046)', () => {
  it('mengisi bintang sebanyak nilainya dan menyisakan sisanya kosong', () => {
    const { container } = render(<StarRating score={3} max={5} />);

    const bintang = container.querySelectorAll('svg');
    expect(bintang).toHaveLength(5);
    expect(Array.from(bintang).filter((b) => b.classList.contains('fill-primary'))).toHaveLength(3);
  });

  it('tidak mengisi satu bintang pun untuk nilai nol', () => {
    const { container } = render(<StarRating score={0} max={4} />);

    expect(container.querySelectorAll('svg')).toHaveLength(4);
    expect(container.querySelectorAll('.fill-primary')).toHaveLength(0);
  });
});

describe('FileDropzone (TC-FE-046)', () => {
  const berkas = (nama, tipe = 'image/png') => new File(['isi'], nama, { type: tipe });

  it('menyebut batas ukuran dan format yang diterima', () => {
    render(<FileDropzone files={[]} onFilesChange={jest.fn()} maxSizeMB={5} />);
    expect(screen.getByText(/Maksimal ukuran file 5MB per file/)).toBeInTheDocument();
  });

  it('menambahkan berkas terpilih pada daftar yang sudah ada, bukan menggantinya', () => {
    const onFilesChange = jest.fn();
    const lama = berkas('bukti-lama.png');
    const { container } = render(<FileDropzone files={[lama]} onFilesChange={onFilesChange} />);

    const baru = berkas('bukti-baru.png');
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [baru] },
    });

    // Menggantinya akan membuang lampiran yang sudah dipilih warga tanpa
    // pemberitahuan apa pun.
    expect(onFilesChange).toHaveBeenCalledWith([lama, baru]);
  });

  it('membuang hanya berkas yang ditekan silangnya', () => {
    const onFilesChange = jest.fn();
    const a = berkas('a.png');
    const b = berkas('b.png');
    const c = berkas('c.png');
    render(<FileDropzone files={[a, b, c]} onFilesChange={onFilesChange} />);

    // Dahulu `screen.getAllByRole('button')` lalu `[1]`. Indeks itu bergeser
    // begitu zona lampirannya sendiri menjadi tombol sungguhan (23 Oktober
    // 2026), dan ia memang menebak lewat POSISI -- cacat uji yang sama dengan
    // BUG-010. Namanya yang dipakai sekarang.
    // Nama tombol berubah 26 Oktober 2026 (BUG-034): kini menyertakan nomor
    // urut lampirannya, sebab nama berkas saja tak dijamin unik.
    fireEvent.click(screen.getByRole('button', { name: 'Hapus lampiran 2: b.png' }));

    expect(onFilesChange).toHaveBeenCalledWith([a, c]);
  });

  it('menerima berkas yang diseret ke atasnya', () => {
    const onFilesChange = jest.fn();
    const { container } = render(<FileDropzone files={[]} onFilesChange={onFilesChange} />);
    const zona = container.querySelector('.border-dashed');

    const diseret = berkas('seret.png');
    fireEvent.drop(zona, { dataTransfer: { files: [diseret] } });

    expect(onFilesChange).toHaveBeenCalledWith([diseret]);
  });

  /**
   * AKSES KEYBOARD (23 Oktober 2026).
   *
   * Zonanya sebuah `div` ber-`onClick`, tanpa `tabIndex`, tanpa `role`, tanpa
   * `onKeyDown`, dan inputnya `display: none` -- jadi tak dapat difokus dan tak
   * ada di pohon aksesibilitas. Warga yang memakai keyboard karena itu TIDAK
   * DAPAT melampirkan bukti ke pengaduannya sama sekali.
   *
   * Cacat yang sama persis sudah diperbaiki 21 September 2026 di
   * `AdminResolutionWorkspace.jsx` dan `ChatReplyForm.jsx`, berikut komentar di
   * sana: "itu fungsi yang hilang, bukan sekadar nama yang kurang". Dropzone
   * warga terlewat.
   *
   * Dibuat `<button>` sungguhan, bukan `div` ber-`role="button"` + `tabIndex`:
   * fokus, Enter, dan Spasi datang dari peramban, dan namanya datang dari
   * tulisan yang sudah tampak di layar.
   */
  it('zona lampiran adalah tombol sungguhan, jadi dapat dicapai keyboard', () => {
    render(<FileDropzone files={[]} onFilesChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: /Klik atau seret berkas/i })).toBeInTheDocument();
  });

  it('tombol hapus menyebut berkas mana yang dibuangnya', () => {
    render(<FileDropzone files={[berkas('bukti-jalan.png')]} onFilesChange={jest.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Hapus lampiran 1: bukti-jalan.png' }),
    ).toBeInTheDocument();
  });

  /**
   * BUG-007. Batas backend: `image/jpeg`, `image/png`, `image/webp`,
   * `application/pdf`; 5 MB; 5 berkas (`attachment.util.ts`,
   * `complaints.constants.ts:32`, `complaints.controller.ts:66`).
   *
   * Ini penghemat waktu dan kuota, BUKAN lapisan keamanan: backend memeriksa
   * angka ajaib isi berkas, bukan `Content-Type` yang dikirim peramban, jadi
   * `.exe` bernama `.png` tetap tertolak di sana. Jangan pernah mengandalkan
   * pemeriksaan di sini untuk apa pun yang menyangkut keamanan.
   */
  it('BUG-007: menolak jenis yang tak diterima backend lewat pemilih berkas', () => {
    const onFilesChange = jest.fn();
    const { container } = render(<FileDropzone files={[]} onFilesChange={onFilesChange} />);

    const sah = berkas('bukti.png');
    const tidakSah = berkas('animasi.gif', 'image/gif');
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [sah, tidakSah] },
    });

    // Yang sah tetap diterima: menolak seluruh kumpulan berarti warga
    // kehilangan pilihan yang sudah benar. Disetujui tersurat pengguna.
    expect(onFilesChange).toHaveBeenCalledWith([sah]);
  });

  /**
   * Jalur kedua yang membuat usulan asli BUG-007 belum cukup: `accept` HANYA
   * menyaring kotak dialog pemilih berkas, dan tak berlaku sama sekali bagi
   * berkas yang DIJATUHKAN. Zona ini mengiklankan seret-lepas tersurat ("Klik
   * atau seret berkas"), jadi `.exe` tetap masuk lewat seretan walau `accept`
   * sudah benar. Pemeriksaannya duduk di satu fungsi yang dipanggil KEDUA
   * jalur.
   */
  it('BUG-007: menolak jenis yang tak diterima backend lewat SERET-LEPAS', () => {
    const onFilesChange = jest.fn();
    const { container } = render(<FileDropzone files={[]} onFilesChange={onFilesChange} />);
    const zona = container.querySelector('.border-dashed');

    const sah = berkas('bukti.webp', 'image/webp');
    const tidakSah = berkas('pemasang.exe', 'application/x-msdownload');
    fireEvent.drop(zona, { dataTransfer: { files: [sah, tidakSah] } });

    expect(onFilesChange).toHaveBeenCalledWith([sah]);
  });

  it('BUG-007: menolak berkas yang melebihi batas ukuran', () => {
    const onFilesChange = jest.fn();
    const { container } = render(
      <FileDropzone files={[]} onFilesChange={onFilesChange} maxSizeMB={5} />,
    );

    const besar = new File([new ArrayBuffer(6 * 1024 * 1024)], 'foto-besar.png', {
      type: 'image/png',
    });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [besar] },
    });

    // Inilah kerugian yang membuat temuan ini ada: warga di ponsel berkuota
    // terbatas mengunggah 6 MB sampai tuntas, baru ditolak.
    expect(onFilesChange).not.toHaveBeenCalled();
  });

  it('BUG-007: menolak berkas keenam, sebab backend hanya menerima lima', () => {
    const onFilesChange = jest.fn();
    const sudahAda = ['a', 'b', 'c', 'd'].map((n) => berkas(n + '.png'));
    const { container } = render(
      <FileDropzone files={sudahAda} onFilesChange={onFilesChange} />,
    );

    const kelima = berkas('e.png');
    const keenam = berkas('f.png');
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [kelima, keenam] },
    });

    // Tanpa penjaga ini, melampirkan tujuh berkas membuat SELURUH unggahan
    // gagal di backend sesudah ketujuhnya terkirim.
    expect(onFilesChange).toHaveBeenCalledWith([...sudahAda, kelima]);
  });

  /**
   * `role="status"` supaya penolakannya TERDENGAR. Tanpa itu pengguna tunanetra
   * hanya mengalami berkasnya tak muncul, tanpa sebab apa pun di layar.
   */
  it('BUG-007: melaporkan penolakannya beserta nama berkas dan alasannya', async () => {
    const { container } = render(<FileDropzone files={[]} onFilesChange={jest.fn()} />);

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [berkas('animasi.gif', 'image/gif')] },
    });

    const kabar = await screen.findByRole('status');
    expect(kabar).toHaveTextContent('animasi.gif');
    expect(kabar).toHaveTextContent(/GIF/);
  });

  it('BUG-007: WEBP diterima, dan teks di layar menyebutnya', () => {
    const onFilesChange = jest.fn();
    const { container } = render(<FileDropzone files={[]} onFilesChange={onFilesChange} />);

    // Teks lama berbunyi "Format: JPG, PNG, PDF" -- lebih sempit daripada yang
    // backend sungguh terima, jadi warga diberi tahu daftar yang salah.
    expect(screen.getByText(/WEBP/)).toBeInTheDocument();

    const webp = berkas('bukti.webp', 'image/webp');
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [webp] },
    });
    expect(onFilesChange).toHaveBeenCalledWith([webp]);
  });

  /**
   * Label lama berbunyi "File berhasil diunggah" begitu berkas DIPILIH, padahal
   * belum satu bita pun dikirim: `onFilesChange` hanya menaruhnya di state
   * pemanggil, dan unggahannya baru terjadi saat formulirnya disubmit. Warga
   * yang menutup tab di titik itu meyakini lampirannya sudah aman.
   */
  it('tidak mengaku berkasnya sudah terunggah padahal baru dipilih', () => {
    render(<FileDropzone files={[berkas('bukti.png')]} onFilesChange={jest.fn()} />);

    expect(screen.queryByText(/berhasil diunggah/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Siap dikirim/i)).toBeInTheDocument();
  });

  /**
   * QA-01, dari perburuan bug 23 Oktober 2026 atas perubahan hari itu sendiri.
   *
   * `saringBerkas` memutuskan dengan `JENIS_DITERIMA[file.type]`, sebuah
   * pencarian pada objek literal -- dan pencarian itu ikut menemukan anggota
   * `Object.prototype`. `JENIS_DITERIMA['constructor']` bernilai fungsi
   * `Object`, `JENIS_DITERIMA['__proto__']` bernilai `Object.prototype`;
   * keduanya truthy, jadi berkasnya lolos gerbang jenis.
   *
   * Pagarnya dipasang DI SINI, bukan dibiarkan di `qa-bug-hunt/repros/`, sebab
   * folder itu mengabaikan dirinya sendiri lewat `.gitignore` berisi `*` --
   * satu-satunya uji yang membuktikan cacat ini pernah ada akan hilang dari
   * repo begitu perbaikannya di-commit.
   *
   * Tanpa dampak keamanan: backend memeriksa angka ajaib ISI berkas, bukan
   * `Content-Type` dari peramban, jadi apa pun yang lolos di sini tetap
   * tertolak di sana.
   */
  it.each(['constructor', '__proto__'])(
    'QA-01: menolak berkas ber-type %p, yang bukan satu pun jenis yang diizinkan',
    (type) => {
      const onFilesChange = jest.fn();
      const { container } = render(<FileDropzone files={[]} onFilesChange={onFilesChange} />);

      fireEvent.change(container.querySelector('input[type="file"]'), {
        target: { files: [new File(['isi'], 'jahat.png', { type })] },
      });

      expect(onFilesChange).not.toHaveBeenCalled();
    },
  );

  /**
   * KENDALI, dan ia merekam MENGAPA cacat di atas hanya menyangkut dua untai.
   * Konstruktor `File` membakukan `type` ke huruf kecil, jadi `'toString'`
   * tersimpan sebagai `'tostring'` -- bukan anggota `Object.prototype`, karena
   * itu tertolak dengan benar bahkan sebelum perbaikannya ada. Terukur:
   * `new File(['x'], 'a.png', { type: 'toString' }).type === 'tostring'`.
   */
  it('QA-01 kendali: anggota prototipe berhuruf campuran memang sudah tertolak', () => {
    const onFilesChange = jest.fn();
    const { container } = render(<FileDropzone files={[]} onFilesChange={onFilesChange} />);

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['isi'], 'jahat.png', { type: 'toString' })] },
    });

    expect(onFilesChange).not.toHaveBeenCalled();
  });

  /**
   * QA-02, dari perburuan yang sama.
   *
   * Alasan penolakan dibangun dari `(file.size / 1024 / 1024).toFixed(2)` lalu
   * disandingkan dengan label batas `${maxSizeMB}MB`. `toFixed` membulatkan ke
   * yang TERDEKAT, jadi berkas yang hanya sedikit melewati batas tercetak
   * "5.00 MB" -- dan kalimatnya menyatakan bahwa 5.00 MB melebihi batas 5MB.
   *
   * Penolakannya sendiri benar; yang cacat kalimatnya. Jangkauannya luas:
   * batasnya 5 MiB sementara foto ponsel lazimnya 4-6 MB, jadi inilah golongan
   * berkas yang paling sering ditolak.
   */
  it('QA-02: alasan penolakan ukuran tak pernah menyandingkan dua angka yang sama', async () => {
    const { container } = render(
      <FileDropzone files={[]} onFilesChange={jest.fn()} maxSizeMB={5} />,
    );

    // 5 MiB + 5.000 byte = 5,00476 MiB. Dibulatkan ke terdekat ia "5.00";
    // dibulatkan ke ATAS ia "5,01" dan klaimnya menjadi benar.
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: {
        files: [
          new File([new ArrayBuffer(5 * 1024 * 1024 + 5000)], 'foto.jpg', { type: 'image/jpeg' }),
        ],
      },
    });

    const kabar = await screen.findByRole('status');
    expect(kabar).toHaveTextContent('foto.jpg: ukurannya 5,01 MB, melebihi batas 5,00 MB');
  });

  /**
   * Akibat kerapian dari QA-02, bukan temuan tersendiri: begitu kalimat
   * penolakan memakai koma sebagai pemisah desimal -- kaidah bahasa Indonesia,
   * dan bahasa repo ini -- daftar berkas terpilih di komponen yang SAMA tak
   * boleh tetap memakai titik.
   */
  it('menulis ukuran berkas dengan koma, bukan titik', () => {
    const satuSetengahMib = new File([new ArrayBuffer(1024 * 1024 + 512 * 1024)], 'bukti.png', {
      type: 'image/png',
    });
    render(<FileDropzone files={[satuSetengahMib]} onFilesChange={jest.fn()} />);

    expect(screen.getByText(/bukti\.png \(1,50 MB\)/)).toBeInTheDocument();
  });

  /**
   * BUG-034 (QA-03), dari perburuan bug 26 Oktober 2026 atas perbaikan BUG-031.
   *
   * `aria-label` tombol hapus dibangun dari `file.name`, dan daftar lampiran
   * tak menyaring kembar -- jadi dua lampiran bernama sama menghasilkan dua
   * tombol bernama identik, "Hapus bukti.png". Pembaca layar tak dapat
   * membedakannya, dan `getByRole` melempar "Found multiple elements".
   *
   * Terjangkau dua klik: `handleFileSelect` sengaja menyetel ulang nilai
   * inputnya sesudah tiap pilihan, jadi berkas yang SAMA dapat dipilih dua
   * kali.
   *
   * Pemisahan yang perlu dibaca tepat: daftar yang memuat kembar itu perilaku
   * LAMA. Yang baru nama aksesibelnya (BUG-031, 23 Oktober) -- sebelumnya
   * kedua tombol sama-sama tak bernama, sesudahnya keduanya bernama SAMA.
   *
   * Pagar ini DIPINDAHKAN dari `qa-bug-hunt/repros/`, folder yang mengabaikan
   * dirinya sendiri: dibiarkan di sana, satu-satunya uji yang membuktikan
   * cacat ini pernah ada akan hilang dari repo begitu perbaikannya di-commit.
   *
   * Apakah kembar seharusnya DITOLAK adalah pertanyaan produk yang terpisah
   * dan belum diputuskan; perbaikan ini sengaja hanya membuat namanya unik.
   */
  it('BUG-034: dua lampiran bernama sama tetap punya tombol hapus yang dapat dibedakan', () => {
    const kembar = [berkas('bukti.png'), berkas('bukti.png')];
    render(<FileDropzone files={kembar} onFilesChange={jest.fn()} />);

    const nama = screen
      .getAllByRole('button', { name: /^Hapus / })
      .map((tombol) => tombol.getAttribute('aria-label'));

    expect(nama).toHaveLength(2);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it('BUG-034: tombol hapus lampiran kedua dari dua kembar membuang yang kedua', () => {
    const onFilesChange = jest.fn();
    const pertama = berkas('bukti.png');
    const kedua = berkas('bukti.png');
    render(<FileDropzone files={[pertama, kedua]} onFilesChange={onFilesChange} />);

    // Dahulu mustahil ditulis: nama yang sama membuat `getByRole` melempar
    // "Found multiple elements", dan uji terpaksa menebak lewat posisi.
    fireEvent.click(screen.getByRole('button', { name: 'Hapus lampiran 2: bukti.png' }));

    // Yang tersisa objek PERTAMA, bukan sekadar "satu berkas bernama bukti.png".
    expect(onFilesChange).toHaveBeenCalledWith([pertama]);
  });
});

describe('ImageViewer (TC-FE-046)', () => {
  it('menampilkan gambar kecil beserta teks alternatifnya', () => {
    render(<ImageViewer src="/uploads/bukti.png" alt="Foto jalan berlubang" />);

    const gambar = screen.getByAltText('Foto jalan berlubang');
    expect(gambar).toHaveAttribute('src', '/uploads/bukti.png');
  });

  it('membuka dan menutup tampilan layar penuh', () => {
    render(<ImageViewer src="/uploads/bukti.png" alt="Foto jalan berlubang" />);

    fireEvent.click(screen.getByAltText('Foto jalan berlubang'));
    // Dua salinan: yang kecil tetap di halaman, yang besar di lightbox.
    expect(screen.getAllByAltText('Foto jalan berlubang')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByAltText('Foto jalan berlubang')).toHaveLength(1);
  });
});
