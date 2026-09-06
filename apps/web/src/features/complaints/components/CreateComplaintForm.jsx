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
import { getComplaintCategories } from '../services/reference.api';
import { createComplaint } from '../services/complaints.api';

export default function CreateComplaintForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [files, setFiles] = useState([]);

  const [formData, setFormData] = useState({
    department: '',
    category: '',
    title: '',
    description: '',
    isAnonim: false,
  });

  const fetchOpd = useCallback(() => getOpdList({ limit: 100, isActive: true }), []);
  const { data: opdResponse } = useAsync(fetchOpd);
  const fetchCategories = useCallback(() => getComplaintCategories(), []);
  const { data: categories } = useAsync(fetchCategories);

  const departmentOptions = (opdResponse?.data ?? []).map((opd) => ({
    label: opd.name,
    value: String(opd.id),
  }));
  /**
   * Nilai penampung untuk "pengirim tak tahu tujuannya" (6 September 2026).
   *
   * Sengaja BUKAN string kosong: kosong sudah dipakai penampung "Pilih
   * Instansi", jadi keduanya tak dapat dibedakan -- dan "belum memilih" harus
   * dapat dibedakan dari "sengaja memilih tak bertujuan", karena yang pertama
   * seharusnya menghalangi pengiriman sedangkan yang kedua justru sah.
   */
  const TANPA_TUJUAN = 'tanpa-tujuan';
  const categoryOptions = (categories ?? []).map((c) => ({ label: c.nama, value: c.kode }));

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createComplaint(
        {
          // `undefined`, bukan '' atau NaN: medannya harus benar-benar tidak
          // ikut terkirim, karena backend memvalidasi @IsInt bila ada.
          opdId: formData.department === TANPA_TUJUAN ? undefined : formData.department,
          kategori: formData.category,
          title: formData.title,
          description: formData.description,
          isAnonim: formData.isAnonim,
        },
        files,
      );
      if (formData.department === TANPA_TUJUAN) {
        // Tanpa `opdId`/`opdName` di URL: halaman sukses menampilkan tujuan
        // pengaduan, dan mengarang nama instansi di sini berarti memberi tahu
        // pelapor bahwa tiketnya sudah menuju suatu tempat -- padahal justru
        // sedang menunggu ditriase.
        router.push(`/complaints/success?complaintId=${result.id}`);
        return;
      }
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
            options={[
              { label: 'Pilih Instansi', value: '' },
              { label: 'Belum tahu tujuannya', value: TANPA_TUJUAN },
              ...departmentOptions,
            ]}
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

        {/* Kotak centang dibungkus labelnya sendiri (pola sama ConsentGate.jsx):
            kotaknya 20px, tapi bidang sentuhnya seluruh label -- itulah yang
            memenuhi target 44px, bukan kotaknya. */}
        <label
          htmlFor="isAnonim"
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-container-low/60 cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/20"
        >
          <input
            id="isAnonim"
            type="checkbox"
            checked={formData.isAnonim}
            onChange={(e) => setFormData((prev) => ({ ...prev, isAnonim: e.target.checked }))}
            aria-describedby="isAnonim-bantuan"
            className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-sm text-text-primary leading-relaxed">
            Kirim sebagai <strong className="font-semibold">anonim</strong> (identitas pelapor
            tidak ditampilkan kepada petugas).
          </span>
        </label>
        <p id="isAnonim-bantuan" className="text-xs text-text-secondary -mt-4 px-1">
          Anda tetap dapat memantau status dan menerima notifikasi pengaduan ini.
        </p>

        <div>
          <label className="block text-sm font-bold text-text-primary mb-2">Lampiran Bukti (Foto/Dokumen)</label>
          <FileDropzone files={files} onFilesChange={setFiles} />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-border">

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
