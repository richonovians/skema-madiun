import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { USER_ROLES } from '../../constants/userConstants';
import UsersTable from '../UsersTable';

/**
 * PENJAGA REGRESI (permintaan pengguna 6 September 2026: "pada manajemen user
 * di halaman manajemen pengguna, tambahkan juga tombol ubah role untuk warga").
 *
 * Tombolnya sebenarnya SUDAH tampil sebelum berkas ini ada — tapi karena bug,
 * bukan karena keputusan: syaratnya `user.role !== USER_ROLES.RESPONDENT`,
 * sementara `user.role` tak ada lagi sejak adapter beralih ke `roles`
 * (5 September 2026). `undefined !== 'responden'` selalu benar, jadi syarat itu
 * mati dan tombolnya lolos untuk semua orang — di bawah komentar yang
 * menyatakan kebalikannya.
 *
 * SEJAK 30 SEPTEMBER 2026 seluruh aksi baris tinggal di dalam menu titik-tiga,
 * jadi uji di bawah membukanya lebih dahulu. Itu bukan upacara: kalau menunya
 * rusak, uji-uji inilah yang memerah pertama.
 */
const baris = (over = {}) => ({
  id: 42,
  name: 'Warga Contoh',
  email: 'warga@example.go.id',
  initials: 'WC',
  roles: [USER_ROLES.RESPONDENT],
  opdId: null,
  organization: null,
  createdAt: '6 Sep 2026',
  status: 'ACTIVE',
  ...over,
});

const barisPengguna = (nama) => screen.getByText(nama).closest('tr');

/** Buka menu aksi milik SATU baris, lalu kembalikan menunya. */
function bukaMenu(nama = 'Warga Contoh') {
  fireEvent.click(within(barisPengguna(nama)).getByRole('button', { name: /aksi untuk/i }));
  return screen.getByRole('menu');
}

/**
 * GERBANG KONFIRMASI AKSI AKUN (permintaan pengguna 8 September 2026).
 *
 * Keadaan sebelum ini, dan sebabnya permintaan itu masuk akal: tombol
 * Nonaktifkan/Aktifkan mengubah status TANPA konfirmasi apa pun, dan Hapus
 * memakai `window.confirm()` bawaan peramban alih-alih komponen desain
 * aplikasi. Jadi ini menambah satu gerbang dan memindahkan satu.
 *
 * Tabelnya kini murni presentasional: ia hanya MEMINTA aksi lewat
 * `onRequestAction(user, tipe)`, dan halaman pemanggil yang memegang
 * ConfirmDialog serta memanggil endpointnya. Dialog yang dipasang di dalam
 * tabel akan membuat tiap baris punya salinan dialognya sendiri.
 */
describe('UsersTable — gerbang konfirmasi', () => {
  it('Nonaktifkan meminta konfirmasi, bukan langsung mengubah status', () => {
    const onRequestAction = jest.fn();
    render(<UsersTable data={[baris()]} onRequestAction={onRequestAction} />);

    fireEvent.click(within(bukaMenu()).getByRole('menuitem', { name: /nonaktifkan/i }));

    expect(onRequestAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      'deactivate',
    );
  });

  it('baris yang sudah nonaktif meminta tipe activate', () => {
    const onRequestAction = jest.fn();
    render(<UsersTable data={[baris({ status: 'INACTIVE' })]} onRequestAction={onRequestAction} />);

    fireEvent.click(within(bukaMenu()).getByRole('menuitem', { name: /aktifkan/i }));

    expect(onRequestAction).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), 'activate');
  });

  it('Hapus meminta konfirmasi TANPA window.confirm', () => {
    // `window.confirm` di-spy, bukan cuma diperiksa hasil akhirnya: yang diuji
    // bukan sekadar bahwa handlernya terpanggil, melainkan bahwa dialog bawaan
    // peramban SUDAH TIDAK dipakai lagi.
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const onRequestAction = jest.fn();
    render(<UsersTable data={[baris()]} onRequestAction={onRequestAction} />);

    fireEvent.click(within(bukaMenu()).getByRole('menuitem', { name: /hapus/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onRequestAction).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), 'delete');
    confirmSpy.mockRestore();
  });
});

