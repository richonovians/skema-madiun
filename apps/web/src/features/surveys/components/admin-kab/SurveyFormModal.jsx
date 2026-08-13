'use client';

import React, { useEffect, useState } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { buildPeriode, parsePeriode } from '@/features/surveys/adapters/survey.adapter';

const CURRENT_YEAR = new Date().getFullYear();
// Rentang tahun sama dgn BuilderToolbar.jsx: 1 tahun lalu s.d. 2 tahun ke depan.
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];
const QUARTER_OPTIONS = [
  { value: 1, label: 'Triwulan I' },
  { value: 2, label: 'Triwulan II' },
  { value: 3, label: 'Triwulan III' },
  { value: 4, label: 'Triwulan IV' },
];
const MAX_TITLE_LENGTH = 100; // CreateSurveyDto/UpdateSurveyDto backend: @MaxLength(100)
/**
 * Daftar pilihan dropdown dipendekkan (dari bawaan `max-h-60` = 240px) lalu
 * digulung di dalamnya sendiri. Alasannya: daftar mengapung ke bawah, dan pada
 * layar pendek (kartu ikut terpangkas `max-h-[90vh]`) daftar yang panjang
 * menimpa tombol "Batal"/"Buat Survei" di footer.
 *
 * Dua nilai BERBEDA karena jarak ke footer memang berbeda: field OPD berada
 * satu baris (~84px: label + tombol + jarak antar-field) di ATAS baris
 * Triwulan/Tahun, jadi ia punya ruang ekstra sebanyak itu. OPD memakai jatah
 * lebih besar karena nama instansinya panjang dan daftarnya banyak, sementara
 * Triwulan/Tahun cuma 4-5 opsi pendek.
 */
const MENU_MAX_HEIGHT_OPD = 'max-h-[200px]';
const MENU_MAX_HEIGHT_PERIODE = 'max-h-[120px]';

/**
 * Form buat/ubah survei untuk Admin Kabupaten (lintas OPD).
 *
 * Periode TIDAK diketik bebas -- dua dropdown (Tahun, Triwulan) menyusun format
 * kanonik `{tahun}-Q{1-4}` yang divalidasi backend (@Matches(PERIODE_REGEX)),
 * pola sama BuilderToolbar.jsx milik Admin OPD.
 *
 * `opdId` HANYA dapat dipilih saat membuat: CreateSurveyDto menerimanya
 * (wajib bagi kabupaten, lihat SurveysService.resolveOpdId) sedangkan
 * UpdateSurveyDto TIDAK punya field itu sama sekali -- survei tak bisa
 * dipindah OPD setelah dibuat, jadi saat mode ubah nama OPD ditampilkan
 * read-only, bukan dropdown yang perubahannya akan diam-diam terbuang.
 *
 * TAK punya prop `isOpen`: pemanggil me-render komponen ini HANYA saat modal
 * perlu tampil, sehingga isian selalu dimulai dari `initialValues` yang segar
 * lewat inisialisasi useState (bukan disetel ulang dari dalam useEffect --
 * pola itu memicu cascading render, lihat aturan react-hooks/set-state-in-effect).
 */
