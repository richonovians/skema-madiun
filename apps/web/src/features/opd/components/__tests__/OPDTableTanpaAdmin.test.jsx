import React from 'react';
import { render, screen, within } from '@testing-library/react';
import OPDTable from '../OPDTable';

/**
 * PERINGATAN OPD TANPA ADMIN (4 Oktober 2026, permintaan pengguna: "tambah
 * notifikasi jika opd tersebut belum ada adminnya").
 *
 * OPD tanpa admin bukan kejadian langka melainkan keadaan BAKU. Daftar OPD
 * disinkronkan dari Helpdesk dan bersifat baca saja, jadi setiap OPD baru masuk
 * tanpa seorang pun yang mengelolanya, dan tak ada satu pun layar yang
 * menyebutkannya.
 *
 * Akibatnya diam dan tidak terlihat dari mana pun: pengaduan yang ditujukan ke
 * OPD itu tak pernah dibaca siapa pun, dan surveinya tak pernah disusun. Warga
 * yang mengadu melihat tiketnya menggantung di "diterima" tanpa tahu bahwa
 * memang tak ada orang di seberangnya. Admin Kabupaten satu-satunya yang dapat
 * membereskannya, dan tabel inilah tempat ia memandang seluruh OPD sekaligus.
 *
 * DIPILIH SEBAGAI PERINGATAN DI LAYAR, bukan baris di tabel `notifications`
 * (pilihan tersurat pengguna). Notifikasi sungguhan menuntut nilai enum baru,
 * satu migrasi, dan keputusan kapan ia dikirim; peringatan di layar menjawab
 * kebutuhannya sekarang tanpa menyentuh skema.
 */
const baris = (tambahan = {}) => ({
  id: 1,
  code: 'DINKES',
  name: 'Dinas Kesehatan',
  serviceType: 'Kesehatan',
  activeSurveys: 2,
  openComplaints: 3,
  adminCount: 1,
  status: 'ACTIVE',
  syncedAt: '2026-10-01T03:00:00.000Z',
  ...tambahan,
});

const render1 = (data) => render(<OPDTable data={data} />);

describe('OPDTable — OPD belum punya admin', () => {
  it('menandai baris OPD yang tak punya satu pun admin', () => {
    render1([baris({ adminCount: 0 })]);

    expect(screen.getByText(/belum ada admin/i)).toBeInTheDocument();
  });

  it('peringatannya terbaca pembaca layar, bukan hanya warna', () => {
    // Warna sendirian bukan informasi: pengguna yang tak dapat membedakannya
    // tak akan pernah tahu baris ini berbeda.
    render1([baris({ adminCount: 0 })]);

    const tanda = screen.getByText(/belum ada admin/i);
    expect(tanda).toBeVisible();
  });

  /**
   * PAGAR UTAMA. Peringatan yang muncul pada OPD yang baik-baik saja membuat
   * seluruh kolom itu diabaikan, dan OPD yang sungguh tak punya admin ikut
   * tenggelam bersamanya.
   */
  it('TIDAK menandai OPD yang sudah punya admin', () => {
    render1([baris({ adminCount: 1 })]);

    expect(screen.queryByText(/belum ada admin/i)).not.toBeInTheDocument();
  });

  it('hanya baris yang tak punya admin yang ditandai', () => {
    render1([
      baris({ id: 1, code: 'DINKES', name: 'Dinas Kesehatan', adminCount: 2 }),
      baris({ id: 2, code: 'DISDIK', name: 'Dinas Pendidikan', adminCount: 0 }),
    ]);

    const barisTabel = screen.getAllByRole('row').slice(1); // lewati kepala kolom
    expect(within(barisTabel[0]).queryByText(/belum ada admin/i)).not.toBeInTheDocument();
    expect(within(barisTabel[1]).getByText(/belum ada admin/i)).toBeInTheDocument();
  });

  /**
   * `adminCount` TIDAK ADA berarti backend belum mengirimnya, bukan berarti
   * nol. Menuduh OPD tak punya admin karena medannya tak terbaca adalah
   * peringatan palsu, dan peringatan palsu lebih merusak daripada tak ada
   * peringatan sama sekali.
   */
  it('tidak menuduh apa pun ketika adminCount tidak dikirim', () => {
    render1([baris({ adminCount: undefined })]);

    expect(screen.queryByText(/belum ada admin/i)).not.toBeInTheDocument();
  });
});
