import React from 'react';
import { ClipboardList, ShieldCheck, Building2, ToggleRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { USER_ROLES } from '../constants/userConstants';

const ROLE_LABELS = {
  [USER_ROLES.ADMIN_KABUPATEN]: 'Admin Kabupaten',
  [USER_ROLES.ADMIN_OPD]: 'Admin OPD',
  // Ditambahkan 5 September 2026: `responden` kini dapat diberikan lewat
  // Manajemen User, jadi tanpa baris ini ringkasannya menampilkan kode mentah.
  [USER_ROLES.RESPONDENT]: 'Masyarakat (Responden)',
};

function SummaryRow({ icon: Icon, label, value, emptyText = '—', badge }) {
  return (
    <div className="flex flex-col gap-1 py-sm border-b border-border last:border-0">
      <div className="flex items-center gap-1.5 text-text-secondary">
        <Icon size={13} className="flex-shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="pl-5">
        {badge || (
          <span
            className={`text-sm font-bold ${
              value ? 'text-text-primary' : 'text-outline-variant italic font-normal'
            }`}
          >
            {value || emptyText}
          </span>
        )}
      </div>
    </div>
  );
}

export default function UserAccessSummary({ formData, opdOptions = [] }) {
  // Beberapa role sekaligus (5 September 2026).
  const roles = formData.roles ?? [];
  const roleLabels = roles.map((r) => ROLE_LABELS[r] ?? r);

  const opdLabel = React.useMemo(() => {
    if (!formData.opdId) return null;
    const found = opdOptions.find((o) => String(o.value) === String(formData.opdId));
    return found ? found.label : null;
  }, [formData.opdId, opdOptions]);

  const isComplete =
    formData.fullName && formData.email && roles.length > 0 &&
    (!roles.includes(USER_ROLES.ADMIN_OPD) || formData.opdId);

  return (
    <Card className="p-lg sticky top-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-md pb-md border-b border-border">
        <ClipboardList size={16} className="text-primary" />
        <h2 className="font-bold text-text-primary text-sm">Ringkasan Hak Akses</h2>
      </div>

      {/* Summary rows */}
      <div className="space-y-0">
        <SummaryRow
          icon={ShieldCheck}
          label={roleLabels.length > 1 ? 'Role (beberapa)' : 'Role'}
          value={roleLabels.join(', ')}
          emptyText="Belum dipilih"
          badge={
            roleLabels.length ? (
              <span className="flex flex-wrap gap-1 justify-end">
                {roles.map((r) => (
                  <span
                    key={r}
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      r === USER_ROLES.ADMIN_KABUPATEN
                        ? 'bg-indigo-100 text-indigo-800'
                        : r === USER_ROLES.ADMIN_OPD
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {ROLE_LABELS[r] ?? r}
                  </span>
                ))}
              </span>
            ) : null
          }
        />

        {roles.includes(USER_ROLES.ADMIN_OPD) && (
          <SummaryRow
            icon={Building2}
            label="Instansi"
            value={opdLabel}
            emptyText="Belum dipilih"
          />
        )}

        <SummaryRow
          icon={ToggleRight}
          label="Status"
          badge={
            <Badge variant={formData.isActive ? 'success' : 'default'}>
              {formData.isActive ? 'Aktif' : 'Nonaktif'}
            </Badge>
          }
        />
      </div>

      {/* Completeness indicator */}
      <div
        className={`mt-md pt-md border-t border-border flex items-start gap-2 rounded-lg p-sm transition-colors duration-300 ${
          isComplete ? 'bg-emerald-50 border-emerald-100' : 'bg-surface-container-low'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 transition-colors duration-300 ${
            isComplete ? 'bg-emerald-500 animate-pulse' : 'bg-outline-variant'
          }`}
        />
        <p className={`text-xs leading-relaxed ${isComplete ? 'text-emerald-700 font-medium' : 'text-text-secondary'}`}>
          {isComplete
            ? 'Semua data wajib sudah diisi. Periksa kembali sebelum menyimpan.'
            : 'Lengkapi semua data wajib pada form untuk melanjutkan.'}
        </p>
      </div>
    </Card>
  );
}
