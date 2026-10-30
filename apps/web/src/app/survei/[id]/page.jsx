'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import SurveyProgress from '@/features/surveys/components/SurveyProgress';
import GerbangPengisianBersesi from '@/features/surveys/components/GerbangPengisianBersesi';
import QuestionCard from '@/features/surveys/components/QuestionCard';
import SurveyNavigation from '@/features/surveys/components/SurveyNavigation';
import SurveyCompletion from '@/features/surveys/components/SurveyCompletion';
import GerbangPengisianPublik from '@/features/surveys/components/GerbangPengisianPublik';
import useSurveyStore from '@/features/surveys/store/useSurveyStore';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { isAuthenticated } from '@/features/authentication/services/authStorage';
import { usePetikanPerambanSekali } from '@/features/authentication/hooks/useSesiAktif';
import { sudahMengisiDiPeramban } from '@/utils/surveyFillMarker';
import { getPublicSurveyFill, getSurveyFill } from '@/features/surveys/services/surveys.api';

/**
 * Pengisian survei lewat tautan/QR — melayani DUA keadaan dengan satu tautan.
 *
 * - Ada sesi     -> endpoint berpenjaga; jawaban tercatat atas nama pengguna dan
 *                   anti-duplikat `dedupeUserId` tetap berlaku seperti sekarang.
 * - Tak ada sesi -> endpoint publik; jawaban tercatat `userId: null`.
 *
 * Rute ini SENGAJA berada di luar `config.matcher` milik proxy.js (yang hanya
 * mencantumkan '/', '/pilih-peran', '/persetujuan', '/admin-kab/*',
 * '/admin-opd/*', '/dashboard', '/complaints', '/surveys', '/profile'). Karena
 * '/survei/*' tak termasuk, proxy tidak berjalan di sini dan pengunjung tanpa
 * sesi tidak dipantulkan ke '/', tanpa satu pun perubahan pada proxy.js.
 * JANGAN menambahkan '/survei' ke matcher: itu justru mengembalikan pantulan
 * yang rute ini ada untuk menghindarinya.
 *
 * ALAMATNYA `/survei/:id` sejak 8 September 2026, sebelumnya `/isi/:id`.
 * Alamat lama masih hidup sebagai pengalihan permanen (308) di
 * app/isi/[id]/page.jsx, sebab QR yang tercetak dan tersebar sejak 4 September
 * 2026 menunjuk ke sana. Peringatan matcher di atas berlaku bagi KEDUANYA.
 *
 * Ada-tidaknya sesi ditentukan SEKALI saat render pertama lalu dibawa ke store,
 * bukan diperiksa ulang saat mengirim: sesi yang kedaluwarsa di tengah
 * pengisian tak boleh membuat jawaban berpindah jalur tanpa sebab yang jelas.
 * `isAuthenticated()` sudah menjaga SSR sendiri (mengembalikan false di server).
 */
