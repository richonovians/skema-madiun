import React from 'react';
import { ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card';
import DetailOperasi from './DetailOperasi';

/**
 * Satu tag OpenAPI beserta seluruh operasinya, dapat dilipat.
 *
 * Keadaan buka-tutup DIKENDALIKAN INDUK, bukan disimpan di sini. Dokumen
 * sungguhan memuat 15 tag dan 65 operasi, dan dua kebutuhan layar tak dapat
 * dipenuhi bila tiap grup menyimpan keadaannya sendiri: pencarian harus
 * membuka grup yang cocok, dan satu tombol harus membuka semuanya.
 *
 * `aria-label` kepala grup diawali kata "Grup" dengan sengaja. Tanpa itu nama
 * aksesibelnya hanya "surveys 3 endpoint", yang bertumpang nama dengan tombol
 * salin di dalamnya ("Salin snippet curl untuk GET /api/v1/surveys") sehingga
 * pembaca layar -- dan uji yang mencari tombol itu -- tak dapat membedakannya.
 */
export default function GrupOperasi({ tag, operasi, dibuka, onToggle }) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={dibuka}
        aria-label={`Grup ${tag}, ${operasi.length} endpoint`}
        className="flex min-h-[44px] w-full items-center gap-sm p-md text-left transition-colors hover:bg-surface-variant/60"
      >
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-on-surface-variant transition-transform ${
            dibuka ? '' : '-rotate-90'
          }`}
        />
        <span className="font-h3 text-h3 text-on-surface">{tag}</span>
        <span className="ml-auto shrink-0 rounded-full bg-surface-variant px-3 py-1 text-label-sm text-on-surface-variant">
          {operasi.length} endpoint
        </span>
      </button>

      {dibuka && (
        <ul className="border-t border-border px-md">
          {operasi.map((op) => (
            <DetailOperasi key={op.id} operasi={op} />
          ))}
        </ul>
      )}
    </Card>
  );
}