describe('UsersTable — Ubah Role', () => {
  it('baris WARGA punya tautan Ubah Role ke halaman edit akun itu', () => {
    render(<UsersTable data={[baris()]} />);

    const tautan = within(bukaMenu()).getByRole('menuitem', { name: /ubah role/i });
    expect(tautan).toHaveAttribute('href', '/admin-kab/users/42/edit');
  });

  it('baris admin juga punya tautan itu', () => {
    render(<UsersTable data={[baris({ id: 7, roles: [USER_ROLES.ADMIN_OPD], opdId: 16 })]} />);

    expect(within(bukaMenu()).getByRole('menuitem', { name: /ubah role/i })).toHaveAttribute(
      'href',
      '/admin-kab/users/7/edit',
    );
  });

  it('akun ber-beberapa role menampilkan seluruh lencananya', () => {
    render(
      <UsersTable data={[baris({ roles: [USER_ROLES.ADMIN_KABUPATEN, USER_ROLES.RESPONDENT] })]} />,
    );

    expect(screen.getByText('Admin Kabupaten')).toBeInTheDocument();
    expect(screen.getByText('Responden Aktif')).toBeInTheDocument();
  });
});

/**
 * Kolom STATUS ADMIN (29 September 2026, permintaan pengguna; judulnya
 * dipendekkan dari "STATUS ADMINISTRATOR" pada 1 Oktober 2026 atas permintaan
 * pengguna -- isinya tak berubah sama sekali).
 *
 * KENAPA "Ya"/"Tidak", BUKAN nama perannya. Kolom "HAK AKSES (ROLE)" di
 * sebelahnya sudah menyebutkan administrator JENIS APA. Kolom yang ikut
 * menyebutnya cuma mengulang tetangganya sambil melebarkan tabel. Dua nilai
 * menjawab pertanyaan yang berbeda dan belum dijawab kolom mana pun: orang ini
 * administrator atau bukan. Itu juga yang membuatnya dapat dipindai cepat pada
 * daftar panjang, yang memang tugas sebuah kolom berjudul "status".
 *
 * "Tidak" SENGAJA bernada redup, bukan merah: ia bertetangga dengan "Status
 * Akses" yang hijau, dan merah di sebelahnya akan terbaca sebagai ada yang
 * salah -- padahal bukan administrator adalah keadaan normal bagi hampir
 * seluruh warga.
 */
describe('UsersTable — kolom STATUS ADMIN', () => {
  it('kolomnya ada, tepat di sebelah kanan STATUS AKSES', () => {
    // Letaknya ikut dijaga, bukan cuma keberadaannya: yang diminta pengguna
    // adalah kolom di sebelah kanan Status Akses, dan urutan kolom adalah
    // bagian dari permintaan itu.
    render(<UsersTable data={[baris()]} />);

    const judul = screen.getAllByRole('columnheader').map((th) => th.textContent.trim());

    expect(judul).toContain('STATUS ADMIN');
    expect(judul.indexOf('STATUS ADMIN')).toBe(judul.indexOf('STATUS AKSES') + 1);
  });

  it('Admin Kabupaten -> Ya', () => {
    render(<UsersTable data={[baris({ roles: [USER_ROLES.ADMIN_KABUPATEN] })]} />);

    expect(within(barisPengguna('Warga Contoh')).getByText('Ya')).toBeInTheDocument();
  });

  it('Admin OPD merangkap responden -> Ya', () => {
    render(
      <UsersTable
        data={[baris({ roles: [USER_ROLES.ADMIN_OPD, USER_ROLES.RESPONDENT], opdId: 16 })]}
      />,
    );

    expect(within(barisPengguna('Warga Contoh')).getByText('Ya')).toBeInTheDocument();
  });

  it('responden saja -> Tidak', () => {
    render(<UsersTable data={[baris({ roles: [USER_ROLES.RESPONDENT] })]} />);

    expect(within(barisPengguna('Warga Contoh')).getByText('Tidak')).toBeInTheDocument();
  });

  it('akun tanpa role sama sekali -> Tidak, bukan kosong', () => {
    // Bentuk ini tak seharusnya ada (minimal satu role ditegakkan aplikasi),
    // tetapi sel kosong pada kolom status membuat pembacanya menduga-duga.
    render(<UsersTable data={[baris({ roles: [] })]} />);

    expect(within(barisPengguna('Warga Contoh')).getByText('Tidak')).toBeInTheDocument();
  });

  it('Admin OPD yang OPD-nya belum tertaut TETAP Ya', () => {
    // Keputusan yang diambil sadar: kolom ini hanya dua nilai. Keadaan
    // setengah jadi (`opd` tanpa `opdId`) tidak ditandai di sini, sebab
    // penyebabnya ditutup di jalur SSO -- `opd_id` terisi sejak akun lahir.
    // Ditulis tersurat supaya perilaku ini tak dikira kelalaian.
    render(<UsersTable data={[baris({ roles: [USER_ROLES.ADMIN_OPD], opdId: null })]} />);

    expect(within(barisPengguna('Warga Contoh')).getByText('Ya')).toBeInTheDocument();
  });

  it('membedakan antar baris, bukan menandai seluruh tabel sama', () => {
    // Penjaga premis: uji per-baris di atas tetap hijau bila kolomnya salah
    // merender nilai yang sama untuk semua orang.
    render(
      <UsersTable
        data={[
          baris({ id: 1, name: 'Admin Kab', roles: [USER_ROLES.ADMIN_KABUPATEN] }),
          baris({ id: 2, name: 'Warga Biasa', roles: [USER_ROLES.RESPONDENT] }),
        ]}
      />,
    );

    expect(within(barisPengguna('Admin Kab')).getByText('Ya')).toBeInTheDocument();
    expect(within(barisPengguna('Warga Biasa')).getByText('Tidak')).toBeInTheDocument();
  });
});

