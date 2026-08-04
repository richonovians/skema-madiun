"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import { User, UserX, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';

export default function ComplaintForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    opd: '',
    kategori: '',
    judul: '',
    uraian: '',
    isAnonymous: false,
  });
  const [errors, setErrors] = useState({});
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let newErrors = {};
    
    // Validasi semua kolom wajib
    if (!formData.opd) {
      newErrors.opd = "Silakan pilih Instansi / OPD tujuan terlebih dahulu.";
    }
    if (!formData.kategori) {
      newErrors.kategori = "Kategori pengaduan wajib dipilih.";
    }
    if (!formData.judul || formData.judul.trim() === '') {
      newErrors.judul = "Judul pengaduan wajib diisi.";
    }
    if (!formData.uraian || formData.uraian.trim() === '') {
      newErrors.uraian = "Uraian kejadian wajib diisi.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      
      // Auto-scroll ke form agar error terlihat
      const firstErrorId = Object.keys(newErrors)[0];
      document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    setErrors({});
    
    console.log("Submitting:", formData);
    
    // Dapatkan label opd untuk nama instansi
    const opdOptions = [
      { value: 'pupr', label: 'Dinas Pekerjaan Umum dan Penataan Ruang' },
      { value: 'dishub', label: 'Dinas Perhubungan' },
      { value: 'dinkes', label: 'Dinas Kesehatan' },
      { value: 'dukcapil', label: 'Dinas Kependudukan dan Pencatatan Sipil' },
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
    ];
    const selectedOpd = opdOptions.find(o => o.value === formData.opd);
    const opdName = selectedOpd ? selectedOpd.label : 'Instansi Terkait';
    
    // Redirect ke halaman sukses dengan parameter
    const randomId = Math.floor(10000 + Math.random() * 90000);
    const complaintId = `COM-2026-${randomId}`;
    
    router.push(`/complaints/success?complaintId=${complaintId}&opdId=${formData.opd}&opdName=${encodeURIComponent(opdName)}`);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    // Clear error when user starts typing
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: null }));
  };

  const handleDropdownChange = (id, value) => {
    if (id === 'opd') {
      setFormData(prev => ({ ...prev, opd: value, kategori: '' }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: null }));
  };

  const categoryOptionsMap = {
    pupr: [
      { value: 'infrastruktur_jalan', label: 'Infrastruktur Jalan & Jembatan' },
      { value: 'infrastruktur_air', label: 'Infrastruktur Pengairan' },
      { value: 'tata_ruang', label: 'Tata Ruang & Bangunan' },
    ],
    dishub: [
      { value: 'rambu', label: 'Rambu Lalu Lintas & PJU' },
      { value: 'parkir', label: 'Pelayanan Parkir' },
      { value: 'angkutan', label: 'Angkutan Umum' },
    ],
    dinkes: [
      { value: 'pelayanan_puskesmas', label: 'Pelayanan Puskesmas' },
      { value: 'fasilitas_kesehatan', label: 'Fasilitas Kesehatan' },
      { value: 'bpjs', label: 'Layanan BPJS/Jaminan Kesehatan' },
    ],
    dukcapil: [
      { value: 'ktp_kk', label: 'Pelayanan KTP & KK' },
      { value: 'akta', label: 'Pelayanan Akta Kelahiran/Kematian' },
      { value: 'pindah_datang', label: 'Pelayanan Pindah Datang' },
    ],
  };

  // Add default categories for all kecamatans
  const kecamatanList = ['balerejo', 'dagangan', 'dolopo', 'geger', 'gemarang', 'jiwan', 'kare', 'kebonsari', 'madiun', 'mejayan', 'pilangkenceng', 'saradan', 'sawahan', 'wonoasri', 'wungu'];
  kecamatanList.forEach(kec => {
    categoryOptionsMap[`kec_${kec}`] = [
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
        <h2 className="font-h2 text-h2 text-text-primary mb-2">Formulir Pengaduan</h2>
        <p className="text-text-secondary text-sm">Lengkapi data di bawah ini untuk mengirimkan laporan Anda secara resmi.</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Dropdown
          id="opd"
          label="OPD TUJUAN"
          value={formData.opd}
          onChange={(value) => handleDropdownChange('opd', value)}
          error={errors.opd}
          options={[
            { value: '', label: 'Pilih Organisasi Perangkat Daerah' },
            { value: 'pupr', label: 'Dinas Pekerjaan Umum dan Penataan Ruang' },
            { value: 'dishub', label: 'Dinas Perhubungan' },
            { value: 'dinkes', label: 'Dinas Kesehatan' },
            { value: 'dukcapil', label: 'Dinas Kependudukan dan Pencatatan Sipil' },
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-[50]">
          <Dropdown
            id="kategori"
            label="KATEGORI PENGADUAN"
            value={formData.kategori}
            onChange={(value) => handleDropdownChange('kategori', value)}
            error={errors.kategori}
            options={[
              { value: '', label: formData.opd ? 'Pilih Kategori' : 'Pilih OPD Terlebih Dahulu' },
              ...(formData.opd && categoryOptionsMap[formData.opd] ? categoryOptionsMap[formData.opd] : [])
            ]}
            disabled={!formData.opd}
          />
          <div className="w-full">
            <Input
              id="judul"
              label="JUDUL PENGADUAN"
              placeholder="Ringkasan laporan Anda"
              value={formData.judul}
              onChange={handleChange}
            />
            {errors.judul && (
              <p className="text-xs text-error flex items-center gap-1.5 mt-1.5">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-error/10 text-error text-[10px] font-bold flex-shrink-0">
                  !
                </span>
                <span>{errors.judul}</span>
              </p>
            )}
          </div>
        </div>

        <div className="w-full">
          <Textarea
            id="uraian"
            label="URAIAN KEJADIAN"
            placeholder="Jelaskan secara detail mengenai laporan yang ingin disampaikan..."
            rows={5}
            value={formData.uraian}
            onChange={handleChange}
          />
          {errors.uraian && (
            <p className="text-xs text-error flex items-center gap-1.5 mt-1.5">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-error/10 text-error text-[10px] font-bold flex-shrink-0">
                !
              </span>
              <span>{errors.uraian}</span>
            </p>
          )}
        </div>

        <div>
          <FileUpload
            id="lampiran"
            label="LAMPIRAN PENDUKUNG"
            onChange={handleFileChange}
          />
          {file && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-emerald-100 p-2 rounded-md text-emerald-600 shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-800">File berhasil diunggah</p>
                  <p className="text-xs text-emerald-600 truncate">{file.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={removeFile}
                className="text-emerald-600 hover:text-emerald-800 p-1.5 hover:bg-emerald-100 rounded-md transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
            className={`group inline-flex items-center gap-4 p-2.5 pr-4 rounded-xl border transition-all duration-300 overflow-hidden relative mt-4 ${
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

        <div className="pt-4">
          <Button type="submit" className="w-full">
            Kirim Pengaduan
          </Button>
          <p className="text-center text-xs text-text-secondary mt-4">
            Dengan mengirimkan laporan, Anda menyetujui <Link className="text-primary hover:underline" href="#">Syarat &amp; Ketentuan</Link> yang berlaku.
          </p>
        </div>
      </form>
    </section>
  );
}
