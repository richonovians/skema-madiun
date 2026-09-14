'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
import EmptyState from '@/components/ui/EmptyState';
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

  const wadah = 'max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6';

  if (ditandaiPeramban || fillData?.sudahMengisi) {
    return (
      <main className={wadah}>
        <EmptyState
          icon={<CheckCircle2 size={64} />}
          title="Anda Sudah Mengisi Survei Ini"
          description="Terima kasih atas partisipasi Anda. Survei ini hanya menerima satu jawaban dari perangkat ini."
          action={
            <Link href="/">
              <button className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors">
                Kembali ke Beranda
              </button>
            </Link>
          }
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={wadah}>
        <LoadingState label="Memuat survei..." />
      </main>
    );
  }

  /**
   * LAYAR GALAT, ditulis ulang 11 September 2026 atas permintaan pengguna.
   *
   * Kalimat dari backend TIDAK lagi ditampilkan. Bunyinya "Survei anonim dengan
   * id 28 tidak ditemukan": ia menyebut id internal dan istilah "survei anonim"
   * yang hanya dikenal di dalam kode, sehingga tak memberi pembacanya satu pun
   * langkah yang dapat ia ambil.
   *
   * Tombol "Coba Lagi" ikut dihapus. Hampir seluruh galat di sini berarti
   * surveinya tidak ada atau tidak mengizinkan pengisian tanpa sesi, dan
   * keduanya tak berubah pada percobaan kedua.
   *
   * Tautan beranda menggantikannya, dan itu bukan tambahan kosmetik: rute ini
   * berada di luar `config.matcher` proxy.js dan halamannya tak memuat navbar
   * sama sekali, jadi layar tanpa satu pun tautan benar-benar menjadi jalan
   * buntu bagi pengunjung yang datang dari QR. Polanya sama persis dengan layar
   * "Anda Sudah Mengisi Survei Ini" di atas -- kecuali satu hal: tautannya di
   * sini TIDAK membungkus `<button>`. Tampilannya sama persis (kelas yang sama),
   * tetapi tombol di dalam tautan adalah dua kontrol bersarang, yang dibaca
   * ganda oleh pembaca layar dan tak sah menurut HTML.
   */
  if (error) {
    return (
      <main className={wadah}>
        <ErrorState
          title="Survei tidak dapat ditemukan"
          description={null}
          action={
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors"
            >
              Kembali ke Beranda
            </Link>
          }
        />
      </main>
    );
  }

  /**
   * Gerbang sebelum kuesioner, SESUDAH penjaga "sudah mengisi", "memuat", dan
   * "galat". Urutannya penting: pengunjung yang penandanya sudah ada atau yang
   * surveinya tak dapat diisi tidak boleh dimintai persetujuan maupun pilihan
   * untuk sesuatu yang tak akan pernah ia kirim.
   *
   * DUA gerbang, satu rute, dan pilihannya ditentukan ada-tidaknya sesi. Tanpa
   * sesi: persetujuan PDP beserta data diri yang diketik sendiri. Bersesi:
   * cukup pilihan anonim, sebab persetujuannya sudah tercatat di
   * `users.consentAt` dan data dirinya disalin backend dari akun.
   */
  if (perluGerbang) {
    return (
      <main className={wadah}>
        {adaSesi ? (
          <GerbangPengisianBersesi onMulai={setPilihanBersesi} />
        ) : (
          <GerbangPengisianPublik onSetuju={setDataPublik} />
        )}
      </main>
    );
  }

  return (
    <main className={`${wadah} min-h-[calc(100vh-64px)] relative`}>
      {isCompleted ? (
        // Tautan "Daftar Survei"/"Dashboard" pada tampilan selesai menuju rute
        // khusus `responden`; pengunjung tanpa sesi akan dipantulkan proxy ke
        // '/'. Karena itu bagi mereka keduanya diganti satu tautan beranda —
        // jalan buntu adalah cacat, bukan detail kosmetik.
        <SurveyCompletion tampilkanTautanWarga={adaSesi} />
      ) : (
        <div className="w-full max-w-[800px] mx-auto">
          <SurveyProgress />

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-5 sm:p-8 md:p-10 border border-outline-variant/20">
            <QuestionCard />

            {/* Captcha tidak di sini, melainkan di dalam ModalKirimSurvei yang
                dibuka SurveyNavigation pada pertanyaan terakhir jalur tanpa
                akun. Token Turnstile berumur sekitar lima menit; diminta sejak
                pertanyaan pertama, ia sudah basi saat tombol kirim ditekan. */}
            <SurveyNavigation />
          </div>
        </div>
      )}
    </main>
  );
}
