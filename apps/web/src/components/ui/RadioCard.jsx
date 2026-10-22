import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function RadioCard({
  name,
  value,
  label,
  checked,
  onChange,
  numberIcon, // Optional: e.g., '1', '2', '3', '4'
}) {
  return (
    <label className="group cursor-pointer">
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
        className={twMerge(
          "flex items-center min-h-[64px] px-6 py-4 rounded-lg border-2 transition-all shadow-sm",
          // Default unselected state
          "border-outline-variant/50 text-text-secondary bg-surface",
          // Hover state for unselected
          "group-hover:border-primary/30 group-hover:bg-surface-container-low",
          // Checked state (using peer-checked)
          "peer-checked:border-primary peer-checked:bg-blue-50 peer-checked:text-primary",
          // Fokus papan ketik HARUS terlihat. Radionya kini terfokus tetapi
          // berukuran 1x1 piksel, jadi tanpa cincin ini orang yang ber-Tab
          // tidak dapat melihat di mana dirinya berada -- menukar satu cacat
          // (tak terjangkau) dengan cacat lain (terjangkau tetapi tak terlihat).
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
        )}
      >
        {numberIcon && (
          <span className="w-8 h-8 flex shrink-0 items-center justify-center rounded-full border-2 border-current mr-4 font-bold">
            {numberIcon}
          </span>
        )}
        <span className="font-medium">{label}</span>
      </div>
    </label>
  );
}