/**
 * MENU TITIK-TIGA PER BARIS (30 September 2026, permintaan pengguna).
 *
 * Sebabnya lebar. Kolom AKSI sudah memuat tiga tombol lepas dan tabelnya sudah
 * bergeser horizontal di layar sempit; butir keempat ("Jadikan Admin OPD")
 * memperburuknya. Satu tombol menggantikan empat, dan butir yang jarang dipakai
 * tak lagi membebani setiap baris.
 */
describe('UsersTable — menu aksi per baris', () => {
  it('kolom AKSI hanya berisi SATU tombol, dan namanya menyebut pemilik barisnya', () => {
    // Namanya menyebut nama akun karena pada daftar panjang akan ada belasan
    // tombol dengan fungsi sama; "Aksi" saja membuat pembaca layar mendengar
    // belasan tombol yang namanya identik dan tak dapat dibedakan.
    render(<UsersTable data={[baris()]} />);

    const tombol = within(barisPengguna('Warga Contoh')).getAllByRole('button');
    expect(tombol).toHaveLength(1);
    expect(tombol[0]).toHaveAccessibleName('Aksi untuk Warga Contoh');
  });

  it('menunya tertutup secara baku', () => {
    render(<UsersTable data={[baris()]} />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /hapus/i })).not.toBeInTheDocument();
  });

  it('dibuka: keempat butir hadir, dengan Hapus paling akhir', () => {
    render(<UsersTable data={[baris({ opdId: 16, organization: 'Dinas Uji' })]} />);

    const butir = within(bukaMenu())
      .getAllByRole('menuitem')
      .map((el) => el.textContent.trim());

    expect(butir).toEqual([
      expect.stringMatching(/^Ubah Role/),
      expect.stringMatching(/^Jadikan Admin OPD/),
      expect.stringMatching(/^Nonaktifkan/),
      expect.stringMatching(/^Hapus/),
    ]);
  });

  it('Jadikan Admin OPD meminta aksi promote-opd, lalu menutup menunya', () => {
    const onRequestAction = jest.fn();
    render(
      <UsersTable
        data={[baris({ opdId: 16, organization: 'Dinas Uji' })]}
        onRequestAction={onRequestAction}
      />,
    );

    fireEvent.click(within(bukaMenu()).getByRole('menuitem', { name: /jadikan admin opd/i }));

    expect(onRequestAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      'promote-opd',
    );
    // Menu yang tetap terbuka sesudah aksinya diminta akan menutupi dialog
    // konfirmasi yang muncul tepat sesudahnya.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('akun yang SUDAH Admin OPD tidak punya butir itu sama sekali', () => {
    // Disembunyikan, bukan dinonaktifkan: tak ada yang perlu dijelaskan pada
    // keadaan ini, dan butir mati tanpa sebab hanya menjadi teka-teki.
    render(<UsersTable data={[baris({ roles: [USER_ROLES.ADMIN_OPD], opdId: 16 })]} />);

    expect(
      within(bukaMenu()).queryByRole('menuitem', { name: /jadikan admin opd/i }),
    ).not.toBeInTheDocument();
  });

  it('akun tanpa tautan instansi: butirnya ADA tapi mati, dan menyebut alasannya', () => {
    // Ditampilkan mati, bukan disembunyikan, justru karena inilah keadaan yang
    // akan ditanyakan Admin Kabupaten: "kenapa orang ini tak bisa dinaikkan?"
    // Backend menolaknya 400 (`opdId` milik Helpdesk), jadi menawarkannya hidup
    // berarti menawarkan aksi yang pasti gagal.
    const onRequestAction = jest.fn();
    render(<UsersTable data={[baris({ opdId: null })]} onRequestAction={onRequestAction} />);

    const butir = within(bukaMenu()).getByRole('menuitem', { name: /jadikan admin opd/i });
    expect(butir).toBeDisabled();
    expect(butir).toHaveTextContent(/belum ditautkan/i);

    fireEvent.click(butir);
    expect(onRequestAction).not.toHaveBeenCalled();
  });

  it('Escape menutup menu dan mengembalikan fokus ke tombolnya', () => {
    render(<UsersTable data={[baris()]} />);
    const tombol = within(barisPengguna('Warga Contoh')).getByRole('button');
    fireEvent.click(tombol);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // Tanpa pengembalian fokus, menekan Escape membuang pengguna papan ketik
    // ke awal dokumen dan ia harus menelusuri tabel dari atas lagi.
    expect(tombol).toHaveFocus();
  });

  it('klik di luar menutup menu', () => {
    render(<UsersTable data={[baris()]} />);
    bukaMenu();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('menu milik baris kedua membawa pengguna baris kedua', () => {
    // Penjaga premis: seluruh uji di atas memakai satu baris, jadi menu yang
    // salah menutup pengguna dari baris pertama akan tetap membuatnya hijau.
    const onRequestAction = jest.fn();
    render(
      <UsersTable
        data={[
          baris({ id: 1, name: 'Baris Pertama' }),
          baris({ id: 2, name: 'Baris Kedua', email: 'kedua@example.go.id' }),
        ]}
        onRequestAction={onRequestAction}
      />,
    );

    fireEvent.click(within(bukaMenu('Baris Kedua')).getByRole('menuitem', { name: /hapus/i }));

    expect(onRequestAction).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), 'delete');
  });
});

