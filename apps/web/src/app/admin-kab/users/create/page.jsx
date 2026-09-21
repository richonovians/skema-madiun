'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateUserHeader from '@/features/users/components/CreateUserHeader';
import AccountInformationCard from '@/features/users/components/AccountInformationCard';
import RoleAssignmentCard from '@/features/users/components/RoleAssignmentCard';
import AccountStatusCard from '@/features/users/components/AccountStatusCard';
import AccountNotice from '@/features/users/components/AccountNotice';
import UserAccessSummary from '@/features/users/components/UserAccessSummary';
import Button from '@/components/ui/Button';
import { USER_ROLES } from '@/features/users/constants/userConstants';
import { createUser, updateUserStatus } from '@/features/users/services/users.api';
import { getOpdList } from '@/features/opd/services/opd.api';
import { useAsync } from '@/hooks/useAsync';
import { X, Save, Loader2 } from 'lucide-react';

// `phone` DIHAPUS -- skema User backend tak punya kolom ini sama sekali
// (lihat AccountInformationCard.jsx).
const INITIAL_FORM = {
  fullName: '',
  email: '',
  // Array sejak 5 September 2026: satu akun boleh memegang beberapa role.
  roles: [],
  opdId: '',
  isActive: true,
};

function validate(formData) {
  const errors = {};

  if (!formData.fullName.trim()) {
    errors.fullName = 'Nama lengkap wajib diisi.';
  } else if (formData.fullName.trim().length < 3) {
    errors.fullName = 'Nama lengkap minimal 3 karakter.';
  }

  if (!formData.email.trim()) {
    errors.email = 'Alamat email wajib diisi.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Format email tidak valid.';
  }

  if (!formData.roles.length) {
    errors.roles = 'Silakan pilih minimal satu role administrator.';
  }

  if (formData.roles.includes(USER_ROLES.ADMIN_OPD) && !formData.opdId) {
    errors.opdId = 'Silakan pilih instansi / OPD.';
  }

  return errors;
}

export default function CreateUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fetchOpd = useCallback(() => getOpdList({ limit: 100, isActive: true }), []);
  const { data: opdResponse } = useAsync(fetchOpd);
  const opdOptions = useMemo(() => {
    const list = opdResponse?.data ?? [];
    return [
      { value: '', label: 'Pilih Instansi / OPD' },
      ...list.map((opd) => ({ value: String(opd.id), label: opd.name })),
    ];
  }, [opdResponse]);

  // Handler untuk input text (Input component)
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: null }));
  };

  // Handler untuk Dropdown component (kini hanya OPD -- role memakai kotak centang)
  const handleDropdownChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleRolesChange = (roles) => {
    // Ketika mencentang role salah satu dari Admin OPD / Admin Kabupaten,
    // maka role Masyarakat (Responden) otomatis tercentang (21 September 2026).
    setFormData((prev) => {
      const prevRoles = prev?.roles ?? [];
      const justCheckedAdminOpd =
        !prevRoles.includes(USER_ROLES.ADMIN_OPD) && roles.includes(USER_ROLES.ADMIN_OPD);
      const justCheckedAdminKab =
        !prevRoles.includes(USER_ROLES.ADMIN_KABUPATEN) && roles.includes(USER_ROLES.ADMIN_KABUPATEN);

      let nextRoles = roles;
      if ((justCheckedAdminOpd || justCheckedAdminKab) && !roles.includes(USER_ROLES.RESPONDENT)) {
        nextRoles = [...roles, USER_ROLES.RESPONDENT];
      }

      return {
        ...prev,
        roles: nextRoles,
        // Tautan OPD dilepas begitu Admin OPD tak lagi tercentang: tanpa role itu
        // nilainya tak punya arti, dan backend pun mengosongkannya
        // (UsersService.normalisasiRoles).
        opdId: nextRoles.includes(USER_ROLES.ADMIN_OPD) ? prev.opdId : '',
      };
    });
    if (errors.roles) setErrors((prev) => ({ ...prev, roles: null }));
  };

  // Handler untuk Switch status
  const handleStatusChange = (value) => {
    setFormData((prev) => ({ ...prev, isActive: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validasi frontend
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll ke field error pertama
      const firstErrorId = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        roles: formData.roles,
        opdId: formData.roles.includes(USER_ROLES.ADMIN_OPD) ? formData.opdId : undefined,
      });

      // Akun baru SELALU dibuat aktif di backend (UsersService.create hardcode
      // isActive:true) -- kalau admin minta nonaktif sejak awal, susulkan
      // panggilan status terpisah (satu-satunya cara mewujudkan toggle ini).
      if (!formData.isActive) {
        await updateUserStatus(created.id, false);
      }

      router.push('/admin-kab/users');
    } catch (err) {
      setSubmitError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin-kab/users');
  };

  return (
    <div className="p-lg w-full max-w-container-max mx-auto">
      {/* Header */}
      <CreateUserHeader />

      <form onSubmit={handleSubmit} noValidate>
        {/* Submit error global */}
        {submitError && (
          <div className="mb-md p-md bg-error-container border border-error/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <X size={16} className="text-on-error-container mt-0.5 flex-shrink-0" />
            <p className="text-sm text-on-error-container">{submitError}</p>
          </div>
        )}

        {/* Main layout: form (kiri) + summary panel (kanan) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
          {/* === Kolom Kiri: Form === */}
          <div className="lg:col-span-2 flex flex-col gap-md">
            <AccountInformationCard
              formData={formData}
              onChange={handleChange}
              errors={errors}
            />
            <RoleAssignmentCard
              formData={formData}
              onRolesChange={handleRolesChange}
              onDropdownChange={handleDropdownChange}
              errors={errors}
              opdOptions={opdOptions}
            />
            <AccountStatusCard
              isActive={formData.isActive}
              onChange={handleStatusChange}
            />
            <AccountNotice />
          </div>

          {/* === Kolom Kanan: Summary Panel (Desktop) === */}
          <div className="hidden lg:block lg:col-span-1">
            <UserAccessSummary formData={formData} opdOptions={opdOptions} />
          </div>
        </div>

        {/* === Summary Panel Mobile (di bawah form) === */}
        <div className="lg:hidden mt-md">
          <UserAccessSummary formData={formData} opdOptions={opdOptions} />
        </div>

        {/* === Action Buttons === */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-lg pt-lg border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-text-primary font-bold text-sm hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={16} />
            Batal
          </button>
          <Button
            type="submit"
            variant="primary-box"
            className="px-8 py-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Simpan Akun</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
