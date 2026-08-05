'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CreateUserHeader from '@/features/users/components/CreateUserHeader';
import AccountInformationCard from '@/features/users/components/AccountInformationCard';
import RoleAssignmentCard from '@/features/users/components/RoleAssignmentCard';
import AccountNotice from '@/features/users/components/AccountNotice';
import UserAccessSummary from '@/features/users/components/UserAccessSummary';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import { USER_ROLES } from '@/features/users/constants/userConstants';
import { getUserById, updateUser } from '@/features/users/services/users.api';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { getOpdList } from '@/features/opd/services/opd.api';
import { useAsync } from '@/hooks/useAsync';
import { X, Save, Loader2 } from 'lucide-react';

function validate(formData) {
  const errors = {};

  if (!formData.fullName.trim()) {
    errors.fullName = 'Nama lengkap wajib diisi.';
  } else if (formData.fullName.trim().length < 3) {
    errors.fullName = 'Nama lengkap minimal 3 karakter.';
  }

  if (!formData.role) {
    errors.role = 'Silakan pilih role administrator.';
  }

  if (formData.role === USER_ROLES.ADMIN_OPD && !formData.opdId) {
    errors.opdId = 'Silakan pilih instansi / OPD.';
  }

  return errors;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;

  // Ambil akun target + profil pengguna login sendiri (deteksi self-edit,
  // lihat catatan roleLocked di RoleAssignmentCard) + daftar OPD sekaligus.
  const fetchData = useCallback(async () => {
    const [user, me, opdResponse] = await Promise.all([
      getUserById(userId),
      getMyProfile(),
      getOpdList({ limit: 100, isActive: true }),
    ]);
    return { user, me, opdResponse };
  }, [userId]);

  const { data, isLoading, error, refetch } = useAsync(fetchData);

  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    // Warning ESLint react-hooks/set-state-in-effect diterima secara sadar --
    // sinkronisasi data fetch (useAsync) -> state form terkontrol lokal 1x
    // per selesai fetch, sama pola dgn useAsync.js sendiri, bukan bug.
    if (data?.user) {
      setFormData({
        fullName: data.user.name,
        email: data.user.email,
        role: data.user.role,
        opdId: data.user.opdId ? String(data.user.opdId) : '',
      });
    }
  }, [data]);

  const isSelf = Boolean(data?.me && data?.user && data.me.id === data.user.id);

  const opdOptions = useMemo(() => {
    const list = data?.opdResponse?.data ?? [];
    return [
      { value: '', label: 'Pilih Instansi / OPD' },
      ...list.map((opd) => ({ value: String(opd.id), label: opd.name })),
    ];
  }, [data]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: null }));
  };

  const handleDropdownChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Reset OPD jika role diganti bukan ke ADMIN_OPD
      if (field === 'role' && value !== USER_ROLES.ADMIN_OPD) {
        updated.opdId = '';
      }
      return updated;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorId = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser(userId, {
        fullName: formData.fullName.trim(),
        role: formData.role,
        opdId: formData.role === USER_ROLES.ADMIN_OPD ? formData.opdId : undefined,
      });
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

  if (isLoading || !formData) {
    return <LoadingState label="Memuat data pengguna..." />;
  }

  if (error) {
    return (
      <ErrorState title="Gagal memuat pengguna" description={error.message} onRetry={refetch} />
    );
  }

  const summaryFormData = { ...formData, isActive: data.user.status === 'ACTIVE' };

  return (
    <div className="p-lg w-full max-w-container-max mx-auto">
      <CreateUserHeader
        breadcrumbLabel="Ubah Role Admin"
        title="Ubah Role Admin"
        subtitle={`Perbarui nama dan hak akses untuk ${data.user.name}.`}
      />

      <form onSubmit={handleSubmit} noValidate>
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
              emailReadOnly
            />
            <RoleAssignmentCard
              formData={formData}
              onDropdownChange={handleDropdownChange}
              errors={errors}
              opdOptions={opdOptions}
              roleLocked={isSelf}
            />
            <AccountNotice />
          </div>

          {/* === Kolom Kanan: Summary Panel (Desktop) === */}
          <div className="hidden lg:block lg:col-span-1">
            <UserAccessSummary formData={summaryFormData} opdOptions={opdOptions} />
          </div>
        </div>

        {/* === Summary Panel Mobile (di bawah form) === */}
        <div className="lg:hidden mt-md">
          <UserAccessSummary formData={summaryFormData} opdOptions={opdOptions} />
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
                <span>Simpan Perubahan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