/**
 * PINTASAN "Jadikan Admin OPD" ikut digerbang ASN (6 Oktober 2026).
 *
 * JALUR KEDUA, dan itu sebabnya blok ini ada. Halaman Ubah Role sudah
 * menonaktifkan kotak centang Admin OPD bagi akun non-ASN, tetapi pintasan di
 * menu baris ini memanggil `PATCH /users/:id` dengan peran `opd` tanpa pernah
 * melewati halaman itu. Gerbang yang hanya menutup satu dari dua pintu bukan
 * gerbang; yang terjadi adalah tombol yang pasti dijawab 400 di produksi.
 */
describe('UsersTable — pintasan Admin OPD hanya untuk ASN', () => {
  const asn = (over = {}) =>
    baris({ opdId: 16, organization: 'Dinas Uji', bolehJadiAdminOpd: true, ...over });

  it('`false` menonaktifkan butir pintasannya', () => {
    render(<UsersTable data={[asn({ bolehJadiAdminOpd: false })]} />);

    expect(within(bukaMenu()).getByRole('menuitem', { name: /jadikan admin opd/i })).toBeDisabled();
  });

  it('menerangkan sebabnya, menyebut ASN', () => {
    render(<UsersTable data={[asn({ bolehJadiAdminOpd: false })]} />);

    expect(within(bukaMenu()).getByText(/hanya untuk akun ASN/i)).toBeInTheDocument();
  });

  it('menekannya tidak meminta aksi apa pun', () => {
    const onRequestAction = jest.fn();
    render(
      <UsersTable
        data={[asn({ bolehJadiAdminOpd: false })]}
        onRequestAction={onRequestAction}
      />,
    );

    fireEvent.click(within(bukaMenu()).getByRole('menuitem', { name: /jadikan admin opd/i }));

    expect(onRequestAction).not.toHaveBeenCalled();
  });

  it('`true` membiarkan pintasannya hidup', () => {
    render(<UsersTable data={[asn()]} />);

    expect(
      within(bukaMenu()).getByRole('menuitem', { name: /jadikan admin opd/i }),
    ).not.toBeDisabled();
  });

  it('tanpa keterangan dari backend: TIDAK dimatikan', () => {
    // `null`/tak dikirim berarti belum diberitahu. Mematikan pintasan atas
    // dasar ketidaktahuan akan merusak halaman ini di pengembangan, tempat
    // gerbangnya memang mati.
    render(<UsersTable data={[asn({ bolehJadiAdminOpd: null })]} />);

    expect(
      within(bukaMenu()).getByRole('menuitem', { name: /jadikan admin opd/i }),
    ).not.toBeDisabled();
  });

  it('tautan instansi yang belum ada tetap menjadi sebab yang disebut lebih dulu', () => {
    // Dua sebab dapat berlaku sekaligus. Yang ditampilkan adalah yang paling
    // dekat dengan tindakan berikutnya: tanpa tautan instansi, menjadikannya
    // Admin OPD tak punya arti sama sekali -- bahkan bagi seorang ASN.
    render(<UsersTable data={[asn({ opdId: null, bolehJadiAdminOpd: false })]} />);

    expect(within(bukaMenu()).getByText(/Instansi belum ditautkan Helpdesk/i)).toBeInTheDocument();
  });
});
