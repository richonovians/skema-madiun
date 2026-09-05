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
    />,
  );

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
});
