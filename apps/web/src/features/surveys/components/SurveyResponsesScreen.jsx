'use client';

import React, { useCallback, useState } from 'react';
import SurveyResponsesHeader from './SurveyResponsesHeader';
import SurveyResponsesSummary from './SurveyResponsesSummary';
import SurveyResponsesTable from './SurveyResponsesTable';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveyById, getQuestions, getSurveyResponses } from '@/features/surveys/services/surveys.api';
import { adaptSurveyResponseList } from '@/features/surveys/adapters/survey.adapter';

/**
 * Daftar respons satu survei -- dipakai DUA rute: /admin-opd/surveys/[id]/responses
 * dan /admin-kab/surveys/[id]/responses. Pola sama dengan SurveyBuilderScreen
 * (satu implementasi, dua rute) supaya Admin Kabupaten tak perlu berpindah ke
 * area peran lain hanya untuk membaca respons. Backend memang mengizinkan:
 * `GET /surveys/:id/responses` ber-@Roles(kabupaten, opd) dan assertOpdAccess
 * selalu meloloskan kabupaten.
 *
 * `basePath` = akar area ('/admin-opd/surveys' | '/admin-kab/surveys'); dari situ
 * seluruh tautan diturunkan, jadi tak ada '/admin-opd' yang tertanam keras.
 *
 * `className` diserahkan pemanggil karena padding kedua area BEDA: <main>
 * admin-opd sudah ber-`p-4 md:p-lg`, sedangkan <main> admin-kab tidak punya
 * padding horizontal sama sekali (lihat AdminLayout.jsx vs AdminKabLayout.jsx).
 *
 * PAGINASI SUNGGUHAN sejak 4 Oktober 2026 (permintaan pengguna). Sebelumnya
 * layar ini mengambil 100 baris sekali jalan lalu berhenti, dan memasang pita
 * peringatan yang mengakui batas itu. Selama urutannya menurun, 100 itu berarti
 * "100 terbaru" -- merugikan tapi masuk akal. Begitu urutannya dibalik menjadi
 * menaik supaya respons #1 berada di atas, 100 itu berubah arti menjadi
 * "100 TERLAMA": respons yang baru masuk tak akan terlihat sama sekali pada
 * survei yang melewati angka itu. Paginasi menghapus perkaranya alih-alih
 * menambalnya, dan backend memang sudah menerima `page` sejak awal.
 */

/**
 * Sengaja JAUH di bawah batas backend (100). Angka ini bukan batas teknis
 * melainkan sebanyak apa yang nyaman dibaca sekali layar, dan sama dengan
 * daftar berpaginasi lain di area admin.
 */
const PER_HALAMAN = 20;

export default function SurveyResponsesScreen({ surveyId, basePath, className = 'w-full pt-4' }) {
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    const [survey, questions, responsesResult] = await Promise.all([
      getSurveyById(surveyId),
      getQuestions(surveyId),
      getSurveyResponses(surveyId, { page, limit: PER_HALAMAN }),
    ]);
    // Daftar pertanyaan diteruskan UTUH & TERURUT, bukan sebagai peta id:
    // nomor soal pada jawaban diambil dari posisinya di survei, dan posisi itu
    // hilang begitu daftarnya diubah menjadi peta (13 September 2026).
    const responses = adaptSurveyResponseList(responsesResult.data, questions);
    const pagination = responsesResult.meta?.pagination;
    return {
      survey,
      responses,
      // Total sesungguhnya dari backend, BUKAN `responses.length`: yang kedua
      // kini hanya sepanjang satu halaman.
      total: pagination?.total ?? responses.length,
      totalPages: pagination?.totalPages ?? 1,
    };
  }, [surveyId, page]);

  const { data, isLoading, error, refetch } = useAsync(fetchData);

  /*
   * RINGKASAN DIAMBIL DARI SURVEI, BUKAN DIHITUNG DARI BARIS YANG TERMUAT
   * (4 Oktober 2026).
   *
   * Dulu kedua angka ini dihitung di sini dari 100 baris yang kebetulan ada,
   * dan pita peringatan mengakuinya. Pada layar berpaginasi menaik, cara itu
   * tak sekadar kurang tepat melainkan TERBALIK: "Respons Terakhir" di halaman
   * pertama akan menampilkan respons yang paling lama masuk.
   *
   * `ikmScore` berskala 0-100 (nilai IKM PermenPANRB); kartu ini memakai skala
   * 1-4, jadi dibagi 25. `null` dipertahankan apa adanya -- survei tanpa
   * responden, atau yang 9 unsur bakunya dihapus, memang belum dapat dinilai.
   */
  const nilaiRataRata = data?.survey?.ikmScore == null ? null : data.survey.ikmScore / 25;

  return (
    <div className={className}>
      <SurveyResponsesHeader
        surveyTitle={data?.survey.title ?? ''}
        period={data?.survey.period ?? ''}
        listHref={basePath}
      />

      {isLoading ? (
        <LoadingState label="Memuat daftar respons..." />
      ) : error ? (
        <ErrorState title="Gagal memuat respons" description={error.message} onRetry={refetch} />
      ) : (
        <>
          <SurveyResponsesSummary
            totalResponses={data.total}
            averageScore={nilaiRataRata}
            lastResponseDate={data.survey.terakhirMasuk}
          />

          <SurveyResponsesTable
            surveyId={surveyId}
            responses={data.responses}
            basePath={basePath}
          />

          {data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              totalItems={data.total}
              itemsPerPage={PER_HALAMAN}
              itemName="respons"
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
