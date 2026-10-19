import React from 'react';
import Card from '@/components/ui/Card';
import { Users, Star, Clock } from 'lucide-react';
import NilaiSurvei from './NilaiSurvei';

/**
 * `jenis === 'custom'` (8 Oktober 2026): kartu kedua menampilkan NILAI SURVEI jadi
 * dari backend (judul menurut metode, angka, kategori) menggantikan "Nilai
 * Rata-Rata" polos. Survei lain tak berubah.
 */
export default function SurveyResponsesSummary({
  totalResponses,
  averageScore,
  lastResponseDate,
  jenis,
  nilaiSurvei = null,
}) {
  const custom = jenis === 'custom';
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
      <Card className="p-md flex items-center gap-md">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Users size={24} />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Respons</p>
          <p className="font-h3 text-h3 text-on-surface">{totalResponses}</p>
        </div>
      </Card>
      
      <Card className="p-md flex items-center gap-md">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Star size={24} />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">
            {custom ? (nilaiSurvei?.judul ?? 'Nilai Survei') : 'Nilai Rata-Rata'}
          </p>
          {/* `null` DIBEDAKAN dari nol (4 Oktober 2026). Survei yang belum
              punya responden -- atau yang 9 unsur bakunya dihapus, sehingga
              rumus IKM tak punya pijakan -- tak dapat dinilai, dan itu keadaan
              yang sama sekali berbeda dari "dinilai, hasilnya 0,00". */}
          <p className="font-h3 text-h3 text-on-surface">
            {custom ? (
              nilaiSurvei ? (
                <NilaiSurvei nilaiSurvei={nilaiSurvei} ukuran="sel" />
              ) : (
                '–'
              )
            ) : averageScore == null ? (
              '–'
            ) : (
              averageScore.toFixed(2)
            )}
          </p>
        </div>
      </Card>
      
      <Card className="p-md flex items-center gap-md">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Respons Terakhir</p>
          <p className="font-h4 text-h4 text-on-surface">{formatDate(lastResponseDate)}</p>
        </div>
      </Card>
    </div>
  );
}
