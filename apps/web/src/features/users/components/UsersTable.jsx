import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Avatar from '@/components/ui/Avatar';
import UserStatusBadge from './UserStatusBadge';
import { USER_ROLES } from '../constants/userConstants';
import EmptyState from '@/components/ui/EmptyState';
import RowActionsMenu from '@/components/ui/RowActionsMenu';
import { Users as UsersIcon, Pencil, Trash2, Building2, UserCheck, UserX } from 'lucide-react';

/**
 * Kolom AKSI versi dummy lama ("Ubah Role" dropdown + "Reset Token JWT")
 * DIHAPUS TOTAL -- keduanya tak pernah tersambung ke mana pun. Reset token
 * masih tak berlaku (JWT stateless tanpa mekanisme revoke, lihat
 * SessionService/AuthProvider). Diganti toggle Aktifkan/Nonaktifkan
 * (`PATCH /users/:id/status`), link Ubah Role (`PATCH /users/:id`,
 * 2026-08-05), dan Hapus (`DELETE /users/:id`, soft delete, 2026-08-05 --
 * sebelumnya `deletedAt` ada di skema tapi tak ada endpoint/UI sama sekali).
 *
 * SEJAK 8 SEPTEMBER 2026 tabel ini TIDAK lagi memanggil endpoint apa pun. Ia
 * cuma MEMINTA aksi lewat `onRequestAction(user, tipe)`; halaman pemanggil yang
 * memegang ConfirmDialog lalu memutuskan. Dua sebabnya: sebelum ini
 * Nonaktifkan mengubah status tanpa konfirmasi sama sekali dan Hapus memakai
 * `window.confirm()` bawaan peramban, dan dialog yang dipasang di dalam tabel
 * akan membuat tiap baris punya salinan dialognya sendiri.
 *
 * SEJAK 30 SEPTEMBER 2026 ketiga aksi itu tinggal di dalam menu titik-tiga
 * (RowActionsMenu), bersama satu aksi baru. Lihat catatan di kolom AKSI.
 */
