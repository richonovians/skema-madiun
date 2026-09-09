import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GerbangPengisianBersesi from '../GerbangPengisianBersesi';

/**
 * GERBANG OPSI ANONIM bagi pengguna yang SUDAH login (permintaan pengguna
 * 8 September 2026: "sebelum pengguna mengisi survei muncul tampilan opsi
 * anonim").
 *
 * MENGGANTIKAN PernyataanTanpaNama.test.jsx, yang dihapus bersama komponennya.
 * Berkas itu menjaga keputusan sebaliknya, yaitu pernyataan pasif tanpa
 * pilihan, dengan alasan yang waktu itu benar: tak ada yang direkam, jadi tak
 * ada yang dapat dipilih untuk tidak direkam. Alasan itu gugur pada hari yang
 * sama ketika pengguna meminta nama direkam.
 *
 * Yang diuji di sini adalah bahwa pilihannya benar-benar diteruskan dan
 * naskahnya tidak menjanjikan lebih dari yang dijamin kode. Penegakan
 * sesungguhnya ada di backend: `ResponsesService.submit` yang membaca
 * `tanpaDataDiri` lalu memutuskan menyalin data diri akun atau tidak.
 */
const render1 = (props = {}) => render(<GerbangPengisianBersesi onMulai={jest.fn()} {...props} />);

const kotakAnonim = () => screen.getByRole('checkbox', { name: /sebagai anonim/i });
const tombolMulai = () => screen.getByRole('button', { name: /mulai isi survei/i });

describe('GerbangPengisianBersesi', () => {
  it('baku TIDAK anonim, dan tombolnya tetap dapat ditekan', () => {
    // Tidak mencentang apa pun adalah pilihan yang sah di sini (mengisi dengan
    // nama), berbeda dari gerbang PDP publik yang menunggu satu persetujuan
    // wajib. Tombol yang mati akan menjebak pengisi yang memang tak ingin
    // anonim.
    const onMulai = jest.fn();
    render1({ onMulai });

    expect(kotakAnonim()).not.toBeChecked();
    expect(tombolMulai()).toBeEnabled();

    fireEvent.click(tombolMulai());

    expect(onMulai).toHaveBeenCalledWith({ anonim: false });
  });

  it('meneruskan pilihan anonim saat dicentang', () => {
    const onMulai = jest.fn();
    render1({ onMulai });

    fireEvent.click(kotakAnonim());
    fireEvent.click(tombolMulai());

    expect(onMulai).toHaveBeenCalledWith({ anonim: true });
  });

  it('keterangannya berubah mengikuti pilihannya', () => {
    // Pengisi perlu tahu apa yang berlaku pada dirinya sekarang, bukan daftar
    // dua kemungkinan yang harus ia pilah sendiri.
    render1();

    expect(screen.getByText(/nama pada akun Anda direkam/i)).toBeInTheDocument();

    fireEvent.click(kotakAnonim());

    expect(screen.getByText(/nama Anda tidak direkam/i)).toBeInTheDocument();
    expect(screen.queryByText(/nama pada akun Anda direkam/i)).not.toBeInTheDocument();
  });

  it('menyatakan namanya tidak pernah ditampilkan bersama jawaban', () => {
    render1();

    expect(screen.getByText(/tidak pernah ditampilkan bersama jawaban/i)).toBeInTheDocument();
    expect(screen.getByText(/bentuk rekapitulasi/i)).toBeInTheDocument();
  });

  it('TIDAK menjanjikan responsnya lepas dari akun', () => {
    // `userId` tetap tersimpan atas keputusan pengguna, supaya anti-duplikat
    // (`dedupeUserId`) dan riwayat survei pemiliknya tetap bekerja. Menjanjikan
    // lebih dari yang dijamin kode akan menjadi klaim yang tidak benar, justru
    // pada topik yang paling tidak boleh dibesar-besarkan.
    render1();

    fireEvent.click(kotakAnonim());

    expect(screen.getByText(/satu kali per akun/i)).toBeInTheDocument();
    expect(screen.getByText(/tetap muncul di riwayat survei Anda/i)).toBeInTheDocument();
    expect(screen.queryByText(/tidak tertaut/i)).not.toBeInTheDocument();
  });

  it('TIDAK meminta satu pun medan isian', () => {
    // Permintaan tersurat pengguna: data dirinya diambil dari akun, jadi
    // gerbangnya cukup kotak anonim. Medan isian di sini berarti meminta ulang
    // yang sudah diketahui sistem, atau meminta yang tak akan pernah dipakai.
    render1();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('ada jalan keluar ke daftar survei', () => {
    render1();

    expect(screen.getByRole('link', { name: /kembali ke daftar survei/i })).toHaveAttribute(
      'href',
      '/surveys',
    );
  });
});
