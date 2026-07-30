"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { User, UserX } from 'lucide-react';

export default function SurveyForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    opd: '',
    isAnonymous: false,
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    if (formData.opd) {
      router.push(`/surveys/${formData.opd}?anonymous=${formData.isAnonymous}`);
    } else {
      setErrors({ opd: "Silakan pilih Instansi / OPD yang ingin dinilai terlebih dahulu" });
    }
  };

  const handleDropdownChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: null }));
  };

  return (
    <section className="w-full bg-white rounded-xl shadow-2xl p-6 lg:p-8 border border-slate-100">
      <div className="mb-8 border-b border-border pb-6">
        <h2 className="font-h2 text-h2 text-text-primary mb-2">Formulir Survei Kepuasan</h2>
        <p className="text-text-secondary text-sm">Pilih instansi untuk memulai pengisian survei kepuasan masyarakat.</p>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Select Field */}
        <div className="relative z-[50]">
          <Dropdown
            id="opd"
            label="Pilih Instansi / OPD yang Dinilai"
            value={formData.opd}
            onChange={(value) => handleDropdownChange('opd', value)}
            error={errors.opd}
            options={[
              { value: '', label: 'Pilih Instansi' },
              { value: 'disdukcapil', label: 'Dinas Kependudukan dan Pencatatan Sipil' },
              { value: 'dpmptsp', label: 'Dinas Penanaman Modal dan PTSP' },
              { value: 'dinkes', label: 'Dinas Kesehatan (Puskesmas)' },
              { value: 'kecamatan', label: 'Kantor Kecamatan' }
            ]}
          />
        </div>


        {/* Action Button */}
        <Button type="submit" className="w-full py-4 text-xl">
          Mulai Survei
        </Button>
      </form>
    </section>
  );
}