export default function IsiSurveiPage() {
  const { id } = useParams();
  const { isCompleted, initSurvey, resetSurvey } = useSurveyStore();

  // Dihitung lewat inisialisasi useState, BUKAN di dalam useEffect: menyetel
  // state dari dalam effect memicu render berjenjang dan dilanggar aturan
  // react-hooks/set-state-in-effect (catatan sama di ShareSurveyModal.jsx).
  const [adaSesi] = useState(() => isAuthenticated());

  // Penanda peramban TIDAK boleh dibaca lewat inisialisasi useState seperti
  // `adaSesi` di atas. Keduanya sama-sama hanya terbaca di peramban, tetapi
  // akibatnya berbeda: `adaSesi` baru berpengaruh setelah kuesioner termuat,
  // sedangkan penanda ini memotong halaman lebih awal (lihat `return` layar
  // "Anda Sudah Mengisi Survei Ini" di bawah). Server selalu merender pemintal,
  // klien langsung merender layar terima kasih, dan React melaporkan hydration
  // failed. Petikan server hook ini `false`, lalu nilai sebenarnya dibaca sekali
  // sesudah hidrasi dan dibekukan -- sama awetnya dengan cara lama.
  const ditandaiPeramban = usePetikanPerambanSekali(() =>
    isAuthenticated() ? false : sudahMengisiDiPeramban(id),
  );

  /**
   * Persetujuan PDP & data diri dari gerbang (8 September 2026). `null` =
   * gerbangnya belum dilewati.
   *
   * Hanya berlaku TANPA sesi. Pengguna bersesi persetujuannya sudah tercatat di
   * `users.consentAt` dan ditegakkan `assertConsented` pada jalur berpenjaga,
   * jadi memintanya lagi di sini hanya gerbang ganda tanpa tambahan jaminan.
   */
  const [dataPublik, setDataPublik] = useState(null);

  /**
   * Pilihan anonim dari gerbang bagi pengguna BERSESI (8 September 2026, atas
   * permintaan pengguna: "sebelum pengguna mengisi survei muncul tampilan opsi
   * anonim"). `null` = gerbangnya belum dilewati.
   *
   * Terpisah dari `dataPublik` karena isinya berbeda jenis: yang ini satu
   * pilihan, sedangkan `dataPublik` memuat data yang diketik pengisi. Kedua
   * gerbang tak pernah muncul bersamaan, sebab yang menentukan mana yang
   * dipakai adalah ada-tidaknya sesi.
   */
  const [pilihanBersesi, setPilihanBersesi] = useState(null);
  const perluGerbang = adaSesi ? pilihanBersesi === null : !dataPublik;

  // Penanda peramban diperiksa DI DALAM fetcher, sebelum satu permintaan pun
  // dikirim: memuat kuesioner yang pasti ditolak di antarmuka hanya memboroskan
  // permintaan dan sempat memperlihatkan formulir yang lalu hilang.
  //
  // Bukan `useAsync(null)`: hook itu memanggil `asyncFn()` tanpa syarat saat
  // mount (useAsync.js), jadi nilai selain fungsi akan melempar. Hook itu
  // dipakai puluhan tempat — jangan diubah untuk rute ini.
  const fetchFill = useCallback(() => {
    if (ditandaiPeramban) return Promise.resolve(null);
    return adaSesi ? getSurveyFill(id) : getPublicSurveyFill(id);
  }, [adaSesi, ditandaiPeramban, id]);
  // `refetch` tak lagi diambil sejak tombol "Coba Lagi" dihapus dari layar
  // galat di bawah (11 September 2026).
  const { data: fillData, isLoading, error } = useAsync(fetchFill);

  useEffect(() => {
    if (fillData && !fillData.sudahMengisi && !perluGerbang) {
      // `nomorHp` TAK LAGI DITERUSKAN dari sini (1 Oktober 2026, petang):
      // seluruh data diri jalur BERSESI disalin backend dari akun. Pilihan
      // anonimnya tetap diteruskan. Jalur PUBLIK tak berubah sama sekali --
      // pengunjung tanpa sesi tetap mengetik data dirinya di
      // GerbangPengisianPublik, yang masuk lewat `dataPublik`.
      initSurvey(fillData, {
        anonim: !adaSesi,
        dataPublik,
        tanpaDataDiri: pilihanBersesi?.anonim === true,
      });
    }
    return () => {
      resetSurvey();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillData, perluGerbang]);

  // Layout: background biru gelap penuh, card terpusat (seperti Sukma-e).
  // Layar galat & loading ikut memakai latar yang sama supaya transisi tidak
  // mengubah warna halaman secara kasar.
  const bgLatar = 'min-h-screen bg-[#0d2240] flex flex-col items-center justify-center px-4 py-6';

  if (ditandaiPeramban || fillData?.sudahMengisi) {
    return (
      <main className={bgLatar}>
        <div className="w-full max-w-[440px] px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100/90 overflow-hidden">
            {/* Header kartu: logo SKEMA Madiun */}
            <div className="border-b border-slate-100 px-5 sm:px-6 py-4 flex items-center">
              <Link href="/" className="inline-flex items-center gap-2.5 group shrink-0">
                <div className="transition-transform duration-300 group-hover:scale-105 flex items-center">
                  <Image
                    src="/images/navbar/skema-logo-2.png"
                    alt="Logo SKEMA"
                    width={76}
                    height={48}
                    className="object-contain h-7 w-auto"
                    priority
                  />
                </div>
                <span className="text-sm font-bold text-primary tracking-tight">
                  SKEMA Madiun
                </span>
              </Link>
            </div>

            <div className="p-6 sm:p-8 flex flex-col items-center gap-0">
              {/* Ikon Sukses dengan Animasi */}
              <div className="relative mb-5 group inline-flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-400/25 rounded-full animate-ping pointer-events-none" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-100 ring-4 ring-emerald-50 transition-all duration-500 ease-out group-hover:scale-105 animate-in zoom-in-50 duration-500">
                  <CheckCircle2 size={36} strokeWidth={2.5} className="sm:w-10 sm:h-10" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 text-center">
                Anda Sudah Mengisi Survei Ini
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-6 text-center px-2">
                Terima kasih atas partisipasi Anda. Survei ini hanya menerima satu jawaban dari perangkat ini.
              </p>

              <Link
                href="/"
                className="w-full inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover shadow-sm transition-all active:scale-95"
              >
                Kembali ke Layanan
              </Link>
            </div>
          </div>
          <p className="mt-3.5 text-center text-white/50 text-[11px] font-medium tracking-wide">
            © {new Date().getFullYear()} · SKEMA Madiun · Pemerintah Kabupaten Madiun
          </p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={bgLatar}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[28rem] p-8">
          <LoadingState label="Memuat survei..." />
        </div>
      </main>
    );
  }

  /**
   * LAYAR GALAT, ditulis ulang 11 September 2026 atas permintaan pengguna.
   */
  if (error) {
    return (
      <main className={bgLatar}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[28rem] p-8 text-center">
          <ErrorState
            title="Survei tidak dapat ditemukan"
            description={null}
            action={
              <Link
                href="/"
                className="inline-block px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors"
              >
                Kembali ke Layanan
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  /**
   * Gerbang sebelum kuesioner, SESUDAH penjaga "sudah mengisi", "memuat", dan
   * "galat".
   */
  if (perluGerbang) {
    return (
      <main className={bgLatar}>
        <div className="w-full max-w-[620px]">
          {adaSesi ? (
            <GerbangPengisianBersesi onMulai={setPilihanBersesi} />
          ) : (
            <GerbangPengisianPublik onSetuju={setDataPublik} />
          )}
          {/* Footer copyright */}
          <p className="mt-3.5 text-center text-white/50 text-[11px] font-medium tracking-wide">
            © {new Date().getFullYear()} · SKEMA Madiun · Pemerintah Kabupaten Madiun
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={bgLatar}>
      <div className="w-full max-w-[500px]">
        {isCompleted ? (
          <SurveyCompletion tampilkanTautanWarga={adaSesi} />
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100/80 overflow-hidden">
            {/* Header: logo SKEMA Madiun */}
            <div className="border-b border-slate-100 px-5 pt-4 pb-3 flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2.5 group shrink-0">
                <div className="transition-transform duration-300 group-hover:scale-105 flex items-center">
                  <Image
                    src="/images/navbar/skema-logo-2.png"
                    alt="Logo SKEMA"
                    width={76}
                    height={48}
                    className="object-contain h-7 w-auto"
                    priority
                  />
                </div>
                <span className="text-sm font-bold text-primary tracking-tight">
                  SKEMA Madiun
                </span>
              </Link>
            </div>

            {/* Progres ringkas */}
            <div className="px-5 pt-3 pb-1 border-b border-slate-50">
              <SurveyProgress />
            </div>

            {/* Pertanyaan dan tombol navigasi */}
            <div className="px-5 pt-3 pb-4">
              <QuestionCard />
              <SurveyNavigation />
            </div>
          </div>
        )}

        {/* Footer copyright */}
        <p className="mt-3.5 text-center text-white/50 text-[11px] font-medium tracking-wide">
          © {new Date().getFullYear()} · SKEMA Madiun · Pemerintah Kabupaten Madiun
        </p>
      </div>
    </main>
  );
}
