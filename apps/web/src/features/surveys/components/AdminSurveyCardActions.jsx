import React, { useState } from 'react';
import { Eye, Edit2, Copy, Check, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import ShareSurveyButton from './ShareSurveyButton';

export default function AdminSurveyCardActions({ isDraft, surveyId, survey, onDuplicate, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const actionButtonClass = "px-md py-sm border border-outline rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors";

  const handleCopy = () => {
    // Memanggil prop onDuplicate untuk membuat salinan form di list
    if (onDuplicate) {
      onDuplicate(surveyId);
    }

    // Opsional: masih menyalin ID ke clipboard
    const codeToCopy = `SRV-${surveyId || '001'}`;
    navigator.clipboard.writeText(codeToCopy);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isDraft) {
    return (
      <>
        <div className="flex flex-wrap gap-md pt-lg border-t border-border">
          <Link href={`/admin-opd/surveys/builder/${surveyId}`}>
            <button className="px-xl py-sm bg-primary text-on-primary rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-primary-hover transition-colors shadow-lg shadow-primary/10">
              <Edit2 size={18} />
              Lanjut Edit
            </button>
          </Link>
          {/* Draf pun boleh dibagikan: id survei (dan karenanya tautan) sudah
              final sejak dibuat, sehingga poster/QR bisa disiapkan sebelum
              dipublikasikan. Modal memberi peringatan bahwa tautan belum bisa
              diisi selama masih draf. */}
          <ShareSurveyButton survey={survey} className={actionButtonClass} />
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-md py-sm bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-rose-100 transition-colors ml-auto"
          >
            Hapus
          </button>
        </div>

        {/* Modal konfirmasi hapus draft */}
        <ConfirmActionModal
          isOpen={showDeleteModal}
          title="Hapus Survei Draft"
          description="Survei draft ini akan dihapus secara permanen. Semua pertanyaan yang sudah dibuat akan hilang dan tidak dapat dipulihkan."
          confirmLabel="Ya, Hapus Draft"
          danger
          onConfirm={() => {
            setShowDeleteModal(false);
            onDelete && onDelete(surveyId);
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-md pt-lg border-t border-border">
      <button className={actionButtonClass} onClick={handleCopy}>
        {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
        {copied ? 'Tersalin!' : 'Salin'}
      </button>

      <ShareSurveyButton survey={survey} className={actionButtonClass} />

      <Link href={`/admin-opd/surveys/${surveyId}/responses`}>
        <button className={actionButtonClass}>
          <Eye size={18} />
          Daftar Respons Survei
        </button>
      </Link>

      <Link href={`/admin-opd/analytics?surveyId=${surveyId}`}>
        <button className={actionButtonClass}>
          <BarChart3 size={18} />
          Lihat Hasil
        </button>
      </Link>
    </div>
  );
}

