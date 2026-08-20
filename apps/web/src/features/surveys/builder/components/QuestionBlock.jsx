import React, { useRef, useState } from 'react';
import { Lock, GripVertical, Trash2, ArrowUp, ArrowDown, ListChecks } from 'lucide-react';

const SCALE_STEPS = [1, 2, 3, 4];

/**
 * Elemen yang gerakan tariknya TIDAK boleh direbut jadi drag kartu.
 * Tanpa daftar ini, menyeret untuk MENYELEKSI teks di dalam <input> justru
 * memulai pemindahan kartu -- perilaku Chrome ketika induknya ber-`draggable`.
 */
const INTERACTIVE_SELECTOR =
  'input, textarea, button, a, select, label, [contenteditable="true"]';

/**
 * Pratinjau bentuk jawaban sesuai tipe pertanyaan -- read-only, sekadar
 * memperlihatkan apa yang akan dilihat responden (lihat QuestionCard.jsx yang
 * merender versi sungguhannya). Sebelum ini blok pertanyaan hanya menampilkan
 * nama tipe sebagai teks, sehingga "Pilihan Ganda" & "Uraian" tak terlihat
 * bedanya sama sekali di kanvas builder.
 */
function AnswerPreview({ type, options }) {
  if (type === 'Isian Teks') {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-container-low px-md py-sm text-xs text-text-secondary italic">
        Responden mengisi jawaban bebas di sini (tidak wajib).
      </div>
    );
  }

  if (type === 'Pilihan Ganda') {
    if (options.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-surface-container-low px-md py-sm text-xs text-text-secondary italic">
          Opsi jawaban tidak ditemukan.
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-xs">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-sm text-xs text-text-secondary">
            <span className="w-5 h-5 shrink-0 rounded-full border border-border flex items-center justify-center text-[10px] font-bold">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="truncate">{option.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Skala 1-4 (termasuk seluruh unsur baku PermenPANRB 14/2017).
  return (
    <div className="flex items-center gap-xs">
      {SCALE_STEPS.map((step) => (
        <span
          key={step}
          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary"
        >
          {step}
        </span>
      ))}
      <span className="ml-sm text-xs text-text-secondary">1 = terburuk, 4 = terbaik</span>
    </div>
  );
}

// Ukuran setara tombol aksi lain (bukan ikon kecil menempel di sudut) -- ~44px,
// ambang target sentuh yang lazim.
const CONTROL_CLASS =
  'h-11 w-11 shrink-0 flex items-center justify-center rounded-lg border border-border bg-surface transition-colors cursor-pointer';
const CONTROL_HOVER = 'hover:text-primary hover:border-primary hover:bg-primary-container/10';

/**
 * Penanda seret + tombol naik/turun.
 *
 * Pegangannya SENDIRI tidak lagi ber-`draggable`: seluruh kartu yang draggable
 * (lihat dragCardProps di QuestionBlock), jadi menyeret dari pegangan ini pun
 * ditangani oleh kartu. Ikonnya tetap ada sebagai petunjuk visual -- tanpa itu
 * tak ada apa pun yang memberi tahu bahwa kartu bisa dipindah.
 *
 * Tombol naik/turun bukan hiasan: seret-lepas HTML5 native tidak bisa
 * dioperasikan dengan papan tuntas (keyboard), jadi tanpa tombol ini pengaturan
 * urutan hanya bisa dilakukan pengguna bertetikus.
 */
function ReorderControls({ index, total, onMove, disabled }) {
  if (disabled) return null;

  const btn = `${CONTROL_CLASS} text-text-secondary ${CONTROL_HOVER} disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text-secondary`;

  return (
    <div className="flex items-center gap-1.5">
      <span
        title="Seret dari mana saja di kartu ini untuk memindahkan urutannya"
        aria-hidden="true"
        className={`${CONTROL_CLASS} cursor-grab active:cursor-grabbing text-text-secondary ${CONTROL_HOVER}`}
      >
        <GripVertical size={24} />
      </span>
      <button
        type="button"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        title="Pindahkan ke atas"
        aria-label="Pindahkan pertanyaan ke atas"
        className={btn}
      >
        <ArrowUp size={20} />
      </button>
      <button
        type="button"
        onClick={() => onMove(index, index + 2)}
        disabled={index === total - 1}
        title="Pindahkan ke bawah"
        aria-label="Pindahkan pertanyaan ke bawah"
        className={btn}
      >
        <ArrowDown size={20} />
      </button>
    </div>
  );
}

/**
 * `isDragging` menggantikan gaya "FOKUS" lama yang SELALU menyala di setiap
 * pertanyaan kustom (sisa mockup: border tebal + shadow-2xl + scale 1.02 pada
 * semuanya sekaligus, sehingga tak ada satu pun yang benar-benar terlihat
 * terpilih). Sekarang penonjolan itu dipakai untuk hal yang memang berubah:
 * blok yang sedang diseret.
 *
 * SELURUH KARTU bisa diseret (2026-08-19), bukan cuma pegangannya -- pengguna
 * tak perlu membidik ikon kecil. `draggable` dinyalakan/dimatikan pada
 * `mousedown`: bila gerakan dimulai dari elemen interaktif (input teks, tombol,
 * checkbox), drag TIDAK diambil alih supaya mengetik & menyeleksi teks tetap
 * normal. Ini satu-satunya cara yang bekerja di Chrome, di mana `draggable` pada
 * induk mematikan seleksi teks anaknya.
 */
export default function QuestionBlock({
  question,
  index,
  total,
  isDragging = false,
  canReorder = false,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
  onUpdate,
  onTextCommit,
  onEditOptions,
}) {
  const cardRef = useRef(null);
  const [isCardDraggable, setIsCardDraggable] = useState(false);
  const isBaku = question.isBaku;
  const options = question.options ?? [];

  const dragCardProps = canReorder
    ? {
        draggable: isCardDraggable,
        onMouseDown: (e) => {
          setIsCardDraggable(!e.target.closest(INTERACTIVE_SELECTOR));
        },
        onMouseUp: () => setIsCardDraggable(false),
        onDragStart: (e) => {
          e.dataTransfer.effectAllowed = 'move';
          // Firefox menolak memulai drag tanpa data apa pun.
          e.dataTransfer.setData('text/plain', String(index));
          if (cardRef.current) {
            e.dataTransfer.setDragImage(cardRef.current, 24, 24);
          }
          onDragStart(index);
        },
        onDragEnd: () => {
          setIsCardDraggable(false);
          onDragEnd?.();
        },
      }
    : {};

  const controls = (
    <ReorderControls index={index} total={total} onMove={onMove} disabled={!canReorder} />
  );
  const draggingClass = isDragging ? 'opacity-40 ring-2 ring-primary' : '';
  // cursor-grab di seluruh kartu = petunjuk bahwa kartunya sendiri bisa diseret.
  // Elemen interaktif di dalamnya mengembalikan kursornya masing-masing.
  const grabClass = canReorder ? 'cursor-grab active:cursor-grabbing' : '';

  if (isBaku) {
    return (
      <div
        ref={cardRef}
        {...dragCardProps}
        className={`bg-surface-container-low border border-border rounded-xl p-lg relative overflow-hidden opacity-90 mb-lg transition-opacity ${grabClass} ${draggingClass}`}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-outline"></div>
        {/* flex-wrap: tombol urutan berukuran 44px, tanpa ini baris kepala
            berdesakan dengan judul unsur di layar sempit. */}
        <div className="flex flex-wrap justify-between items-start gap-sm mb-md">
          <div className="flex items-center gap-sm">
            <Lock className="text-text-secondary" size={18} />
            <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
              {question.title}
            </h4>
          </div>
          <div className="flex items-center gap-sm">
            {/* Unsur baku terkunci untuk DIUBAH, tapi URUTANNYA boleh dipindah --
                endpoint reorder backend menuntut seluruh id pertanyaan dan tak
                membedakan baku/kustom, dan nilai IKM dihitung dari kodeUnsur,
                bukan dari posisi, jadi memindahkannya tidak mengubah hitungan. */}
            {controls}
            <span className="px-2 py-1 bg-surface-variant text-[10px] font-bold rounded-full text-on-surface-variant">
              TEMPLATE BAKU
            </span>
          </div>
        </div>
        <div className="mb-md">
          <textarea
            className="w-full bg-white/50 border border-border rounded-lg p-md text-body-md font-body-md resize-none focus:ring-0 cursor-text"
            readOnly
            value={question.text}
            rows={2}
          />
        </div>
        <div className="mb-md">
          <AnswerPreview type={question.type} options={options} />
        </div>
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-2">
            <input
              checked
              className="rounded border-border text-primary focus:ring-0"
              disabled
              type="checkbox"
            />
            <label className="text-xs font-medium text-text-secondary">
              Hitung ke perhitungan Nilai IKM
            </label>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <span className="text-xs text-text-secondary">Tipe: {question.type}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      {...dragCardProps}
      className={`bg-white border border-primary/40 rounded-xl p-lg relative shadow-sm hover:shadow-md transition-all mb-lg ${grabClass} ${draggingClass}`}
    >
      <div className="flex flex-wrap justify-between items-start gap-md mb-md">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-primary mb-xs uppercase">
            {question.title}
          </label>
          <input
            className="w-full text-headline-md font-headline-md border-none focus:ring-0 p-0 text-text-primary cursor-text"
            placeholder="Tulis pertanyaan di sini..."
            type="text"
            value={question.text}
            onChange={(e) => onUpdate(question.id, { text: e.target.value })}
            onBlur={(e) => onTextCommit && onTextCommit(question.id, e.target.value)}
          />
        </div>
        <div className="flex items-center gap-sm shrink-0">
          {controls}
          <button
            onClick={() => onDelete(question.id)}
            className={`${CONTROL_CLASS} text-error border-error/30 hover:bg-error-container hover:border-error`}
            title="Hapus Pertanyaan"
            aria-label="Hapus pertanyaan"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="mb-xl flex flex-col gap-md">
        <div className="flex flex-col gap-xs max-w-[240px]">
          {/* Tipe HANYA bisa dipilih saat menambah (lihat BuilderSidebar.jsx) --
              backend (UpdateQuestionDto) tak dukung ubah tipe pertanyaan yang
              sudah dibuat, jadi read-only di sini, bukan interaktif semu. */}
          <label className="text-[10px] font-bold text-text-secondary uppercase">Tipe Input</label>
          <div className="w-full rounded-lg border border-border bg-surface-container-low font-label-md text-label-md py-sm px-sm text-text-secondary">
            {question.type}
          </div>
        </div>

        <AnswerPreview type={question.type} options={options} />

        {/* "Ubah Opsi" hanya untuk Pilihan Ganda, dan hanya saat masih draf.
            Tipe skala & teks TIDAK punya opsi sama sekali di basis data
            (assertValidOptionsForType backend melarangnya untuk non-pilihan),
            jadi tak ada yang bisa disunting di sana -- skala 1-4 tetap menurut
            PermenPANRB. Sebelum ini di tempat ini ada keterangan bahwa opsi tak
            dapat diubah; kini bisa (lihat replaceQuestionOptions). */}
        {question.type === 'Pilihan Ganda' && canReorder && (
          <button
            type="button"
            onClick={() => onEditOptions?.(question)}
            className="self-start inline-flex items-center gap-2 min-h-[40px] px-3 rounded-lg border border-border text-label-md font-label-md text-text-secondary hover:text-primary hover:border-primary hover:bg-primary-container/10 transition-colors"
          >
            <ListChecks size={16} />
            Ubah Opsi Jawaban
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-md border-t border-border">
        <div className="flex items-center gap-md">
          {/* Wajib-diisi DIDERIVASI dari tipe (skala/pilihan selalu wajib, teks
              selalu opsional) -- backend tak punya flag wajib terpisah yg bisa
              diubah per pertanyaan, jadi read-only, bukan toggle sungguhan. */}
          <span className="text-xs font-medium text-text-secondary">
            {question.isRequired ? '✓ Wajib diisi' : 'Opsional (isian teks)'}
          </span>
        </div>
      </div>
    </div>
  );
}
