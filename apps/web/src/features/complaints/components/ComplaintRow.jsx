import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { Tr, Td } from '@/components/ui/Table';
import { COMPLAINT_STATUS_BADGE_VARIANT, COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

export default function ComplaintRow({ id, date, department, title, status, isAnonim = false }) {
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
        <Badge
          variant={COMPLAINT_STATUS_BADGE_VARIANT[status]}
          className="px-2 text-[11px] leading-(--text-xs--line-height) font-bold uppercase tracking-wider whitespace-nowrap"
        >
          {COMPLAINT_STATUS_LABEL[status] ?? status}
        </Badge>
      </Td>
      <Td className="text-right">
        <Link href={`/complaints/${id.toLowerCase().replace('#', '')}`} className="text-primary font-medium hover:underline transition-all">
          Lihat Detail
        </Link>
      </Td>
    </Tr>
  );
}
