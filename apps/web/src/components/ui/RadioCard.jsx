import React from 'react';
import { cn } from '@/utils/cn';

export default function RadioCard({
  name,
  value,
  label,
  checked,
  onChange,
  numberIcon, // Optional: e.g., '1', '2', '3', '4'
  icon,       // Optional: ReactNode (e.g. Frown, Meh, Smile, Laugh)
}) {
  return (
    <label className="group cursor-pointer block">
      {/* `sr-only`, BUKAN `hidden` (22 Oktober 2026).

          `hidden` adalah `display: none`, dan elemen ber-`display: none`
          dibuang dari pohon aksesibilitas SEKALIGUS dari urutan Tab. Akibatnya
          kuesioner survei -- sembilan unsur wajib menurut PermenPANRB 14/2017
          -- tak dapat dijawab sama sekali tanpa tetikus, dan pembaca layar tak
          pernah diberi tahu bahwa ada pilihan di sini. Terukur: pada halaman
          yang jelas menampilkan empat pilihan skala, `getByRole('radio')`
          mengembalikan NOL.

          `sr-only` mencapai penyamaran visual yang sama (1x1 piksel, terpotong)
          tetapi membiarkan radionya tetap terfokus dan tetap terbaca sebagai
          radio. `peer-checked:` di bawah tak terpengaruh: pemilih itu bekerja
          atas keadaan input, bukan atas cara ia disembunyikan. */}
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />

      <div 
        className={cn(
          "flex items-center min-h-[44px] px-4 py-2.5 rounded-xl border transition-all shadow-xs",
          // Default unselected state
          "border-outline-variant/40 text-text-secondary bg-surface",
          // Hover state for unselected
          "group-hover:border-primary/40 group-hover:bg-surface-container-low group-hover:shadow-sm",
          // Checked state (using peer-checked)
          "peer-checked:border-primary peer-checked:bg-blue-50/70 peer-checked:text-primary peer-checked:shadow-sm",
          // Fokus papan ketik HARUS terlihat. Radionya kini terfokus tetapi
          // berukuran 1x1 piksel, jadi tanpa cincin ini orang yang ber-Tab
          // tidak dapat melihat di mana dirinya berada -- menukar satu cacat
          // (tak terjangkau) dengan cacat lain (terjangkau tetapi tak terlihat).
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
        )}
      >
        {icon ? (
          <span className="w-6 h-6 flex shrink-0 items-center justify-center mr-3">
            {icon}
          </span>
        ) : numberIcon ? (
          React.isValidElement(numberIcon) ? (
            <span className="w-6 h-6 flex shrink-0 items-center justify-center mr-3">
              {numberIcon}
            </span>
          ) : (
            <span className="w-5 h-5 flex shrink-0 items-center justify-center rounded-full border border-current mr-3 font-bold text-xs">
              {numberIcon}
            </span>
          )
        ) : null}
        <span className="font-medium text-sm text-text-primary group-hover:text-primary transition-colors leading-snug">{label}</span>
      </div>
    </label>
  );
}
