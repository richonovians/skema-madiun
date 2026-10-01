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
const medanNomorHp = () => screen.getByLabelText(/nomor hp/i);

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

    expect(onMulai).toHaveBeenCalledWith({ anonim: false, nomorHp: null });
  });

  it('meneruskan pilihan anonim saat dicentang', () => {
    const onMulai = jest.fn();
    render1({ onMulai });

    fireEvent.click(kotakAnonim());
    fireEvent.click(tombolMulai());

    expect(onMulai).toHaveBeenCalledWith({ anonim: true, nomorHp: null });
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

  /**
   * DIBALIK 1 Oktober 2026, atas keputusan tersurat pengguna.
   *
   * Uji ini dulu berbunyi "TIDAK meminta satu pun medan isian", dengan alasan
   * yang waktu itu benar: data diri pengisi bersesi diambil dari akun, jadi
   * medan isian berarti meminta ulang yang sudah diketahui sistem.
   *
   * Alasan itu TIDAK berlaku untuk nomor HP, dan bedanya terukur: Helpdesk tak
   * mengirim nomor telepon sama sekali (metadata penyedia 1 Oktober 2026 --
   * `claims_supported` tanpa `phone_number`, `scopes_supported` tanpa scope
   * `phone`) dan `users` tak punya kolomnya. Nomor HP bukan "yang sudah
   * diketahui sistem"; ia satu-satunya data diri yang TAK dapat diketahui tanpa
   * bertanya.
   *
   * Karena itu medannya tepat satu. Menambah nama atau demografis di sini akan
   * mengulangi apa yang memang sudah ada di akun, dan itulah yang dulu ditolak.
   */
  it('meminta nomor HP, dan HANYA itu', () => {
    render1();

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(medanNomorHp()).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('meneruskan nomor HP yang diketik', () => {
    const onMulai = jest.fn();
    render1({ onMulai });

    fireEvent.change(medanNomorHp(), { target: { value: '081234567890' } });
    fireEvent.click(tombolMulai());

    expect(onMulai).toHaveBeenCalledWith({ anonim: false, nomorHp: '081234567890' });
  });

  it('nomor HP OPSIONAL: dibiarkan kosong tetap boleh mulai', () => {
    // Nomor HP bukan syarat menilai layanan publik. Mewajibkannya berarti
    // menutup survei bagi orang yang tak ingin memberinya -- dan itu menukar
    // data yang bersifat pelengkap dengan suara warga yang hilang.
    const onMulai = jest.fn();
    render1({ onMulai });

    fireEvent.click(tombolMulai());

    expect(onMulai).toHaveBeenCalledWith({ anonim: false, nomorHp: null });
  });

  it('nomor HP yang tak dikenali ditolak, dan pengisian tidak dimulai', () => {
    // Ditahan DI SINI, bukan dibiarkan sampai backend: pengisi yang sudah
    // menjawab seluruh kuesioner lalu ditolak pada pengiriman akan kehilangan
    // jawabannya tanpa tahu sebabnya.
    const onMulai = jest.fn();
    render1({ onMulai });

    fireEvent.change(medanNomorHp(), { target: { value: '12345' } });
    fireEvent.click(tombolMulai());

    expect(onMulai).not.toHaveBeenCalled();
    expect(screen.getByText(/nomor hp tidak dikenali/i)).toBeInTheDocument();
  });

  it('KONTROL: memilih anonim MEMBUANG nomor HP yang terlanjur diketik', () => {
    // Pagar terpenting berkas ini. Menyembunyikan medannya tanpa membuang
    // isinya akan mengirim data yang pengisinya sudah memutuskan untuk tidak
    // diberikan -- pola yang sama sudah berdiri di GerbangPengisianPublik.
    const onMulai = jest.fn();
    render1({ onMulai });

    fireEvent.change(medanNomorHp(), { target: { value: '081234567890' } });
    fireEvent.click(kotakAnonim());
    fireEvent.click(tombolMulai());

    expect(onMulai).toHaveBeenCalledWith({ anonim: true, nomorHp: null });
  });

  it('medan nomor HP hilang saat anonim dipilih', () => {
    render1();

    fireEvent.click(kotakAnonim());

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('ada jalan keluar ke daftar survei', () => {
    render1();

    expect(screen.getByRole('link', { name: /kembali ke daftar survei/i })).toHaveAttribute(
      'href',
      '/surveys',
    );
  });
});
