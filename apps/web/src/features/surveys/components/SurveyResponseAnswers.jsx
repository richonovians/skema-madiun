import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const TYPE_VARIANT = {
  'Skala Penilaian 1-4': 'info',
  'Isian Teks': 'default',
  'Pilihan Ganda': 'warning',
};

/**
 * Dirombak total dari visualisasi RadioCard dgn opsi teks karangan (skala
 * dummy py label semu spt "Sangat Cepat/Sangat Baik" yg tak pernah tersimpan
 * di backend) -- backend cuma simpan nilai numerik 1-4 utk tipe skala, teks
 * bebas utk tipe teks, & id opsi terpilih utk tipe pilihan (labelnya disandingkan
 * pemanggil lewat adaptSurveyResponseAnswer).
 */
export default function SurveyResponseAnswers({ answers }) {
  return (
    <Card className="p-lg">
      <h3 className="font-h3 text-h3 text-on-surface mb-md pb-sm border-b border-outline-variant">
        Jawaban Survei
      </h3>

      <div className="space-y-lg">
        {(answers ?? []).map((answer, index) => (
          <div key={answer.questionId} className="pb-md border-b border-outline-variant last:border-0 last:pb-0">
            {/* Menumpuk di layar sempit, berdampingan mulai `sm`. Terukur
                di Chrome pada 320px: lencana 140px yang menolak menyusut
                mendorong halaman 15px ke samping, dan pada 360px ia memaksa
                judul pertanyaan pecah menjadi tiga sampai empat baris. */}
            <div
              data-baris-pertanyaan
              className="flex flex-col sm:flex-row items-start sm:justify-between gap-xs sm:gap-md mb-sm"
            >
              <p className="font-medium text-on-surface text-lg">
                {/* Nomor soal DI SURVEI (adaptSurveyResponseAnswer), bukan
                    posisi jawaban di array. Posisi array sempat menjadi
                    nomornya, dan karena backend tak mengurutkan jawaban, nomor
                    itu terbaca terbalik pada dua dari tiga respons. Cadangan
                    `index + 1` hanya terpakai bila pertanyaannya sudah dihapus
                    dari survei. */}
                <span className="text-on-surface-variant mr-xs">{answer.nomor ?? index + 1}.</span>
                {answer.questionText}
              </p>
              {answer.questionType && (
                <Badge
                  variant={TYPE_VARIANT[answer.questionType] ?? 'default'}
                  className="max-w-full sm:shrink-0"
                >
                  {answer.questionType}
                </Badge>
              )}
            </div>

            <div className="pl-4">
              {answer.nilai != null && (
                <span className="inline-block px-md py-sm rounded-lg bg-primary-container text-on-primary-container font-bold">
                  Nilai: {answer.nilai} / 4
                  {/* Label hanya muncul bila pengelola survei menyesuaikannya
                      (lihat nilaiLabel di adaptSurveyResponseAnswer) -- label
                      baku SKM sengaja tidak diulang di sini. */}
                  {answer.nilaiLabel ? ` — ${answer.nilaiLabel}` : ''}
                </span>
              )}
              {answer.teks != null && (
                <p className="text-on-surface-variant whitespace-pre-wrap">
                  {answer.teks || <span className="italic">(tidak diisi)</span>}
                </p>
              )}
              {answer.selectedOptionId != null && (
                <span className="inline-block px-md py-sm rounded-lg bg-surface-container text-on-surface font-medium">
                  {/* Label diambil dari daftar opsi pertanyaan (lihat
                      adaptSurveyResponseAnswer); id mentah cuma jadi cadangan
                      bila opsinya sudah terhapus dari pertanyaan. */}
                  {answer.selectedOptionLabel ?? `Opsi terpilih #${answer.selectedOptionId}`}
                </span>
              )}
              {answer.nilai == null && answer.teks == null && answer.selectedOptionId == null && (
                <span className="text-on-surface-variant italic">(tidak diisi)</span>
              )}
            </div>
          </div>
        ))}

        {(!answers || answers.length === 0) && (
          <p className="text-on-surface-variant text-center py-lg">Tidak ada jawaban tercatat.</p>
        )}
      </div>
    </Card>
  );
}
