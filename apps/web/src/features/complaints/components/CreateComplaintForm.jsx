'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Textarea from '@/components/ui/Textarea';
import FileDropzone from '@/components/ui/FileDropzone';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function CreateComplaintForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  
  const [formData, setFormData] = useState({
    department: '',
    category: '',
    title: '',
    description: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      alert('Laporan berhasil terkirim! Tiket Anda sedang diproses.');
      setIsSubmitting(false);
      router.push('/complaints');
    }, 1500);
  };

  const departmentOptions = [
    { label: 'Dinas Kesehatan', value: 'dinkes' },
    { label: 'Dinas Pendidikan', value: 'disdik' },
    { label: 'Dinas PUPR', value: 'pupr' },
    { label: 'Dinas Perhubungan', value: 'dishub' }
  ];

  const categoryOptions = [
    { label: 'Layanan Publik', value: 'layanan' },
    { label: 'Infrastruktur', value: 'infrastruktur' },
    { label: 'Lingkungan Hidup', value: 'lingkungan' },
    { label: 'Bantuan Sosial', value: 'sosial' }
  ];

  return (
    <Card className="p-5 sm:p-8 shadow-xl border border-border">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
        <div className="w-1 h-10 bg-primary-container rounded-full"></div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Sampaikan Keluhan & Pengaduan Anda</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Dropdown 
            label="OPD / Instansi Tujuan" 
            id="department"
            options={[{label: 'Pilih Instansi', value: ''}, ...departmentOptions]}
            value={formData.department}
            onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
          />
          <Dropdown 
            label="Kategori Pengaduan" 
            id="category"
            options={[{label: 'Pilih Kategori', value: ''}, ...categoryOptions]}
            value={formData.category}
            onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
          />
        </div>

        <Input 
          label="Judul Laporan" 
          id="title"
          placeholder="Ringkasan singkat keluhan Anda"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <Textarea 
          label="Uraian Detail Kejadian" 
          id="description"
          placeholder="Ceritakan kronologi kejadian secara lengkap (Waktu, Tempat, dan Pihak terlibat)"
          rows={6}
          value={formData.description}
          onChange={handleChange}
          required
        />

        <div>
          <label className="block text-sm font-bold text-text-primary mb-2">Lampiran Bukti (Foto/Dokumen)</label>
          <FileDropzone files={files} onFilesChange={setFiles} />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-border">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full md:w-auto min-h-[48px] px-8 rounded-lg text-outline font-bold hover:bg-surface-variant transition-colors bg-transparent"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Batalkan
          </Button>
          <Button 
            type="submit" 
            className="w-full md:w-auto min-h-[48px] px-8 rounded-lg bg-primary-container text-white font-bold shadow-lg shadow-primary-container/20 hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                Mengirim...
              </>
            ) : (
              'Kirim Laporan'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
