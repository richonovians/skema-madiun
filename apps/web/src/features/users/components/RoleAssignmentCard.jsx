import React from 'react';
import { ShieldCheck, Building2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { USER_ROLES } from '../constants/dummyUsers';

const ROLE_OPTIONS = [
  { value: '', label: 'Pilih Hak Akses (Role)' },
  { value: USER_ROLES.ADMIN_KABUPATEN, label: 'Admin Kabupaten' },
  { value: USER_ROLES.ADMIN_OPD, label: 'Admin OPD' },
];

/** `opdOptions` datang dari page.jsx (GET /opd sungguhan) -- versi dummy lama
 * pakai DUMMY_OPD (id palsu, tak match OPD asli manapun), akan selalu gagal
 * validasi backend (`opdId` tak ditemukan) kalau dikirim apa adanya. */
export default function RoleAssignmentCard({ formData, onDropdownChange, errors, opdOptions = [] }) {
  const isAdminOPD = formData.role === USER_ROLES.ADMIN_OPD;

  return (
    <Card className="p-lg">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-md pb-md border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="font-bold text-text-primary text-sm">Hak Akses</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Tentukan role dan cakupan akses administrator
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-md">
        {/* Role Dropdown */}
        <div className="space-y-xs">
          <Dropdown
            id="role"
            label="ROLE ADMINISTRATOR"
            options={ROLE_OPTIONS}
            value={formData.role}
            onChange={(value) => onDropdownChange('role', value)}
            error={errors.role}
          />
        </div>

        {/* OPD Dropdown — hanya muncul saat role === ADMIN_OPD */}
        {isAdminOPD && (
          <div className="space-y-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-xs">
              <Building2 size={14} className="text-text-secondary" />
              <span className="text-xs text-text-secondary font-medium">
                Pilih instansi yang akan dikelola oleh admin ini
              </span>
            </div>
            <Dropdown
              id="opdId"
              label="INSTANSI / OPD"
              options={opdOptions}
              value={formData.opdId}
              onChange={(value) => onDropdownChange('opdId', value)}
              error={errors.opdId}
            />
          </div>
        )}

        {/* Info: Jika Admin Kabupaten, tampilkan keterangan cakupan */}
        {formData.role === USER_ROLES.ADMIN_KABUPATEN && (
          <div className="flex items-start gap-2 p-sm bg-indigo-50 rounded-lg border border-indigo-100 animate-in fade-in duration-200">
            <ShieldCheck size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-700">
              Admin Kabupaten memiliki akses penuh terhadap seluruh OPD dan fitur sistem.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
