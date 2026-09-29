import { render, screen, within } from '@testing-library/react';
import UsersTable from '../UsersTable';
import { USER_ROLES } from '../../constants/userConstants';

/**
 * Kolom STATUS ADMINISTRATOR (29 September 2026, permintaan pengguna).
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
const pengguna = (ubah = {}) => ({
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@example.go.id',
  initials: 'BS',
  roles: [USER_ROLES.RESPONDENT],
  opdId: null,
  organization: null,
  createdAt: '18 Agustus 2026',
  status: 'ACTIVE',
  ...ubah,
});

const barisPengguna = (nama) => screen.getByText(nama).closest('tr');

describe('UsersTable — kolom STATUS ADMINISTRATOR', () => {
  it('kolomnya ada, tepat di sebelah kanan STATUS AKSES', () => {
    // Letaknya ikut dijaga, bukan cuma keberadaannya: yang diminta pengguna
    // adalah kolom di sebelah kanan Status Akses, dan urutan kolom adalah
    // bagian dari permintaan itu.
    render(<UsersTable data={[pengguna()]} />);

    const judul = screen.getAllByRole('columnheader').map((th) => th.textContent.trim());

    expect(judul).toContain('STATUS ADMINISTRATOR');
    expect(judul.indexOf('STATUS ADMINISTRATOR')).toBe(judul.indexOf('STATUS AKSES') + 1);
  });

  it('Admin Kabupaten -> Ya', () => {
    render(<UsersTable data={[pengguna({ roles: [USER_ROLES.ADMIN_KABUPATEN] })]} />);

    expect(within(barisPengguna('Budi Santoso')).getByText('Ya')).toBeInTheDocument();
  });

  it('Admin OPD merangkap responden -> Ya', () => {
    render(
      <UsersTable
        data={[pengguna({ roles: [USER_ROLES.ADMIN_OPD, USER_ROLES.RESPONDENT], opdId: 16 })]}
      />,
    );

    expect(within(barisPengguna('Budi Santoso')).getByText('Ya')).toBeInTheDocument();
  });

  it('responden saja -> Tidak', () => {
    render(<UsersTable data={[pengguna({ roles: [USER_ROLES.RESPONDENT] })]} />);

    expect(within(barisPengguna('Budi Santoso')).getByText('Tidak')).toBeInTheDocument();
  });

  it('akun tanpa role sama sekali -> Tidak, bukan kosong', () => {
    // Bentuk ini tak seharusnya ada (minimal satu role ditegakkan aplikasi),
    // tetapi sel kosong pada kolom status membuat pembacanya menduga-duga.
    render(<UsersTable data={[pengguna({ roles: [] })]} />);

    expect(within(barisPengguna('Budi Santoso')).getByText('Tidak')).toBeInTheDocument();
  });

  it('Admin OPD yang OPD-nya belum tertaut TETAP Ya', () => {
    // Keputusan yang diambil sadar: kolom ini hanya dua nilai. Keadaan
    // setengah jadi (`opd` tanpa `opdId`) tidak ditandai di sini, sebab
    // penyebabnya ditutup di jalur SSO -- `opd_id` terisi sejak akun lahir.
    // Ditulis tersurat supaya perilaku ini tak dikira kelalaian.
    render(<UsersTable data={[pengguna({ roles: [USER_ROLES.ADMIN_OPD], opdId: null })]} />);

    expect(within(barisPengguna('Budi Santoso')).getByText('Ya')).toBeInTheDocument();
  });

  it('membedakan antar baris, bukan menandai seluruh tabel sama', () => {
    // Penjaga premis: uji per-baris di atas tetap hijau bila kolomnya salah
    // merender nilai yang sama untuk semua orang.
    render(
      <UsersTable
        data={[
          pengguna({ id: 1, name: 'Admin Kab', roles: [USER_ROLES.ADMIN_KABUPATEN] }),
          pengguna({ id: 2, name: 'Warga Biasa', roles: [USER_ROLES.RESPONDENT] }),
        ]}
      />,
    );

    expect(within(barisPengguna('Admin Kab')).getByText('Ya')).toBeInTheDocument();
    expect(within(barisPengguna('Warga Biasa')).getByText('Tidak')).toBeInTheDocument();
  });
});
