import React from 'react';

/**
 * Pita tanggal di tengah percakapan (21 September 2026).
 *
 * Bentuknya sengaja sekeluarga dengan ChatSystemInfo -- pil terpusat, sudut
 * penuh -- sebab keduanya sama-sama keterangan, bukan ucapan seseorang.
 * Warnanya dibuat lebih redup dan hurufnya lebih kecil supaya keduanya tetap
 * dapat dibedakan sekilas: pesan sistem mengabarkan sesuatu yang terjadi,
 * pita ini hanya menandai waktu.
 *
 * `role="separator"` lebih dari kerapian: tanpanya pembaca layar membacakan
 * "Kemarin" sebagai sepotong teks yang menggantung di tengah percakapan, tanpa
 * petunjuk bahwa ia membatasi dua kelompok pesan.
 */
export default function ChatDateSeparator({ label }) {
  if (!label) return null;

  return (
    <div className="flex justify-center" role="separator" aria-label={`Percakapan ${label}`}>
      <span className="bg-slate-200/70 text-text-secondary px-md py-1 rounded-full text-[11px] font-semibold tracking-wide">
        {label}
      </span>
    </div>
  );
}