export default function SurveyFormModal({
  mode = 'create',
  initialValues = null,
  opdOptions = [],
  opdName = '',
  isSubmitting = false,
  submitError = null,
  onSubmit,
  onCancel,
}) {
  const isEdit = mode === 'edit';
  const initialPeriode = parsePeriode(initialValues?.period) ?? {
    tahun: CURRENT_YEAR,
    triwulan: Math.floor(new Date().getMonth() / 3) + 1, // triwulan berjalan
  };

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [opdId, setOpdId] = useState(initialValues?.opdId != null ? String(initialValues.opdId) : '');
  const [tahun, setTahun] = useState(initialPeriode.tahun);
  const [triwulan, setTriwulan] = useState(initialPeriode.triwulan);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSubmitting, onCancel]);

  // Kunci scroll halaman di belakang modal -- tanpa ini roda mouse di atas
  // latar ikut menggeser daftar survei di belakangnya. Nilai lama dipulihkan
  // saat modal ditutup (komponen ini hanya di-mount selagi modal terbuka).
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Survei lama bisa bertahun di luar rentang wajar (mis. data seed) -- sisipkan
  // supaya dropdown tak jatuh ke opsi yang salah karena tak ketemu match.
  const yearOptions = (YEAR_OPTIONS.includes(tahun) ? YEAR_OPTIONS : [tahun, ...YEAR_OPTIONS].sort((a, b) => a - b)).map(
    (year) => ({ value: year, label: String(year) }),
  );

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Judul survei wajib diisi.');
      return;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setValidationError(`Judul survei maksimal ${MAX_TITLE_LENGTH} karakter.`);
      return;
    }
    if (!isEdit && !opdId) {
      setValidationError('OPD penyelenggara wajib dipilih.');
      return;
    }

    setValidationError(null);
    onSubmit({
      title: trimmedTitle,
      period: buildPeriode(tahun, triwulan),
      ...(isEdit ? {} : { opdId: Number(opdId) }),
    });
  };

  const error = validationError ?? submitError;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onCancel?.()}
    >
      {/* Tinggi kartu SENGAJA tetap (`h-[820px]`, dipangkas `max-h-[90vh]` di
          layar pendek), BUKAN mengikuti tinggi konten. Alasannya: daftar
          pilihan Dropdown.jsx mengapung `absolute`, jadi ia butuh ruang kosong
          di bawah field agar tetap terkurung di dalam kartu -- dan dengan
          tinggi tetap, membuka/menutup dropdown tak mengubah ukuran kartu
          maupun kolom Triwulan/Tahun sama sekali. Header & footer `shrink-0`
          sehingga tombol "Buat Survei" selalu di tempatnya. */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[520px] h-[820px] max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 relative shrink-0">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <X size={18} />
          </button>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isEdit ? 'Ubah Survei' : 'Survei Baru'}
          </p>
          <h3 className="font-bold text-slate-800 text-lg leading-tight mt-1">
            {isEdit ? 'Perbarui Detail Survei' : 'Buat Paket Survei'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {isEdit
              ? 'Judul dan periode hanya dapat diubah selama survei masih berstatus draf.'
              : 'Survei dibuat sebagai draf, lalu builder pertanyaan langsung terbuka.'}
          </p>
        </div>

        {/* TANPA `overflow-y-auto`: badan ini justru harus membiarkan daftar
            dropdown mengapung melewati batasnya (ke ruang kosong di bawah).
            Isinya cuma 3 field dengan tinggi tetap, jadi tak akan meluap. */}
        <div className="px-6 py-5 space-y-4 flex-1 min-h-0">
          <Input
            id="survey-title"
            label="Judul Survei"
            placeholder="mis. Survei Kepuasan Layanan Perizinan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            disabled={isSubmitting}
          />

          {isEdit ? (
            <div className="space-y-xs">
              <span className="block text-sm font-bold text-text-primary">OPD Penyelenggara</span>
              <div className="flex items-center gap-2 min-h-[44px] px-md rounded-lg bg-surface-container-low border border-outline-variant text-body-md text-text-secondary">
                <Building2 size={16} />
                <span className="truncate">{opdName || 'OPD tidak diketahui'}</span>
              </div>
              <p className="text-xs text-slate-500">
                OPD penyelenggara tidak dapat dipindah setelah survei dibuat.
              </p>
            </div>
          ) : (
            <Dropdown
              id="survey-opd"
              label="OPD Penyelenggara"
              options={opdOptions}
              value={opdId}
              onChange={setOpdId}
              menuMaxHeight={MENU_MAX_HEIGHT_OPD}
            />
          )}

          {/* `items-start`: tinggi kedua kolom ditentukan tombolnya saja, tak
              ikut memanjang saat daftar pilihan (yang mengapung) terbuka. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <Dropdown
              id="survey-triwulan"
              label="Triwulan"
              options={QUARTER_OPTIONS}
              value={triwulan}
              onChange={setTriwulan}
              menuMaxHeight={MENU_MAX_HEIGHT_PERIODE}
            />
            <Dropdown
              id="survey-tahun"
              label="Tahun"
              options={yearOptions}
              value={tahun}
              onChange={setTahun}
              menuMaxHeight={MENU_MAX_HEIGHT_PERIODE}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Survei'}
          </button>
        </div>
      </div>
    </div>
  );
}
