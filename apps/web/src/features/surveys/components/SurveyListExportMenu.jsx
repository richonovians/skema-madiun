'use client';

import React from 'react';
import EksporMenu from '@/components/ui/EksporMenu';
import { downloadTablePdf } from '@/utils/pdf';
import { unduhCsv } from '@/utils/unduh';
import { KOLOM_SURVEI_OPD } from '@/utils/pdfKolom';
import { SURVEY_STATUS_LABEL } from '@/utils/enumLabels';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/**
 * Ekspor daftar survei milik satu OPD. Tanpa kolom OPD, sebab seluruh barisnya
 * memang OPD yang sedang membuka halaman.
 */
function barisDari(surveys) {
  return surveys.map((survei) => [
    survei.title,
    formatPeriodeLabel(survei.period),
    SURVEY_STATUS_LABEL[survei.status] ?? survei.status,
    // Draf belum pernah dibagikan, sehingga "0 responden" membaca seolah gagal
    // menarik peserta alih-alih belum terbit.
    survei.status === 'DRAF' ? '-' : String(survei.respondentsCount ?? 0),
    survei.ikmScore != null ? survei.ikmScore.toFixed(2).replace('.', ',') : '-',
  ]);
}

export default function SurveyListExportMenu({ surveys = [] }) {
  const eksporPdf = () =>
    downloadTablePdf({
      filename: 'daftar-survei.pdf',
      title: 'Daftar Survei Kepuasan Masyarakat',
      subtitle: `${surveys.length} survei`,
      columns: KOLOM_SURVEI_OPD,
      rows: barisDari(surveys),
      emptyLabel: 'Belum ada survei untuk diekspor.',
    });

  const eksporExcel = () =>
    unduhCsv({
      namaBerkas: 'daftar-survei.csv',
      headers: KOLOM_SURVEI_OPD.map((k) => k.header),
      rows: barisDari(surveys),
    });

  return <EksporMenu onPdf={eksporPdf} onExcel={eksporExcel} />;
}
