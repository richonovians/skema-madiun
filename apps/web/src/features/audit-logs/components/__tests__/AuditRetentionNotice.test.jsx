import React from 'react';
import { render, screen } from '@testing-library/react';
import AuditRetentionNotice from '../AuditRetentionNotice';

/**
 * KETERANGAN RETENSI (30 September 2026).
 *
 * ADA karena log audit kini dipangkas otomatis. Tanpa keterangan ini, penyaring
 * rentang tanggal di halaman yang sama akan mengembalikan hasil kosong untuk
 * tanggal di luar masa retensi — dan kosong tanpa sebab terbaca sebagai aplikasi
 * rusak, atau lebih buruk, sebagai jejak yang dihilangkan orang.
 *
 * Ia juga menggantikan tugas yang tadinya hendak diberikan kepada sebuah akun
 * sistem pencatat pemangkasan. Akun itu dibatalkan (keputusan pengguna): ia akan
 * muncul di Manajemen User, dan catatannya sendiri tinggal di `audit_logs`
 * sehingga ikut terhapus pemangkasan berikutnya. Keterangan tetap di layar tidak
 * punah.
 */
describe('AuditRetentionNotice', () => {
  it('menyebut lama retensinya', () => {
    render(<AuditRetentionNotice hari={14} />);

    expect(screen.getByText(/14 hari/)).toBeInTheDocument();
  });

  it('angkanya mengikuti nilai yang diberikan, bukan 14 yang ditulis mati', () => {
    // Penjaga premis. Angka ini berasal dari AUDIT_RETENTION_DAYS di server;
    // menuliskannya mati di frontend berarti keterangan di layar bisa berbeda
    // dari kebijakan yang sebenarnya berlaku — persis kesalahan yang paling
    // merusak kepercayaan pada halaman audit.
    render(<AuditRetentionNotice hari={30} />);

    expect(screen.getByText(/30 hari/)).toBeInTheDocument();
    expect(screen.queryByText(/14 hari/)).not.toBeInTheDocument();
  });

  it('TIDAK merender apa pun bila retensi tidak aktif', () => {
    // `null` berarti AUDIT_RETENTION_DAYS tak disetel, jadi tak ada yang pernah
    // dipangkas. Menampilkan janji penyimpanan di keadaan itu adalah pernyataan
    // yang tidak benar.
    const { container } = render(<AuditRetentionNotice hari={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('TIDAK merender apa pun selagi nilainya belum dimuat', () => {
    // Selama permintaan berjalan nilainya `undefined`. Menampilkan keterangan
    // berangka kosong hanya membuat halaman berkedip.
    const { container } = render(<AuditRetentionNotice />);

    expect(container).toBeEmptyDOMElement();
  });
});