export default function UsersTable({ data, onRequestAction, pagination }) {
  const getRoleBadgeConfig = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN_KABUPATEN:
        return { label: 'Admin Kabupaten', className: 'bg-indigo-100 text-indigo-800' };
      case USER_ROLES.ADMIN_OPD:
        return { label: 'Admin OPD', className: 'bg-blue-100 text-blue-800' };
      case USER_ROLES.RESPONDENT:
        return { label: 'Responden Aktif', className: 'bg-slate-100 text-slate-800' };
      default:
        return { label: role, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const getAvatarVariant = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN_KABUPATEN:
        return 'secondary';
      case USER_ROLES.ADMIN_OPD:
        return 'primary';
      default:
        return 'outline';
    }
  };

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon size={48} />}
        title="Tidak ada pengguna"
        description="Belum ada data pengguna yang sesuai dengan filter saat ini."
      />
    );
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm overflow-hidden border border-border">
      <div className="w-full overflow-x-auto">
        <Table>
          <Thead>
          <Tr className="bg-gradient-to-r from-slate-100/80 via-slate-50/80 to-slate-100/80 border-b-2 border-slate-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] relative z-10">
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5">NAMA LENGKAP</Th>
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5">HAK AKSES (ROLE)</Th>
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5">AFILIASI INSTANSI</Th>
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5">TANGGAL DIBUAT</Th>
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5">STATUS AKSES</Th>
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5">STATUS ADMINISTRATOR</Th>
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5">AKSI</Th>
          </Tr>
        </Thead>
        <Tbody className="divide-y divide-outline-variant">
          {data.map((user) => {
            // Satu akun bisa memegang beberapa role (5 September 2026), jadi
            // beberapa lencana -- bukan satu. Avatar memakai role PERTAMA;
            // warnanya sekadar pembeda visual, bukan pernyataan hak.
            const roleConfigs = (user.roles ?? []).map(getRoleBadgeConfig);
            const isActive = user.status === 'ACTIVE';
            const isAdminOpd = (user.roles ?? []).includes(USER_ROLES.ADMIN_OPD);
            // Administrator = memegang salah satu peran yang memerintah, yaitu
            // Admin Kabupaten atau Admin OPD. `responden` bukan administrator
            // betapapun aktifnya ia.
            const isAdministrator = (user.roles ?? []).some(
              (role) => role === USER_ROLES.ADMIN_KABUPATEN || role === USER_ROLES.ADMIN_OPD,
            );

            return (
              <Tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={user.initials}
                      size="md"
                      variant={getAvatarVariant((user.roles ?? [])[0])}
                    />
                    <div>
                      <div className="font-label-md text-text-primary">{user.name}</div>
                      <div className="text-xs text-text-secondary">{user.email}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  {/* `flex-wrap`, bukan sebaris: akun ber-tiga role akan
                      melebarkan tabel dan memaksa halaman bergeser horizontal. */}
                  <div className="flex flex-wrap gap-1">
                    {roleConfigs.length ? (
                      roleConfigs.map((cfg) => (
                        <span
                          key={cfg.label}
                          className={`inline-block whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold ${cfg.className}`}
                        >
                          {cfg.label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-text-secondary">-</span>
                    )}
                  </div>
                </Td>
                <Td className="text-body-md text-text-secondary">
                  {user.organization}
                </Td>
                <Td className="text-body-md text-text-secondary">
                  {user.createdAt}
                </Td>
                <Td>
                  <UserStatusBadge status={user.status} />
                </Td>
                <Td>
                  {/* Dua nilai saja, dan itu disengaja. Kolom "HAK AKSES
                      (ROLE)" sudah menyebutkan administrator JENIS APA; yang
                      belum dijawab kolom mana pun adalah "administrator atau
                      bukan", dan pertanyaan itulah yang dapat dipindai cepat
                      pada daftar panjang.

                      "Tidak" bernada redup, BUKAN merah: ia bertetangga dengan
                      Status Akses yang hijau, dan merah di sebelahnya terbaca
                      sebagai ada yang salah -- padahal bukan administrator
                      adalah keadaan normal bagi hampir seluruh warga. */}
                  <span
                    className={
                      isAdministrator
                        ? 'font-label-md text-text-primary'
                        : 'font-body-md text-text-secondary'
                    }
                  >
                    {isAdministrator ? 'Ya' : 'Tidak'}
                  </span>
                </Td>
                <Td>
                  {/* SATU tombol, bukan tiga tombol lepas (30 September 2026,
                      permintaan pengguna). Sebabnya lebar: kolom ini sudah
                      memuat tiga tombol dan tabelnya sudah dapat bergeser
                      horizontal di layar sempit, sementara butir keempat
                      ("Jadikan Admin OPD") memperburuknya.

                      Menunya digambar lewat portal -- lihat RowActionsMenu.
                      Menu absolut akan dipotong wadah `overflow-x-auto` di
                      atas, dan separuh butirnya tak dapat ditekan. */}
                  <RowActionsMenu
                    label={`Aksi untuk ${user.name}`}
                    items={[
                      {
                        key: 'edit',
                        label: 'Ubah Role',
                        icon: <Pencil size={14} />,
                        // TANPA SYARAT, termasuk untuk warga (permintaan
                        // pengguna 6 September 2026). Backend menerimanya sejak
                        // 5 September 2026: `ASSIGNABLE_ROLES` pada
                        // CreateUserDto memuat `responden`.
                        href: `/admin-kab/users/${user.id}/edit`,
                      },
                      // Disembunyikan bagi yang SUDAH Admin OPD: tak ada yang
                      // perlu dijelaskan pada keadaan itu, dan butir mati tanpa
                      // sebab hanya menjadi teka-teki.
                      !isAdminOpd && {
                        key: 'promote',
                        label: 'Jadikan Admin OPD',
                        icon: <Building2 size={14} />,
                        // Tanpa tautan instansi backend menolak 400 -- `opdId`
                        // milik Helpdesk dan UpdateUserDto tak menerimanya.
                        // Ditampilkan MATI beserta alasannya, bukan
                        // disembunyikan: justru inilah keadaan yang akan
                        // ditanyakan Admin Kabupaten.
                        disabled: !user.opdId,
                        keterangan: user.opdId
                          ? undefined
                          : 'Instansi belum ditautkan Helpdesk',
                        onSelect: () => onRequestAction?.(user, 'promote-opd'),
                      },
                      {
                        key: 'status',
                        label: isActive ? 'Nonaktifkan' : 'Aktifkan',
                        icon: isActive ? <UserX size={14} /> : <UserCheck size={14} />,
                        onSelect: () =>
                          onRequestAction?.(user, isActive ? 'deactivate' : 'activate'),
                      },
                      {
                        key: 'delete',
                        label: 'Hapus',
                        icon: <Trash2 size={14} />,
                        tone: 'danger',
                        pemisahSebelum: true,
                        onSelect: () => onRequestAction?.(user, 'delete'),
                      },
                    ]}
                  />
                </Td>
              </Tr>
            );
          })}
          </Tbody>
        </Table>
      </div>
      {pagination}
    </div>
  );
}
