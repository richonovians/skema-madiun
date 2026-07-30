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

        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
            className={`group inline-flex items-center gap-4 p-2.5 pr-4 rounded-xl border transition-all duration-300 overflow-hidden relative ${
              formData.isAnonymous 
                ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 z-10">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                formData.isAnonymous ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}>
                {formData.isAnonymous ? <UserX size={16} /> : <User size={16} />}
              </div>
              <span className={`font-bold text-sm transition-colors duration-300 ${formData.isAnonymous ? 'text-emerald-700' : 'text-slate-700'}`}>
                Anonim
              </span>
            </div>
            
            <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 z-10 ${
              formData.isAnonymous ? 'bg-emerald-500' : 'bg-slate-200'
            }`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform duration-300 shadow-sm ${
                formData.isAnonymous ? 'translate-x-6' : 'translate-x-1'
              }`}></div>
            </div>
            
            {/* Dynamic glowing background when active */}
            <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent transition-opacity duration-500 ${
              formData.isAnonymous ? 'opacity-100' : 'opacity-0'
            }`}></div>
          </button>
        </div>

        {/* Action Button */}
        <Button type="submit" className="w-full py-4 text-xl">
          Mulai Survei
        </Button>
      </form>
    </section>
  );
}
