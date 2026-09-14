'use client';

import React, { useEffect, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
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
/**
 * Jatah daftar OPD saat medan cari menyala (11 September 2026).
 *
 * Kepala pencarian menempati ~61px DI ATAS daftar (medan 44px + jarak 8px atas
 * bawah + garis). Tanpa pemendekan ini panel totalnya menjadi ~261px, yakni
 * melewati batas 200px yang justru dihitung supaya daftar tak menimpa tombol
 * "Batal"/"Buat Survei" di footer. 140 + 61 = 201, jadi tinggi panelnya praktis
 * sama seperti sebelum ada pencarian.
 */
const MENU_MAX_HEIGHT_OPD_DENGAN_CARI = 'max-h-[140px]';
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
  const [izinkanAnonim, setIzinkanAnonim] = useState(initialValues?.izinkanAnonim ?? false);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSubmitting, onCancel]);

  // Kunci scroll halaman di belakang modal -- tanpa ini roda mouse di atas
  // latar ikut menggeser daftar survei di belakangnya. Komponen ini hanya
  // di-mount selagi modal terbuka. Pola inline lama dipindah ke
  // hooks/useBodyScrollLock.js (2026-08-24).
  useBodyScrollLock();

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
      izinkanAnonim,
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
          sehingga tombol "Buat Survei" selalu di tempatnya.

          TOMBOL "BATAL" BERTABRAKAN DENGAN ISIAN (1 September 2026, laporan
          pengguna). Sebabnya bukan tata letak footer, melainkan kartu yang
          KEHABISAN TINGGI: badan modal sengaja tanpa `overflow-y-auto` (lihat
          catatannya di bawah -- daftar dropdown harus boleh mengapung
          melewatinya), jadi begitu isinya lebih tinggi daripada ruang yang
          tersisa, isian terakhir MELUAP ke atas footer, bukan tergulir.
          Terukur pada 320x568: yang tersedia 511px (`max-h-[90vh]`) sementara
          isinya menuntut ~612px -- 100px meluap tepat ke tombol Batal.

          Yang bikin isinya jadi setinggi itu di ponsel bukan satu hal besar,
          tapi tiga hal kecil yang menumpuk: Triwulan & Tahun jatuh menjadi
          DUA baris (`grid-cols-1` di bawah sm) yang menambah ~80px, semua
          bantalan memakai ukuran desktop, dan `max-h-[90vh]` menyisakan 25px
          layar yang justru sudah dipakai `p-4` milik latar. Ketiganya
          dirapikan: kolom Triwulan/Tahun tetap berdampingan di lebar apa pun,
          bantalan mengecil khusus ponsel, dan batas tinggi memakai
          `max-h-full` yang berarti "seluruh ruang di dalam p-4 itu".
          Sesudahnya isinya ~510px pada ruang 536px -- tak ada lagi luapan,
          sehingga tak ada lagi yang menabrak footer. */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[520px] h-[820px] max-h-full sm:max-h-[90vh] flex flex-col">
        <div className="px-6 pt-5 pb-3 sm:pt-6 sm:pb-4 border-b border-slate-100 relative shrink-0">
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
        <div className="px-6 py-4 sm:py-5 space-y-3 sm:space-y-4 flex-1 min-h-0">
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
              // Daftar TERPANJANG di halaman ini: seluruh OPD aktif, bukan yang
              // diderivasi dari survei yang sudah ada seperti pada penyaring.
              searchable={opdOptions.length > 1}
              searchPlaceholder="Cari nama OPD..."
              emptySearchLabel="Tidak ada OPD yang cocok"
              menuMaxHeight={
                opdOptions.length > 1 ? MENU_MAX_HEIGHT_OPD_DENGAN_CARI : MENU_MAX_HEIGHT_OPD
              }
            />
          )}

          {/* `items-start`: tinggi kedua kolom ditentukan tombolnya saja, tak
              ikut memanjang saat daftar pilihan (yang mengapung) terbuka.

              `grid-cols-2` di SEMUA lebar, bukan `grid-cols-1 sm:grid-cols-2`.
              Menumpuknya di ponsel menambah satu baris penuh (~80px) pada
              modal yang justru sedang kehabisan tinggi, dan isinya memang
              tak butuh ruang selebar itu: keduanya cuma "Triwulan III" dan
              "2026". Pada 320px tiap kolom masih 112px, sementara label
              terpanjang menuntut ~66px. */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
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

          {/* Kotak centang dibungkus labelnya sendiri (pola sama ConsentGate.jsx):
              kotaknya 20px, tapi bidang sentuhnya seluruh label -- itulah yang
              memenuhi target 44px. */}
          <label
            htmlFor="survey-izinkan-anonim"
            className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-container-low/60 cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/20"
          >
            <input
              id="survey-izinkan-anonim"
              type="checkbox"
              checked={izinkanAnonim}
              onChange={(e) => setIzinkanAnonim(e.target.checked)}
              aria-describedby="survey-izinkan-anonim-bantuan"
              className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
            />
            <span className="text-sm text-text-primary leading-relaxed">
              Izinkan pengisian <strong className="font-semibold">tanpa login</strong> (tautan/QR
              publik)
            </span>
          </label>
          {/* Keterangan ini WAJIB ada: admin yang menyalakan saklar berhak tahu
              bahwa integritas hitungannya bertumpu pada kejujuran responden,
              bukan pada penegakan sistem. */}
          <p id="survey-izinkan-anonim-bantuan" className="text-xs text-text-secondary px-1">
            Cocok untuk QR di loket layanan. Pengisian berulang hanya dicegah lewat penanda di
            peramban responden, bukan ditegakkan sistem.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-4 pt-3 sm:pb-6 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0 border-t border-slate-100">
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
