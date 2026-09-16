import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import AdminSurveyCardStats from './AdminSurveyCardStats';
import AdminSurveyCardActions from './AdminSurveyCardActions';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

export default function AdminSurveyCard({ survey, onChangeStatus, onDuplicate, onDelete }) {
  const { id, title, status, period, respondentsCount, ikmScore, isUtama } = survey;
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  const isDraft = status === 'DRAF';
  const isActive = status === 'AKTIF';
  const isClosed = status === 'DITUTUP';

  let statusBadgeProps = { variant: 'default', label: status };
  if (isActive) {
    statusBadgeProps = { variant: 'success', label: 'AKTIF' };
  } else if (isClosed) {
    statusBadgeProps = { variant: 'danger', label: 'DITUTUP' };
  }

  return (
    <Card className={`p-lg relative overflow-hidden hover:shadow-md transition-shadow ${isDraft ? 'border-outline-variant' : ''}`}>
      {isDraft && <div className="absolute left-0 top-0 w-1 h-full bg-outline"></div>}

      <div className="flex justify-between items-start mb-md">
        <div className="flex flex-wrap gap-sm">
          <Badge variant={statusBadgeProps.variant} className="px-sm py-[2px] text-[10px] uppercase rounded">
            {statusBadgeProps.label}
          </Badge>
          <Badge
            variant="default"
            className={`px-sm py-[2px] text-[10px] uppercase rounded ${isDraft ? 'bg-surface-container-low text-on-surface-variant/40 italic' : ''}`}
          >
            PERIODE: {formatPeriodeLabel(period)}
          </Badge>
          {/* Penanda survei utama disetel di builder, satu halaman per survei.
              Tanpa lencana di sini, admin hanya dapat mengetahuinya dengan
              membuka survei satu per satu -- dan karena menyalakan yang baru
              MELEPAS yang lama, ia juga tak punya cara memastikan
              penunjukannya berpindah ke tempat yang ia kira. */}
          {isUtama && (
            <Badge
              variant="info"
              className="px-sm py-[2px] text-[10px] uppercase rounded"
            >
              Survei Utama
            </Badge>
          )}
        </div>

        {/* Switch AKTIF → DITUTUP */}
        {isActive && (
          <div className="flex items-center gap-sm">
            <span className="text-label-md text-on-surface-variant">Tutup Periode</span>
            <Switch
              checked={true}
              onChange={() => setShowCloseModal(true)}
            />
          </div>
        )}

        {/* Switch DITUTUP → AKTIF (buka kembali) */}
        {isClosed && (
          <div className="flex items-center gap-sm">
            <span className="text-label-md text-on-surface-variant">Buka Periode</span>
            <Switch
              checked={false}
              onChange={() => setShowReopenModal(true)}
            />
          </div>
        )}
      </div>

      <h3 className="font-h3 text-h3 text-text-primary mb-lg">{title}</h3>

      <AdminSurveyCardStats
        respondentsCount={respondentsCount}
        ikmScore={ikmScore}
        isDraft={isDraft}
      />

      {/* `survey` diteruskan utuh karena tombol "Bagikan" butuh judul & status
          untuk isi modal QR/tautan, bukan cuma id. */}
      <AdminSurveyCardActions
        isDraft={isDraft}
        surveyId={id}
        survey={survey}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />

      {/* Modal konfirmasi tutup periode (AKTIF → DITUTUP) */}
      <ConfirmActionModal
        isOpen={showCloseModal}
        title="Tutup Periode Survei"
        description={`Anda akan menutup periode survei "${title}". Responden tidak dapat lagi mengisi survei ini selama ditutup. Anda masih dapat mengaktifkannya kembali kapan saja.`}
        confirmLabel="Ya, Tutup Periode"
        danger
        onConfirm={() => {
          setShowCloseModal(false);
          onChangeStatus(id, 'DITUTUP');
        }}
        onCancel={() => setShowCloseModal(false)}
      />

      {/* Modal konfirmasi buka kembali (DITUTUP → AKTIF) */}
      <ConfirmActionModal
        isOpen={showReopenModal}
        title="Aktifkan Kembali Survei"
        description={`Anda akan mengaktifkan kembali survei "${title}". Responden dapat mengisi survei ini setelah diaktifkan kembali.`}
        confirmLabel="Ya, Aktifkan Kembali"
        onConfirm={() => {
          setShowReopenModal(false);
          onChangeStatus(id, 'AKTIF');
        }}
        onCancel={() => setShowReopenModal(false)}
      />
    </Card>
  );
}


