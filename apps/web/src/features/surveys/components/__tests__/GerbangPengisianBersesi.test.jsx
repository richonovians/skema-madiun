import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GerbangPengisianBersesi from '../GerbangPengisianBersesi';

/**
 * GERBANG SEBELUM KUESIONER bagi pengguna yang SUDAH login.
 *
 * SATU KONTROL SAJA sejak 1 Oktober 2026 (petang), atas permintaan tersurat
 * pengguna: medan isian nomor HP dibuang, pilihan anonim disisakan. Dua
 * keputusan yang berbeda nasibnya, dan keduanya pantas dicatat sebabnya.
 *
 *   MEDAN NOMOR HP ada karena Helpdesk dianggap tak mengirim nomor telepon --
 *   terukur pada metadata penyedia yang `claims_supported`-nya tak memuat
 *   `phone_number`. Pengukuran itu ternyata belum lengkap: payload `userinfo`
 *   SUNGGUHAN memuat `identity.phone_number`, dan spesifikasi OIDC memang
 *   menyebut daftar itu petunjuk, bukan jaminan tertutup. Sejak nomornya ada
 *   di akun, memintanya berarti menyuruh orang mengetik ulang yang sudah
 *   diketahui sistem.
 *
 *   PILIHAN ANONIM tetap, dan menjadi lebih berarti daripada sebelumnya: yang
 *   direkam bertambah dari nama saja menjadi nama, nomor HP, dan jenis
 *   kelamin. Semakin banyak yang direkam, semakin bernilai kemampuan memilih
 *   untuk tidak direkam.
 *
 * Penegakan sesungguhnya tetap di backend: `ResponsesService.submit` membaca
 * `tanpaDataDiri` lalu memutuskan menyalin data diri akun atau tidak. Tak satu
 * pun data diri dibaca dari payload.
 */
const render1 = (props = {}) => render(<GerbangPengisianBersesi onMulai={jest.fn()} {...props} />);

const kotakAnonim = () => screen.getByRole('checkbox', { name: /sebagai anonim/i });
const tombolMulai = () => screen.getByRole('button', { name: /mulai isi survei/i });

describe('GerbangPengisianBersesi', () => {
  it('baku TIDAK anonim, dan tombolnya tetap dapat ditekan', () => {
    // Tidak mencentang apa pun adalah pilihan yang sah di sini (mengisi dengan
    // data diri), berbeda dari gerbang PDP publik yang menunggu satu
    // persetujuan wajib. Tombol yang mati akan menjebak pengisi yang memang tak
    // ingin anonim.
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

  /**
   * PAGAR UTAMA berkas ini. Medan isian apa pun yang kembali muncul di sini
   * berarti meminta ulang data yang sudah ada di akun -- persis yang diminta
   * hilang. Kotak centang BUKAN medan isian: ia pilihan, bukan data.
   */
  it('TIDAK meminta satu pun medan isian', () => {
    const { container } = render1();

    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(container.querySelectorAll('input[type="text"], input[type="tel"], textarea, select'))
      .toHaveLength(0);
  });

  it('kontrolnya tepat satu, yaitu kotak anonim', () => {
    render1();

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('tidak lagi meminta nomor HP', () => {
    render1();

    expect(screen.queryByLabelText(/nomor hp/i)).not.toBeInTheDocument();
  });

  /**
   * NASKAHNYA HARUS JUJUR, dan hari ini ia sempat tidak.
   *
   * Kalimat lamanya berbunyi "Nama Anda tidak pernah ditampilkan bersama
   * jawaban ini". Itu benar ketika ditulis, dan menjadi TIDAK BENAR pada hari
   * yang sama begitu kartu "Data Pengisi" dipasang di rincian respons --
   * petugas kini memang melihat nama, nomor HP, dan jenis kelamin di sana. Uji
   * ini menolak kalimat itu kembali.
   */
  it('menyebut ketiga medan yang direkam, bukan "data diri" yang kabur', () => {
    render1();

    expect(screen.getByText(/nama, nomor HP, dan jenis kelamin/i)).toBeInTheDocument();
    expect(screen.getByText(/direkam bersama jawaban ini/i)).toBeInTheDocument();
  });

  it('TIDAK menyatakan identitasnya disembunyikan dari petugas', () => {
    render1();

    expect(screen.queryByText(/tidak pernah ditampilkan/i)).not.toBeInTheDocument();
    expect(screen.getByText(/rincian respons/i)).toBeInTheDocument();
  });

  it('keterangannya berubah mengikuti pilihannya', () => {
    // Pengisi perlu tahu apa yang berlaku pada dirinya sekarang, bukan daftar
    // dua kemungkinan yang harus ia pilah sendiri.
    render1();

    expect(screen.getByText(/direkam bersama jawaban ini/i)).toBeInTheDocument();

    fireEvent.click(kotakAnonim());

    expect(screen.getByText(/tidak direkam bersama jawaban ini/i)).toBeInTheDocument();
    expect(screen.queryByText(/dapat dilihat petugas/i)).not.toBeInTheDocument();
  });

  it('TIDAK menjanjikan responsnya lepas dari akun', () => {
    // `userId` tetap tersimpan supaya anti-duplikat (`dedupeUserId`) dan
    // riwayat survei pemiliknya tetap bekerja. Menjanjikan lebih dari yang
    // dijamin kode akan menjadi klaim yang tidak benar, justru pada topik yang
    // paling tidak boleh dibesar-besarkan.
    render1();

    fireEvent.click(kotakAnonim());

    expect(screen.getByText(/satu kali per akun/i)).toBeInTheDocument();
    expect(screen.getByText(/tetap muncul di riwayat survei Anda/i)).toBeInTheDocument();
    expect(screen.queryByText(/tidak tertaut/i)).not.toBeInTheDocument();
  });

  it('ada jalan keluar ke daftar survei', () => {
    render1();

    expect(screen.getByRole('link', { name: /kembali ke daftar survei/i })).toHaveAttribute(
      'href',
      '/surveys',
    );
  });
});
