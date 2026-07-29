import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import UserStatusBadge from './UserStatusBadge';
import { USER_ROLES } from '../constants/dummyUsers';
import EmptyState from '@/components/ui/EmptyState';
import { Users as UsersIcon } from 'lucide-react';

export default function UsersTable({ data }) {
  const getRoleBadgeConfig = (role) => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
        return { label: 'Super Admin', className: 'bg-rose-100 text-rose-800' };
      case USER_ROLES.ADMIN_KABUPATEN:
        return { label: 'Admin Kabupaten', className: 'bg-indigo-100 text-indigo-800' };
      case USER_ROLES.ADMIN_OPD:
        return { label: 'Admin OPD', className: 'bg-blue-100 text-blue-800' };
      case USER_ROLES.RESPONDENT:
        return { label: 'Responden Terdaftar', className: 'bg-slate-100 text-slate-800' };
      default:
        return { label: role, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const getAvatarVariant = (role) => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
        return 'primary';
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
        icon={UsersIcon}
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
            <Th className="text-slate-700 font-extrabold text-[12px] tracking-[0.1em] py-5 text-right">AKSI</Th>
          </Tr>
        </Thead>
        <Tbody className="divide-y divide-outline-variant">
          {data.map((user) => {
            const roleConfig = getRoleBadgeConfig(user.role);
            
            return (
              <Tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar 
                      initials={user.initials} 
                      size="md" 
                      variant={getAvatarVariant(user.role)} 
                    />
                    <div>
                      <div className="font-label-md text-text-primary">{user.name}</div>
                      <div className="text-xs text-text-secondary">{user.email}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleConfig.className}`}>
                    {roleConfig.label}
                  </span>
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
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button className="px-3 py-1 border border-outline-variant rounded-lg text-xs font-label-md text-text-primary hover:bg-slate-100 transition-colors">
                      Ubah Akses
                    </button>
                    <button className="px-3 py-1 border border-outline-variant rounded-lg text-xs font-label-md text-text-primary hover:bg-slate-100 transition-colors">
                      Reset Token JWT
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
