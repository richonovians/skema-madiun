import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { USER_ROLES } from '../../constants/userConstants';
import RoleAssignmentCard from '../RoleAssignmentCard';

/**
 * Satu akun boleh memegang beberapa role (5 September 2026), jadi pemilih
 * rolenya kelompok kotak centang -- bukan dropdown yang hanya bisa satu.
 */
const dasar = { roles: [], opdId: '' };

const render1 = (over = {}, props = {}) =>
  render(
    <RoleAssignmentCard
      formData={{ ...dasar, ...over }}
      onRolesChange={props.onRolesChange ?? (() => {})}
      onDropdownChange={props.onDropdownChange ?? (() => {})}
      errors={props.errors ?? {}}
      opdOptions={props.opdOptions ?? []}
      roleLocked={props.roleLocked ?? false}
      opdLocked={props.opdLocked ?? false}
    />,
  );

const OPD_CONTOH = [
  { value: '', label: 'Pilih Instansi / OPD' },
  { value: '7', label: 'Dinas Kesehatan' },
];

describe('RoleAssignmentCard', () => {
  it('mencentang satu role melaporkannya sebagai array', () => {
    const onRolesChange = jest.fn();
    render1({}, { onRolesChange });

    fireEvent.click(screen.getByLabelText('Superuser'));

    expect(onRolesChange).toHaveBeenLastCalledWith([USER_ROLES.SUPERUSER]);
  });

  it('mencentang role KEDUA menambah, bukan menggantikan', () => {
    const onRolesChange = jest.fn();
    render1({ roles: [USER_ROLES.SUPERUSER] }, { onRolesChange });

    fireEvent.click(screen.getByLabelText('Admin OPD'));

    // Inti seluruh perubahan: dropdown lama hanya bisa satu nilai, jadi uji ini
    // yang membedakan "kelompok kotak centang" dari "dropdown berpenampilan lain".
    expect(onRolesChange).toHaveBeenLastCalledWith([
      USER_ROLES.SUPERUSER,
      USER_ROLES.ADMIN_OPD,
    ]);
  });

  it('membuka centang MENGHAPUS role itu saja', () => {
    const onRolesChange = jest.fn();
    render1({ roles: [USER_ROLES.SUPERUSER, USER_ROLES.ADMIN_OPD] }, { onRolesChange });

    fireEvent.click(screen.getByLabelText('Superuser'));

    expect(onRolesChange).toHaveBeenLastCalledWith([USER_ROLES.ADMIN_OPD]);
  });

  it('menawarkan Warga (Responden) — batas lama sudah dicabut', () => {
    render1();

    expect(screen.getByLabelText('Warga (Responden)')).toBeInTheDocument();
  });

  it('dropdown OPD TIDAK muncul bila Admin OPD tak tercentang', () => {
    render1({ roles: [USER_ROLES.ADMIN_KABUPATEN] });

    expect(screen.queryByText(/INSTANSI \/ OPD/i)).not.toBeInTheDocument();
  });

  it('dropdown OPD muncul begitu Admin OPD tercentang', () => {
    render1({ roles: [USER_ROLES.ADMIN_OPD] }, { opdOptions: [{ value: '1', label: 'Dinkes' }] });

    expect(screen.getByText(/INSTANSI \/ OPD/i)).toBeInTheDocument();
  });

  it('roleLocked: menampilkan seluruh role sebagai teks, tanpa kotak centang', () => {
    render1(
      { roles: [USER_ROLES.SUPERUSER, USER_ROLES.ADMIN_OPD] },
      { roleLocked: true, opdOptions: [] },
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Superuser, Admin OPD')).toBeInTheDocument();
    expect(screen.getByText(/tidak dapat mengubah role akun Anda sendiri/i)).toBeInTheDocument();
  });

  it('menampilkan galat validasi roles bila diberikan', () => {
    render1({}, { errors: { roles: 'Pilih minimal satu role.' } });

    expect(screen.getByText('Pilih minimal satu role.')).toBeInTheDocument();
  });

  /**
   * KEPEMILIKAN DATA (8 September 2026). `opdId` berasal dari Helpdesk, dan
   * sejak `PATCH /users/:id` menolaknya (UpdateUserDto), menawarkan dropdown
   * yang dapat diubah berarti menawarkan aksi yang PASTI gagal 400.
   *
   * Instansinya tetap DITAMPILKAN, bukan disembunyikan: orang yang memberi
   * peran Admin OPD perlu tahu instansi mana yang akan dipegang akun itu.
   */
  describe('opdLocked: instansi milik Helpdesk', () => {
    it('menampilkan nama instansi sebagai teks, TANPA dropdown', () => {
      render1({ roles: [USER_ROLES.ADMIN_OPD], opdId: '7' }, { opdLocked: true, opdOptions: OPD_CONTOH });

      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
      // Dropdown-nya benar-benar hilang, bukan cuma dinonaktifkan: kontrol
      // nonaktif masih mengundang klik dan menyisakan pertanyaan "kenapa mati".
      //
      // Dicocokkan PERSIS, bukan dengan regex: `opdOptions` memuat opsi berlabel
      // "Pilih Instansi / OPD" yang juga cocok dengan /instansi \/ opd/i, dan
      // versi regex uji ini gagal karena menemukan dua elemen sekaligus.
      expect(screen.queryByText('INSTANSI / OPD')).not.toBeInTheDocument();
      expect(screen.getByText(/berasal dari Helpdesk/i)).toBeInTheDocument();
    });

    it('akun tanpa tautan OPD: mengatakannya terus terang, bukan kosong', () => {
      // Keadaan ini nyata: peran `opd` hanya dapat diberikan bila Helpdesk
      // sudah menautkan OPD-nya, jadi kotak centangnya ada tapi tautannya
      // belum. Halaman harus menjelaskan itu, bukan menampilkan ruang kosong.
      render1({ roles: [USER_ROLES.ADMIN_OPD], opdId: '' }, { opdLocked: true, opdOptions: OPD_CONTOH });

      expect(screen.getByText(/belum ditautkan Helpdesk/i)).toBeInTheDocument();
    });

    it('KONTROL: tanpa opdLocked, dropdown-nya tetap ada (halaman TAMBAH admin)', () => {
      render1({ roles: [USER_ROLES.ADMIN_OPD], opdId: '' }, { opdOptions: OPD_CONTOH });

      expect(screen.getByText('INSTANSI / OPD')).toBeInTheDocument();
    });
  });
});
