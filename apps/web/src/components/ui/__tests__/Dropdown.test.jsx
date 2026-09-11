import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Dropdown from '../Dropdown';

/**
 * PENCARIAN DI DALAM DROPDOWN (permintaan pengguna 11 September 2026: "tambah
 * fitur search untuk mencari data opd pada tampilan pengaduan warga").
 *
 * Diuji di sini, pada komponen bersamanya, bukan hanya lewat formulir yang
 * memakainya: `Dropdown` dipakai puluhan tempat, dan yang paling penting
 * dijaga justru bahwa pemakai LAIN tidak ikut berubah. Karena itu uji pertama
 * di bawah adalah kontrol tanpa `searchable`.
 *
 * Angka yang melatarbelakanginya: daftar OPD berisi 62 instansi aktif
 * (terukur di basis data lokal), sementara panel dropdown hanya setinggi
 * 240px.
 */
const OPSI = [
  { label: 'Pilih Instansi', value: '' },
  { label: 'Dinas Kesehatan', value: '1' },
  { label: 'Dinas Pendidikan dan Kebudayaan', value: '2' },
  { label: 'Kecamatan Wonoasri', value: '3' },
];

const render1 = (props = {}) =>
  render(
    <Dropdown label="Instansi" id="opd" options={OPSI} value="" onChange={jest.fn()} {...props} />,
  );

const bukaPanel = () => fireEvent.click(screen.getByLabelText('Instansi'));
const medanCari = () => screen.getByRole('textbox', { name: /cari instansi/i });
const ketik = (kata) => fireEvent.change(medanCari(), { target: { value: kata } });
const pilihan = (nama) => screen.queryByRole('button', { name: nama });

describe('Dropdown — pencarian', () => {
  it('TANPA prop searchable, tak ada medan cari sama sekali (kontrol)', () => {
    // Penjaga bagi puluhan pemakai Dropdown yang lain. Tanpa uji ini,
    // menambahkan medan cari ke seluruh dropdown aplikasi tidak akan
    // memerahkan apa pun.
    render1();
    bukaPanel();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(pilihan('Dinas Kesehatan')).toBeInTheDocument();
    expect(pilihan('Kecamatan Wonoasri')).toBeInTheDocument();
  });

  it('menyaring pilihan menurut namanya', () => {
    render1({ searchable: true });
    bukaPanel();

    ketik('dinas');

    expect(pilihan('Dinas Kesehatan')).toBeInTheDocument();
    expect(pilihan('Dinas Pendidikan dan Kebudayaan')).toBeInTheDocument();
    expect(pilihan('Kecamatan Wonoasri')).not.toBeInTheDocument();
    // Penampung ikut tersaring, dan itu memang benar: "Pilih Instansi" bukan
    // instansi, jadi menyisakannya di antara hasil pencarian justru
    // membingungkan.
    expect(pilihan('Pilih Instansi')).not.toBeInTheDocument();
  });

  it('tidak peduli huruf besar-kecil maupun potongan di tengah nama', () => {
    // Nama OPD nyata panjang-panjang (terpanjang 97 karakter), jadi pengguna
    // hampir pasti mengetik potongan yang diingatnya, bukan awalan namanya.
    render1({ searchable: true });
    bukaPanel();

    ketik('WONOASRI');

    expect(pilihan('Kecamatan Wonoasri')).toBeInTheDocument();
    expect(pilihan('Dinas Kesehatan')).not.toBeInTheDocument();
  });

  it('bila tak ada yang cocok, daftarnya diganti keterangan', () => {
    render1({ searchable: true, emptySearchLabel: 'Tidak ada instansi yang cocok' });
    bukaPanel();

    ketik('zzz');

    expect(screen.getByText('Tidak ada instansi yang cocok')).toBeInTheDocument();
    expect(pilihan('Dinas Kesehatan')).not.toBeInTheDocument();
    // Medan carinya TETAP ada: tanpa itu pengguna yang salah ketik terjebak
    // pada panel kosong tanpa cara memperbaiki kata pencariannya.
    expect(medanCari()).toBeInTheDocument();
  });

  it('memilih hasil pencarian meneruskan nilainya lalu menutup panel', () => {
    const onChange = jest.fn();
    render1({ searchable: true, onChange });
    bukaPanel();

    ketik('wono');
    fireEvent.click(pilihan('Kecamatan Wonoasri'));

    expect(onChange).toHaveBeenCalledWith('3');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('kata pencarian tidak tertinggal saat panel dibuka lagi', () => {
    // Panel yang dibuka kembali dalam keadaan tersaring terlihat seperti
    // daftar yang kehilangan isinya -- pengguna tak punya petunjuk bahwa yang
    // menyembunyikannya adalah kata yang ia ketik beberapa saat lalu.
    render1({ searchable: true });
    bukaPanel();
    ketik('wono');
    bukaPanel();
    bukaPanel();

    expect(medanCari()).toHaveValue('');
    expect(pilihan('Dinas Kesehatan')).toBeInTheDocument();
  });
});
