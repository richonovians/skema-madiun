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
    layanan: '',
    isAnonymous: false,
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.opd) {
      setErrors({ opd: "Silakan pilih Instansi / OPD yang ingin dinilai terlebih dahulu" });
      return;
    }
    
    if (!formData.layanan) {
      setErrors({ layanan: "Silakan pilih layanan yang ingin dinilai" });
      return;
    }

    router.push(`/surveys/${formData.opd}?layanan=${formData.layanan}&anonymous=${formData.isAnonymous}`);
  };

  const handleDropdownChange = (id, value) => {
    if (id === 'opd') {
      setFormData(prev => ({ ...prev, opd: value, layanan: '' }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: null }));
  };

  const layananOptionsMap = {
    disdukcapil: [
      { value: 'ktp_kk', label: 'Pelayanan KTP & KK' },
      { value: 'akta', label: 'Pelayanan Akta Kelahiran/Kematian' },
      { value: 'pindah_datang', label: 'Pelayanan Pindah Datang' },
    ],
    dpmptsp: [
      { value: 'perizinan_usaha', label: 'Perizinan Berusaha' },
      { value: 'non_perizinan', label: 'Pelayanan Non Perizinan' },
    ],
    dinkes: [
      { value: 'pelayanan_puskesmas', label: 'Pelayanan Puskesmas' },
      { value: 'fasilitas_kesehatan', label: 'Fasilitas Kesehatan' },
      { value: 'bpjs', label: 'Layanan BPJS/Jaminan Kesehatan' },
    ],
  };

  const kecamatanList = ['balerejo', 'dagangan', 'dolopo', 'geger', 'gemarang', 'jiwan', 'kare', 'kebonsari', 'madiun', 'mejayan', 'pilangkenceng', 'saradan', 'sawahan', 'wonoasri', 'wungu'];
  kecamatanList.forEach(kec => {
    layananOptionsMap[`kec_${kec}`] = [
      { value: 'adm_kependudukan', label: 'Administrasi Kependudukan' },
      { value: 'surat_pengantar', label: 'Surat Pengantar' },
      { value: 'legalisasi', label: 'Legalisasi' },
      { value: 'perizinan_tertentu', label: 'Perizinan Tertentu' },
      { value: 'pengaduan_masyarakat', label: 'Pengaduan Masyarakat' },
      { value: 'pembinaan_desa', label: 'Pembinaan Desa' },
    ];
  });

  return (
    <section className="w-full bg-white rounded-xl shadow-2xl p-6 lg:p-8 border border-slate-100">
      <div className="mb-8 border-b border-border pb-6">
        <h2 className="font-h2 text-h2 text-text-primary mb-2">Formulir Survei Kepuasan</h2>
        <p className="text-text-secondary text-sm">Pilih instansi untuk memulai pengisian survei kepuasan masyarakat.</p>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Select Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-[50]">
          <Dropdown
            id="opd"
            label="PILIH INSTANSI / OPD"
            value={formData.opd}
            onChange={(value) => handleDropdownChange('opd', value)}
            error={errors.opd}
            options={[
              { value: '', label: 'Pilih Instansi' },
              { value: 'disdukcapil', label: 'Dinas Kependudukan dan Pencatatan Sipil' },
              { value: 'dpmptsp', label: 'Dinas Penanaman Modal dan PTSP' },
              { value: 'dinkes', label: 'Dinas Kesehatan (Puskesmas)' },
              { value: 'kec_balerejo', label: 'Kecamatan Balerejo' },
              { value: 'kec_dagangan', label: 'Kecamatan Dagangan' },
              { value: 'kec_dolopo', label: 'Kecamatan Dolopo' },
              { value: 'kec_geger', label: 'Kecamatan Geger' },
              { value: 'kec_gemarang', label: 'Kecamatan Gemarang' },
              { value: 'kec_jiwan', label: 'Kecamatan Jiwan' },
              { value: 'kec_kare', label: 'Kecamatan Kare' },
              { value: 'kec_kebonsari', label: 'Kecamatan Kebonsari' },
              { value: 'kec_madiun', label: 'Kecamatan Madiun' },
              { value: 'kec_mejayan', label: 'Kecamatan Mejayan' },
              { value: 'kec_pilangkenceng', label: 'Kecamatan Pilangkenceng' },
              { value: 'kec_saradan', label: 'Kecamatan Saradan' },
              { value: 'kec_sawahan', label: 'Kecamatan Sawahan' },
              { value: 'kec_wonoasri', label: 'Kecamatan Wonoasri' },
              { value: 'kec_wungu', label: 'Kecamatan Wungu' }
            ]}
          />
          <Dropdown
            id="layanan"
            label="PILIH LAYANAN"
            value={formData.layanan}
            onChange={(value) => handleDropdownChange('layanan', value)}
            error={errors.layanan}
            options={[
              { value: '', label: formData.opd ? 'Pilih Layanan' : 'Pilih OPD Terlebih Dahulu' },
              ...(formData.opd && layananOptionsMap[formData.opd] ? layananOptionsMap[formData.opd] : [])
            ]}
            disabled={!formData.opd}
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
