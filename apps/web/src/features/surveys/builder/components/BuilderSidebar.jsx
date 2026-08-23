import React from 'react';
import { PlusCircle, GripVertical, Info } from 'lucide-react';

/**
 * Tiga komponen kustom sebelumnya ditulis tiga kali dengan markup identik --
 * disatukan jadi data supaya penambahan tipe baru tak perlu menyalin blok JSX.
 * `type` HARUS sama dengan yang dikenali builderTypeToBackendTipe di
 * survey.adapter.js.
 */
const TYPE_ITEMS = [
  { type: 'Skala Penilaian 1-4', label: 'Skala Nilai 1-4', hint: 'Standard IKM' },
  { type: 'Pilihan Ganda', label: 'Pilihan Ganda', hint: 'Atur sendiri opsi jawabannya' },
  { type: 'Isian Teks', label: 'Uraian', hint: 'Isian teks bebas, tidak wajib' },
];

/**
 * `canDrag` TIGA keadaan, bukan dua:
 * - `true`  -> survei draf, komponen bisa diseret/diklik
 * - `false` -> survei sudah terbit; pertanyaan terkunci (backend menolak
 *              create/reorder di luar status draft), jadi afordansi seretnya
 *              dimatikan sekalian daripada mengundang gerakan yang pasti gagal
 * - `null`  -> status BELUM DIKETAHUI (layar masih memuat, atau gagal memuat).
 *              Kotak petunjuk disembunyikan: sebelumnya keadaan ini jatuh ke
 *              `false` dan bilah sisi mengklaim "survei sudah terbit" pada setiap
 *              pemuatan halaman, padahal bisa jadi masih draf.
 *
 * Kelas `draggable-item` yang lama DIBUANG: tak ada definisinya di CSS mana pun
 * (sisa mockup), sementara ikon GripVertical + cursor-grab membuat komponen ini
 * TAMPAK bisa diseret padahal dulu tidak. Sekarang seretnya sungguhan.
 */
export default function BuilderSidebar({
  onAddBaku,
  onAddCustom,
  onDragTypeStart,
  onDragEnd,
  canDrag = null,
}) {
  const isDraggable = canDrag === true;
  return (
    // `max-h-[38vh]` di ponsel (2026-08-24, laporan user "ada tampilan yang
    // tertumpuk/rusak"). BuilderLayout mengunci tinggi builder ke layar (`fixed
    // inset-0` + `overflow-hidden`), dan di ponsel arah flex-nya KOLOM. Dengan
    // `shrink-0`, palet ini menolak mengecil sehingga memakan seluruh tinggi
    // isinya (~700px) -- kanvas di bawahnya cuma kebagian sisa ~90px, terlalu
    // tipis untuk menyunting apa pun, dan halaman tak bisa digulir keluar dari
    // keadaan itu karena yang menggulir adalah wadah dalam, bukan body.
    // `shrink-0` DIPERTAHANKAN (tanpanya palet gepeng saat pertanyaan banyak);
    // yang dibatasi tingginya, jadi kanvas mendapat ~60% layar. Palet tetap
    // terjangkau penuh lewat gulirannya sendiri (`overflow-y-auto` di bawah).
    <aside className="w-full md:w-80 shrink-0 max-h-[38vh] md:max-h-none bg-surface border-b md:border-b-0 md:border-r border-border overflow-y-auto p-4 md:p-lg flex flex-col gap-6 md:gap-xl">
      {/* Section 1: Template */}
      <section>
        <h3 className="text-label-md font-label-md text-text-secondary uppercase tracking-wider mb-md">
          Template Unsur Baku
        </h3>
        <button
          onClick={onAddBaku}
          className="w-full bg-primary-container/10 hover:bg-primary-container/20 text-primary border-2 border-dashed border-primary-container/30 rounded-xl p-lg text-left group transition-all duration-300 active:scale-[0.98]"
        >
          <div className="flex flex-col gap-xs">
            <span className="font-headline-md text-[14px]">Tambah 9 Unsur Baku</span>
            <span className="text-xs opacity-80">PermenPANRB 14/2017</span>
          </div>
          <div className="mt-md flex justify-end">
            <PlusCircle className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </section>

      {/* Section 2: Custom Elements */}
      <section>
        <h3 className="text-label-md font-label-md text-text-secondary uppercase tracking-wider mb-md">
          Komponen Pertanyaan Kustom
        </h3>
        <div className="flex flex-col gap-sm">
          {TYPE_ITEMS.map((item) => (
            <div
              key={item.type}
              draggable={isDraggable}
              onDragStart={(e) => {
                if (!isDraggable) return;
                e.dataTransfer.effectAllowed = 'copy';
                // Firefox menolak memulai drag tanpa data apa pun.
                e.dataTransfer.setData('text/plain', item.type);
                onDragTypeStart?.(item.type);
              }}
              onDragEnd={onDragEnd}
              onClick={() => onAddCustom && onAddCustom(item.type)}
              className={`group bg-white border border-border rounded-lg p-md flex items-center gap-md hover:border-primary hover:shadow-sm transition-all ${
                isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              }`}
            >
              <GripVertical className="text-text-secondary group-hover:text-primary" />
              <div className="flex flex-col">
                <span className="font-label-md text-label-md">{item.label}</span>
                <span className="text-[10px] text-text-secondary">{item.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Tips -- disembunyikan selama status survei belum diketahui,
          supaya tak ada klaim yang belum tentu benar (lihat catatan `canDrag`). */}
      {canDrag != null && (
        <div className="mt-auto p-md bg-surface-container-low rounded-xl border border-border">
          <div className="flex items-start gap-sm">
            <Info className="text-primary shrink-0" size={20} />
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {isDraggable
                ? 'Klik komponen untuk menambahkannya di akhir daftar, atau seret ke posisi yang diinginkan. Urutan pertanyaan bisa diubah dengan menyeret kartunya dari mana saja, atau lewat tombol panah. Untuk Pilihan Ganda, opsi jawaban diisi lewat jendela yang muncul.'
                : 'Survei sudah terbit -- pertanyaan dan urutannya tidak dapat diubah lagi.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
