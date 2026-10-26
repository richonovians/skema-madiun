import React from 'react';
import Link from 'next/link';
import { Tr, Td } from '@/components/ui/Table';
import { COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

export default function ComplaintRow({ id, date, department, title, status, isAnonim = false }) {
  const statusStyles = {
    'Selesai': 'bg-emerald-100 text-emerald-700',
    'Diproses': 'bg-blue-100 text-blue-700',
    'Diterima': 'bg-slate-100 text-slate-600',
  };

  const currentStyle = statusStyles[status] || 'bg-surface-container-high text-text-primary';

  return (
    <Tr className="group hover:bg-surface-container-low transition-colors">
      <Td className="font-medium text-primary font-bold">{id}</Td>
      <Td className="text-on-surface">{date}</Td>
      <Td className="text-on-surface">{department}</Td>
      {/* `max-w-[24rem]`, BUKAN `max-w-xs` (27 Oktober 2026, BUG-040): di apps/web
          `max-w-xs` bernilai 4px. Terukur: judul 280px terpotong menjadi 154px
          bahkan pada layar 1920px yang tabelnya masih lega. 24rem, bukan 20rem
          yang semula dimaksud: batas sel ikut memuat bantalannya, dan pada
          20rem judul yang sama masih terpotong 8px. */}
      <Td className="text-on-surface max-w-[24rem]">
        {/* Badge diletakkan DI BAWAH judul, bukan sebaris: sel ini memangkas
            teks (`truncate`), jadi badge sebaris akan ikut terpotong. */}
        <span className="block truncate" title={title}>{title}</span>
        {isAnonim && (
          <span className="mt-1 inline-flex items-center rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Dikirim anonim
          </span>
        )}
      </Td>
      <Td>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${currentStyle}`}>
          {COMPLAINT_STATUS_LABEL[status] ?? status}
        </span>
      </Td>
      <Td className="text-right">
        <Link href={`/complaints/${id.toLowerCase().replace('#', '')}`} className="text-primary font-medium hover:underline transition-all">
          Lihat Detail
        </Link>
      </Td>
    </Tr>
  );
}
