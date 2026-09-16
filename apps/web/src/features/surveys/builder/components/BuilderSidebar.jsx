import React, { useState } from 'react';
import clsx from 'clsx';
import { PlusCircle, GripVertical, Info, ChevronDown } from 'lucide-react';

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
  /**
   * Sebab susunan terkunci (11 September 2026), atau `null` bila bebas diubah.
   * Dipakai sebagai `title` kendali yang mati -- keterangan panjangnya
   * ditampilkan sekali di atas kanvas, bukan diulang di tiap tombol.
   */
  alasanTerkunci = null,
}) {
  const isDraggable = canDrag === true;
  const terkunci = alasanTerkunci != null;
  /**
   * Tertutup secara baku, dan itu hanya berlaku di bawah `md`: mulai `md` isinya
   * dilarutkan dengan `md:contents` tanpa memedulikan keadaan ini, sebab di sana palet memang
   * kolom kiri yang tetap.
   *
   * Pendahulunya `max-h-[38vh]` (24 Agustus 2026) menjawab keluhan lain -- tanpa
   * batas itu palet memakan seluruh tinggi isinya dan kanvas cuma kebagian ~90px.
   * Yang keliru bukan angkanya melainkan mengunci tinggi builder ke layar
   * ponsel: hasilnya dua daerah gulir mandiri yang membelah layar, 304px palet
   * dan 432px kanvas pada layar 800px. Keduanya kini larut ke dalam satu
   * guliran halaman.
   */
  const [terbuka, setTerbuka] = useState(false);

  /**
   * Menutup sendiri sesudah pertanyaan ditambahkan. Tanpa ini, panel yang
   * terbuka DAN menempel di bawah navbar akan menutupi kanvas yang sedang
   * disusun -- tepat pada saat pengguna ingin melihat hasil penambahannya.
   * Di `md` ke atas keadaan buka/tutup tak berpengaruh sama sekali, jadi ini
   * tak mengubah apa pun di sana.
   */
  const tambahLaluTutup =
    (aksi) =>
    (...argumen) => {
      setTerbuka(false);
      aksi?.(...argumen);
    };

  return (
    // `sticky` di bawah `md` (16 September 2026, permintaan pengguna): sejak
    // builder menggulir sebagai satu halaman, bilah "Tambah Pertanyaan"
    // tertinggal di atas dan harus dikejar setiap kali hendak menambah
    // pertanyaan. `top` memakai token yang sama dengan tinggi navbar yang
    // menaunginya, jadi keduanya tak bisa berselisih. Saat tertutup ia cuma
    // ~68px. Mulai `md` ia kembali kolom kiri yang tetap.
    <aside className="w-full md:w-80 shrink-0 sticky top-[var(--tinggi-navbar-opd)] z-30 md:static md:top-auto md:z-auto bg-surface border-b md:border-b-0 md:border-r border-border md:overflow-y-auto p-4 md:p-lg flex flex-col gap-4 md:gap-xl">
      {/* Hanya di bawah `md`. Di layar lebar paletnya selalu terbuka, jadi
          pengalihnya tak punya pekerjaan di sana. */}
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-expanded={terbuka}
        className="md:hidden flex items-center justify-between gap-md w-full rounded-xl border border-border bg-surface-container-low px-md py-sm text-left font-label-md text-label-md text-text-primary"
      >
        Tambah Pertanyaan
        <ChevronDown
          size={18}
          className={clsx('shrink-0 transition-transform', terbuka && 'rotate-180')}
        />
      </button>

      <div
        data-isi-palet
        /* `md:contents`, BUKAN `md:flex`. Kotak tips memakai `mt-auto` untuk
           menempel ke dasar palet; begitu ia terbungkus satu lapis div biasa,
           `auto`-nya mengukur tinggi div itu, bukan tinggi palet, dan tipsnya
           melompat naik merapat ke daftar komponen. `display: contents`
           melarutkan pembungkusnya di layar lebar sehingga ketiga bagian kembali
           menjadi anak langsung <aside>, persis seperti sebelum panel ini ada. */
        className={clsx(terbuka ? 'flex' : 'hidden', 'flex-col gap-6 md:contents')}
      >
        {/* Section 1: Template */}
        <section>
          <h3 className="text-label-md font-label-md text-text-secondary uppercase tracking-wider mb-md">
            Template Unsur Baku
          </h3>
          <button
            onClick={tambahLaluTutup(onAddBaku)}
            disabled={terkunci}
            title={alasanTerkunci ?? undefined}
            className="w-full bg-primary-container/10 hover:bg-primary-container/20 text-primary border-2 border-dashed border-primary-container/30 rounded-xl p-lg text-left group transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                onClick={tambahLaluTutup(() => onAddCustom?.(item.type))}
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
                  : /* KEADAANNYA saja, bukan sebabnya. Alasan lengkap beserta
                     jumlah jawabannya ditampilkan sekali di atas kanvas;
                     mengulangnya di sini membuat satu layar memuat kalimat yang
                     sama dua kali. Kalimat lama "survei sudah terbit" dibuang
                     karena sejak 11 September 2026 tidak selalu benar: survei
                     terbit tanpa jawaban masih bebas disusun ulang. */
                    'Susunan pertanyaan sedang terkunci. Teks pertanyaan masih dapat diperbaiki.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
