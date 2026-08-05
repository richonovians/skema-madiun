import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Calendar, ClipboardList, Star } from 'lucide-react';

/**
 * Field "OPD Penyelenggara" DIHAPUS -- admin OPD sudah tahu instansinya
 * sendiri, dan `adaptSurvey` tak menyertakan opdNama. "Nilai Akhir" sekarang
 * `averageScore` DIDERIVASI dari jawaban skala respons ini saja (skala 1-4
 * sesuai PermenPANRB, bukan 1-5), lihat catatan survey.adapter.js.
 */
export default function SurveyResponseDetailCard({ surveyTitle, submittedAt, averageScore }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="p-lg">
      <h3 className="font-h3 text-h3 text-on-surface mb-md pb-sm border-b border-outline-variant">
        Informasi Survei
      </h3>

      <div className="grid grid-cols-1 gap-y-4">
        <div className="flex items-start gap-sm">
          <div className="mt-1 text-primary shrink-0">
            <ClipboardList size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">Judul Survei</p>
            <p className="font-medium text-on-surface text-sm">{surveyTitle}</p>
          </div>
        </div>

        <div className="flex items-start gap-sm">
          <div className="mt-1 text-primary shrink-0">
            <Calendar size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">Waktu Pengisian</p>
            <p className="font-medium text-on-surface text-sm">{formatDate(submittedAt)}</p>
          </div>
        </div>

        <div className="flex items-start gap-sm mt-2 pt-4 border-t border-outline-variant/50">
          <div className="mt-1 text-amber-500 shrink-0">
            <Star size={20} className="fill-amber-500" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">
              Nilai Rata-Rata
            </p>
            <Badge variant="warning" className="font-bold text-sm px-3 py-1">
              {averageScore != null ? averageScore.toFixed(1) : '-'} / 4
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
