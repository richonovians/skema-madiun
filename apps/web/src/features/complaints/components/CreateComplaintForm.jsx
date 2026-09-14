'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Textarea from '@/components/ui/Textarea';
import FileDropzone from '@/components/ui/FileDropzone';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { getOpdList } from '@/features/opd/services/opd.api';
import { useSesiAktif } from '@/features/authentication/hooks/useSesiAktif';
import ConsentRequiredAction, {
  KODE_PERSETUJUAN_DIBUTUHKAN,
} from '@/features/authentication/components/ConsentRequiredAction';
import { kodeGalat } from '@/services/api';
import {
  ambilDrafPengaduan,
  hapusDrafPengaduan,
  simpanDrafPengaduan,
} from '@/utils/drafPengaduan';
import { getComplaintCategories } from '../services/reference.api';
import { createComplaint } from '../services/complaints.api';

export default function CreateComplaintForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Kode galatnya disimpan terpisah dari pesannya supaya layar dapat menawarkan
  // jalan keluar yang tepat tanpa mencocokkan bunyi pesan -- yang akan berhenti
  // bekerja pada penyuntingan teks berikutnya tanpa ada uji yang memerah.
  const [submitErrorCode, setSubmitErrorCode] = useState(null);
  const [files, setFiles] = useState([]);

  // Beranda dirender di server, yang tak dapat melihat localStorage. Sesi
  // karenanya dibaca lewat useSesiAktif, bukan inisialisasi useState: yang
  // terakhir menghasilkan render pertama berbeda dari HTML server bagi pengguna
  // yang sudah masuk. Alasan lengkapnya di hooks/useSesiAktif.js.
  const adaSesi = useSesiAktif();

  const [formData, setFormData] = useState({
    department: '',
    category: '',
    title: '',
    description: '',
    isAnonim: false,
  });

  // Draf yang tertahan karena persetujuan PDP belum diberikan (14 September
  // 2026). Dibaca di EFEK, bukan saat inisialisasi state: halaman ini dirender
  // di server, yang tak dapat melihat sessionStorage -- alasan yang sama
  // dengan useSesiAktif di atas.
  //
  // Dibuang begitu dipulihkan. Draf yang bertahan sesudah dituangkan akan
  // muncul lagi pada pengaduan BERIKUTNYA, mengisi formulir kosong dengan
  // kalimat yang sudah lama terkirim.
  const [drafDipulihkan, setDrafDipulihkan] = useState(false);
  useEffect(() => {
    const draf = ambilDrafPengaduan();
    if (!draf) return;
    /* eslint-disable react-hooks/set-state-in-effect --
       `set-state-in-effect` menyarankan menurunkan nilainya saat render, dan
       itu memang benar untuk keadaan yang dapat DIHITUNG dari props/state.
       Di sini sumbernya `sessionStorage`, yang tak terlihat oleh render di
       server: membacanya saat render menghasilkan render pertama klien yang
       berbeda dari HTML server. Pembacaannya pun sekali dan berefek samping
       (drafnya dibuang di baris terakhir), sehingga `useSyncExternalStore`
       pun tak cocok -- getSnapshot-nya wajib murni.

       Pola yang sama dipakai `useSesiAktif` dengan alasan yang sama. */
    setFormData((prev) => ({ ...prev, ...draf }));
    setDrafDipulihkan(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    hapusDrafPengaduan();
  }, []);

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

  /**
   * Penampung kedua dropdown membedakan keadaan sesi (8 September 2026), dan
   * bedanya bukan kosmetik: `GET /opd` maupun `GET /ref/complaint-categories`
   * menjawab 401 tanpa sesi (terukur), jadi pengunjung yang belum masuk SELALU
   * melihat kedua daftar kosong. Menyuruhnya "pilih instansi" berarti menyuruh
   * melakukan hal yang tak mungkin dilakukan.
   *
   * Formulir ini dirender di DUA tempat: '/complaints/new', yang selalu
   * bersesi karena ada di dalam `config.matcher` milik proxy.js, dan beranda
   * '/', yang boleh dibuka siapa saja. Cabang tanpa sesi di berkas ini hanya
   * pernah terlihat di beranda.
   */
  const penampungOpd = adaSesi ? 'Pilih Instansi' : 'Masuk untuk melihat daftar instansi';
  // "kategori" saja, tanpa "pengaduan": diukur di peramban, kalimat penuhnya
  // terpotong menjadi "...kategori pen..." karena dropdown ini hanya selebar
  // separuh baris. Kata yang dibuang sudah dikatakan label di atasnya
  // ("Kategori Pengaduan") dan himbauan di atas formulir.
  const penampungKategori = adaSesi ? 'Pilih Kategori' : 'Masuk untuk melihat kategori';

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
    setSubmitErrorCode(null);
    // Ditahan SEBELUM permintaan dikirim. Tanpa sesi, `POST /complaints`
    // menjawab 401 dan pengirim hanya melihat pesan galat teknis, padahal
    // sebabnya sederhana dan dapat ia perbaiki sendiri.
    if (!adaSesi) {
      setSubmitError('Masuk terlebih dahulu untuk mengirim laporan pengaduan.');
      return;
    }
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
      // Sudah terkirim: draf sisa apa pun kehilangan gunanya, dan membiarkannya
      // berarti pengaduan berikutnya dibuka dengan kalimat yang sudah dikirim.
      hapusDrafPengaduan();
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
      const kode = kodeGalat(err);
      setSubmitError(err.message || 'Gagal mengirim pengaduan. Silakan coba lagi.');
      setSubmitErrorCode(kode);
      // HANYA pada penolakan persetujuan, bukan pada galat apa pun: menyimpan
      // karena jaringan sempat putus berarti isi pengaduan warga menetap di
      // peramban demi masalah yang tak pernah menuntutnya pergi ke mana-mana.
      if (kode === KODE_PERSETUJUAN_DIBUTUHKAN) {
        simpanDrafPengaduan(formData);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-5 sm:p-8 shadow-xl border border-border">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
        <div className="w-1 h-10 bg-primary-container rounded-full"></div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Sampaikan Keluhan & Pengaduan Anda</h1>
      </div>

      {/* Himbauan masuk, atas permintaan pengguna 8 September 2026. Diletakkan
          di ATAS formulir, bukan di bawah dropdown yang bersangkutan: yang
          terhalang bukan satu medan melainkan seluruh pengiriman, sebab
          `POST /complaints` juga menjawab 401 tanpa sesi (terukur).

          TANPA tautan "Masuk", dengan alasan yang sama seperti penghapusan
          tautan serupa di SurveyForm.jsx pada hari yang sama: cabang ini hanya
          pernah terlihat di beranda, dan tombol masuknya sudah ada di navbar
          halaman yang sedang dibaca. Tautan yang menuju halaman itu sendiri
          hanya pengulangan. */}
      {!adaSesi && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl border border-border bg-surface-container-low/60">
          <LogIn size={18} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary">Masuk terlebih dahulu</span> untuk
            melihat daftar instansi dan kategori pengaduan, lalu mengirim laporan Anda.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Kehilangan yang DIBERITAHUKAN. Lampiran memang tak ikut
            terselamatkan -- objek File tak dapat disimpan di sessionStorage,
            dan memindahkannya ke IndexedDB berarti menaruh berkas milik warga
            di disk peramban. Membiarkan pelapor menekan Kirim tanpa tahu itu
            berarti pengaduannya terkirim tanpa bukti yang ia kira masih
            terpasang. */}
        {drafDipulihkan && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            Isian Anda sebelumnya dipulihkan. Berkas lampiran{' '}
            <span className="font-semibold">perlu dipilih ulang</span> karena tidak ikut tersimpan.
          </div>
        )}

        {submitError && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
            {submitError}
            {/* Jalan keluarnya, bukan sekadar keterangan bahwa ada jalan
                keluar. Sebelumnya pesannya sendiri yang menyuruh "Buka halaman
                Persetujuan terlebih dahulu" -- menyebut tujuan tanpa memberi
                jalan ke sana, tepat saat pengirimannya baru saja gagal. */}
            {submitErrorCode === KODE_PERSETUJUAN_DIBUTUHKAN && (
              <div className="mt-3">
                <ConsentRequiredAction />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Dropdown
            label="OPD / Instansi Tujuan"
            id="department"
            options={[
              { label: penampungOpd, value: '' },
              // "Lainnya (belum tahu tujuannya)" — bentuk gabungan, dan itu
              // kompromi yang disadari (8 September 2026). Kata "Lainnya" saja
              // diminta pengguna, tapi dropdown Kategori di sebelahnya SUDAH
              // punya pilihan bernama "Lainnya" (reference.constants.ts): dua
              // "Lainnya" berbeda arti pada satu formulir adalah sumber
              // kesalahan pengisian. Keterangan dalam kurung menghapus
              // ambiguitasnya tanpa membuang kata yang diminta.
              //
              // DISEMBUNYIKAN tanpa sesi atas permintaan pengguna (8 September
              // 2026), dan alasannya bukan sekadar tampilan: tanpa sesi ia satu-
              // satunya pilihan yang tersisa, sehingga dropdown yang seharusnya
              // memilih instansi berubah menjadi dropdown berisi satu jalan
              // pintas. Pengunjung akan memilihnya bukan karena tujuannya
              // memang belum diketahui, melainkan karena tak ada pilihan lain.
              ...(adaSesi
                ? [{ label: 'Lainnya (belum tahu tujuannya)', value: TANPA_TUJUAN }]
                : []),
              ...departmentOptions,
            ]}
            value={formData.department}
            onChange={(val) => setFormData((prev) => ({ ...prev, department: val }))}
            /* Medan cari, atas permintaan pengguna 11 September 2026. Daftar
               OPD berisi 62 instansi aktif (terukur), sementara panel dropdown
               hanya setinggi 240px.

               DUA syarat, bukan satu. `adaSesi` karena `GET /opd` menjawab 401
               tanpa sesi, dan `length > 0` karena daftar yang masih dimuat atau
               gagal dimuat juga tak punya apa pun untuk dicari. Medan cari di
               atas daftar kosong menjanjikan sesuatu yang tak dapat ditepati. */
            searchable={adaSesi && departmentOptions.length > 0}
            searchPlaceholder="Cari nama instansi..."
            emptySearchLabel="Tidak ada instansi yang cocok"
          />
          <Dropdown
            label="Kategori Pengaduan"
            id="category"
            options={[{ label: penampungKategori, value: '' }, ...categoryOptions]}
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
