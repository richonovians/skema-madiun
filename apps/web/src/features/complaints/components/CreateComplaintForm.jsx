'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Textarea from '@/components/ui/Textarea';
import FileDropzone from '@/components/ui/FileDropzone';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { getOpdList } from '@/features/opd/services/opd.api';
import { getComplaintCategories, getComplaintSubCategories } from '../services/reference.api';
import { createComplaint } from '../services/complaints.api';

export default function CreateComplaintForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [files, setFiles] = useState([]);

  const [formData, setFormData] = useState({
    department: '',
    category: '',
    subCategory: '',
    title: '',
    description: '',
  });

  const fetchOpd = useCallback(() => getOpdList({ limit: 100, isActive: true }), []);
  const { data: opdResponse } = useAsync(fetchOpd);
  const fetchCategories = useCallback(() => getComplaintCategories(), []);
  const { data: categories } = useAsync(fetchCategories);
  const fetchSubCategories = useCallback(() => getComplaintSubCategories(), []);
  const { data: subCategories } = useAsync(fetchSubCategories);

  const departmentOptions = (opdResponse?.data ?? []).map((opd) => ({
    label: opd.name,
    value: String(opd.id),
  }));
  const categoryOptions = (categories ?? []).map((c) => ({ label: c.nama, value: c.kode }));
  const subCategoryOptions = (subCategories ?? [])
    .filter((s) => s.kategoriKode === formData.category)
    .map((s) => ({ label: s.nama, value: s.kode }));

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCategoryChange = (value) => {
    // Sub-kategori bergantung kategori -- reset saat kategori berganti (sub-kategori
    // lama kemungkinan tak lagi valid utk kategori baru).
    setFormData((prev) => ({ ...prev, category: value, subCategory: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createComplaint(
        {
          opdId: formData.department,
          kategori: formData.category,
          subKategori: formData.subCategory,
          title: formData.title,
          description: formData.description,
        },
        files,
      );
      const opdName =
        departmentOptions.find((o) => o.value === formData.department)?.label ?? 'Instansi Terkait';
      router.push(
        `/complaints/success?complaintId=${result.id}&opdId=${formData.department}&opdName=${encodeURIComponent(opdName)}`,
      );
    } catch (err) {
      setSubmitError(err.message || 'Gagal mengirim pengaduan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-5 sm:p-8 shadow-xl border border-border">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
        <div className="w-1 h-10 bg-primary-container rounded-full"></div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Sampaikan Keluhan & Pengaduan Anda</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {submitError && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Dropdown
            label="OPD / Instansi Tujuan"
            id="department"
            options={[{ label: 'Pilih Instansi', value: '' }, ...departmentOptions]}
            value={formData.department}
            onChange={(val) => setFormData((prev) => ({ ...prev, department: val }))}
          />
          <Dropdown
            label="Kategori Pengaduan"
            id="category"
            options={[{ label: 'Pilih Kategori', value: '' }, ...categoryOptions]}
            value={formData.category}
            onChange={handleCategoryChange}
          />
        </div>

        {formData.category && subCategoryOptions.length > 0 && (
          <Dropdown
            label="Sub-Kategori (opsional)"
            id="subCategory"
            options={[{ label: 'Pilih Sub-Kategori', value: '' }, ...subCategoryOptions]}
            value={formData.subCategory}
            onChange={(val) => setFormData((prev) => ({ ...prev, subCategory: val }))}
          />
        )}

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
