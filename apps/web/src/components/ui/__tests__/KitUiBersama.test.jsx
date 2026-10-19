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

    const tombolHapus = screen.getAllByRole('button');
    fireEvent.click(tombolHapus[1]);

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
