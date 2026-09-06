import React from 'react';
import Link from 'next/link';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Avatar from '@/components/ui/Avatar';
import UserStatusBadge from './UserStatusBadge';
import { USER_ROLES } from '../constants/userConstants';
import EmptyState from '@/components/ui/EmptyState';
import { Users as UsersIcon, Pencil, Trash2 } from 'lucide-react';

/**
 * Kolom AKSI versi dummy lama ("Ubah Role" dropdown + "Reset Token JWT")
 * DIHAPUS TOTAL -- keduanya tak pernah tersambung ke mana pun. Reset token
 * masih tak berlaku (JWT stateless tanpa mekanisme revoke, lihat
 * SessionService/AuthProvider). Diganti toggle Aktifkan/Nonaktifkan
 * (`PATCH /users/:id/status`), link Ubah Role (`PATCH /users/:id`,
 * 2026-08-05), dan Hapus (`DELETE /users/:id`, soft delete, 2026-08-05 --
 * sebelumnya `deletedAt` ada di skema tapi tak ada endpoint/UI sama sekali).
 */
export default function UsersTable({ data, onUpdateStatus, onDelete, pagination }) {
  const getRoleBadgeConfig = (role) => {
    switch (role) {
      // Warna dibedakan dari Admin Kabupaten: keduanya kini peran berbeda, dan
      // yang membedakan bukan cuma nama (superuser + akses log aktivitas).
      case USER_ROLES.SUPERUSER:
        return { label: 'Superuser', className: 'bg-violet-100 text-violet-800' };
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
      case USER_ROLES.SUPERUSER:
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
                  <div className="flex items-center gap-2">
                    {/* TANPA SYARAT, termasuk untuk warga (permintaan pengguna
                        6 September 2026). Backend menerimanya sejak
                        5 September 2026: `ASSIGNABLE_ROLES` pada CreateUserDto
                        memuat `responden`.

                        Syarat `user.role !== USER_ROLES.RESPONDENT` yang dulu
                        ada di sini SUDAH MATI sejak adapter beralih ke `roles`:
                        `user.role` tak ada lagi, jadi `undefined !==
                        'responden'` selalu benar dan tombolnya sebenarnya sudah
                        tampil untuk semua orang -- di bawah komentar yang
                        menyatakan kebalikannya. Dihapus supaya yang tersurat
                        sama dengan yang terjadi. */}
                    <Link
                      href={`/admin-kab/users/${user.id}/edit`}
                      className="whitespace-nowrap px-3 py-1 border border-outline-variant rounded-lg text-xs font-label-md text-text-primary hover:bg-slate-100 transition-colors h-[32px] flex items-center justify-center gap-1"
                    >
                      <Pencil size={12} />
                      Ubah Role
                    </Link>
                    <button
                      onClick={() => onUpdateStatus?.(user.id, !isActive)}
                      className="whitespace-nowrap px-3 py-1 border border-outline-variant rounded-lg text-xs font-label-md text-text-primary hover:bg-slate-100 transition-colors h-[32px] flex items-center justify-center"
                    >
                      {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus akun "${user.name}"? Akun tidak bisa login lagi setelah dihapus.`)) {
                          onDelete?.(user.id);
                        }
                      }}
                      className="whitespace-nowrap px-3 py-1 border border-outline-variant rounded-lg text-xs font-label-md text-error hover:bg-error-container transition-colors h-[32px] flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} />
                      Hapus
                    </button>
                  </div>
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
