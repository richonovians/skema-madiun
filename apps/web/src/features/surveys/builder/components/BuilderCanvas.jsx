'use client';

import React, { useState } from 'react';
import QuestionBlock from './QuestionBlock';
import PeriodeSelect from './PeriodeSelect';
import { Plus } from 'lucide-react';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/** Garis penanda tempat pertanyaan akan disisipkan. Di tingkat modul, bukan di
 *  dalam render, supaya tidak dibuat ulang setiap render (react-hooks/static-components). */
function DropIndicator({ active }) {
  if (!active) return null;
  return (
    <div className="h-1.5 -my-1 mb-md rounded-full bg-primary shadow-[0_0_0_3px_rgba(0,0,0,0.04)]" />
  );
}

/**
 * Kanvas builder + seret-lepas urutan pertanyaan (2026-08-19).
 *
 * Posisi lepas dinyatakan sebagai SLOT SISIPAN 0..questions.length (bukan indeks
 * pertanyaan): slot 0 = sebelum pertanyaan pertama, slot n = setelah pertanyaan
 * terakhir. Ini menghilangkan kerancuan "jatuh di atas atau di bawah kartu ini"
 * dan membuat satu rumus dipakai bersama oleh pemindahan urutan maupun
 * penambahan pertanyaan baru dari bilah sisi.
 *
 * Dipakai dua area sekaligus (Admin OPD & Admin Kabupaten) karena seluruh
 * builder ini satu implementasi -- lihat SurveyBuilderScreen.jsx.
 */
export default function BuilderCanvas({
  questions,
  onDelete,
  onUpdate,
  onTextCommit,
  onAdd,
  // Judul & periode: state-nya milik SurveyBuilderScreen, dipakai bersama bilah
  // atas (BuilderToolbar) -- kartu di kanvas menyunting nilai yang SAMA, bukan
  // salinan lokal yang bisa menyimpang.
  title,
  onTitleChange,
  onTitleBlur,
  periode,
  onPeriodeCommit,
  izinkanAnonim = false,
  onIzinkanAnonimCommit,
  isUtama = false,
  onIsUtamaCommit,
  // Judul & izin pengisian ikut aturan 'meta' (boleh sampai survei ditutup),
  // terpisah dari `canReorder` yang mengunci periode & susunan begitu ada
  // jawaban. Lihat SurveyBuilderScreen.
  canEditMeta = true,
  // Seret-lepas
  drag = null,
  canReorder = false,
  alasanTerkunci = null,
  onQuestionDragStart,
  onDragEnd,
  onDropAt,
  onMove,
  onEditOptions,
}) {
  const [overSlot, setOverSlot] = useState(null);

  const isDraggingSomething = drag != null;
  // `canReorder` = survei masih draf (lihat SurveyBuilderScreen) -- syarat yang
  // sama persis untuk menyunting judul/periode: keduanya ditolak backend di luar
  // status draf. Dipakai apa adanya, bukan prop baru yang bisa tak sinkron.
  const isEditable = canReorder && typeof onTitleChange === 'function';
  const isEditableMeta = canEditMeta && typeof onTitleChange === 'function';

  const clearOver = () => setOverSlot(null);

  const handleDragEnd = () => {
    clearOver();
    onDragEnd?.();
  };

  /** Slot ditentukan dari separuh atas/bawah kartu yang dilewati kursor. */
  const handleDragOverCard = (index) => (e) => {
    if (!isDraggingSomething) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.kind === 'new' ? 'copy' : 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    setOverSlot(isTopHalf ? index : index + 1);
  };

  const handleDragOverTail = (e) => {
    if (!isDraggingSomething) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.kind === 'new' ? 'copy' : 'move';
    setOverSlot(questions.length);
  };

  const handleDrop = (e) => {
    if (!isDraggingSomething) return;
    e.preventDefault();
    const slot = overSlot;
    clearOver();
    if (slot != null) {
      onDropAt?.(slot);
    }
  };

  return (
    <main
      className="flex-1 bg-slate-50 relative md:overflow-y-auto"
      style={{
        backgroundSize: '24px 24px',
        backgroundImage: 'radial-gradient(circle, #E2E8F0 1px, transparent 1px)',
      }}
      onDragLeave={(e) => {
        // Hanya bersihkan bila kursor benar-benar keluar dari kanvas, bukan saat
        // berpindah antar kartu anak (dragleave ikut menggelembung).
        if (!e.currentTarget.contains(e.relatedTarget)) clearOver();
      }}
      onDrop={handleDrop}
    >
      {/* Ruang bawah ekstra (2026-08-24): FloatingStatus ber-`fixed bottom-lg`
          selebar ~304px menggantung di atas kanvas. Di layar lebar ia duduk di
          pojok kanan, tak mengganggu -- di ponsel ia menutupi hampir seluruh
          lebar, sehingga isi paling bawah kanvas tak pernah bisa dilihat penuh
          sebanyak apa pun digulir. `pb` sebesar tinggi pil + jaraknya membuat
          gulirannya berakhir DI ATAS pil, bukan di baliknya. */}
      <div className="max-w-4xl mx-auto pt-xl md:pt-3xl pb-[5.5rem] md:pb-3xl px-md md:px-lg flex flex-col">
        {/* Kartu judul: kini DAPAT DISUNTING langsung (2026-08-20, permintaan
            user "judul survei dan periode dapat di edit pada bagian border
            putih"). Sebelumnya murni pratinjau -- judul & periode hanya bisa
            diubah di bilah atas, padahal di sinilah keduanya paling terlihat.
            Handler-nya SAMA dengan bilah atas (satu state di SurveyBuilderScreen),
            jadi mengetik di sini langsung tercermin di sana dan sebaliknya:
            judul disimpan saat blur, periode saat dipilih. Di luar status draf
            keduanya read-only -- `PATCH /surveys/:id` backend menolaknya
            (assertDraft), jadi jangan mengundang perubahan yang pasti gagal. */}
        <div className="bg-white border border-border rounded-xl p-lg md:p-2xl shadow-sm mb-xl flex flex-col items-center gap-sm">
          {isEditableMeta ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              onBlur={onTitleBlur}
              placeholder="Kuesioner Kepuasan Layanan"
              aria-label="Judul survei"
              title="Klik untuk mengubah judul survei"
              className="w-full font-headline-lg text-headline-lg text-center bg-transparent rounded-lg border border-transparent hover:border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors px-sm py-xs"
            />
          ) : (
            <h2 className="font-headline-lg text-headline-lg">
              {title || 'Kuesioner Kepuasan Layanan'}
            </h2>
          )}

          {isEditable ? (
            <div className="flex flex-wrap items-center justify-center gap-xs text-text-secondary font-body-md text-body-md">
              <span>Periode</span>
              <PeriodeSelect
                periode={periode}
                onCommit={onPeriodeCommit}
                className="flex items-center gap-xs"
                selectClassName="font-body-md text-body-md text-text-secondary bg-transparent rounded-lg border border-transparent hover:border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors px-xs py-0.5"
              />
            </div>
          ) : (
            <p className="text-text-secondary font-body-md text-body-md">
              {periode ? `Periode ${formatPeriodeLabel(periode)}` : 'Periode belum diatur'}
            </p>
          )}

          {/* Kotak centang dibungkus labelnya sendiri (pola sama SurveyFormModal
              & ConsentGate): kotaknya 20px, tapi bidang sentuhnya seluruh label
              -- itulah yang memenuhi target 44px. */}
          <label
            htmlFor="builder-izinkan-anonim"
            className={`mt-sm flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-container-low/60 text-left transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/20 ${
              isEditableMeta ? 'cursor-pointer hover:bg-surface-container-low' : 'opacity-60'
            }`}
          >
            <input
              id="builder-izinkan-anonim"
              type="checkbox"
              checked={izinkanAnonim}
              disabled={!isEditableMeta}
              onChange={(e) => onIzinkanAnonimCommit?.(e.target.checked)}
              aria-describedby="builder-izinkan-anonim-bantuan"
              className="w-5 h-5 mt-0.5 shrink-0 accent-primary disabled:cursor-not-allowed"
            />
            <span className="text-sm text-text-primary leading-relaxed">
              Izinkan pengisian <strong className="font-semibold">tanpa login</strong> (tautan/QR
              publik)
              {/* Keterangan ini WAJIB ada: admin yang menyalakan saklar berhak
                  tahu bahwa integritas hitungannya bertumpu pada kejujuran
                  responden, bukan pada penegakan sistem. */}
              <span
                id="builder-izinkan-anonim-bantuan"
                className="block mt-1 text-xs text-text-secondary font-normal"
              >
                Cocok untuk QR di loket layanan. Pengisian berulang hanya dicegah lewat penanda di
                peramban responden, bukan ditegakkan sistem.
              </span>
            </span>
          </label>

          {/* SURVEI UTAMA OPD (15 September 2026, permintaan pengguna).
              Sengaja TIDAK terikat `isEditableMeta`: penunjukan survei utama
              bukan penyuntingan isi survei, dan OPD tetap berhak memindahkannya
              ke survei lain kapan pun -- termasuk saat survei ini sudah punya
              jawaban. */}
          <label
            htmlFor="builder-survei-utama"
            className="mt-sm flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-container-low/60 text-left transition-colors cursor-pointer hover:bg-surface-container-low has-[:checked]:border-primary has-[:checked]:bg-primary-container/20"
          >
            <input
              id="builder-survei-utama"
              type="checkbox"
              checked={isUtama}
              onChange={(e) => onIsUtamaCommit?.(e.target.checked)}
              aria-describedby="builder-survei-utama-bantuan"
              className="w-5 h-5 mt-0.5 shrink-0 accent-primary"
            />
            <span className="text-sm text-text-primary leading-relaxed">
              Jadikan <strong className="font-semibold">survei utama</strong> OPD ini
              <span
                id="builder-survei-utama-bantuan"
                className="block mt-1 text-xs text-text-secondary font-normal"
              >
                Warga yang selesai mengirim pengaduan ke OPD ini langsung dibawa ke survei ini. Tiap
                OPD hanya punya satu; menyalakannya di sini melepasnya dari survei yang sebelumnya.
                Pengarahannya baru berjalan setelah survei ini terbit.
              </span>
            </span>
          </label>
        </div>

        {/* Questions List */}
        <div className="flex flex-col">
          {questions.map((q, index) => (
            <div key={q.id} onDragOver={handleDragOverCard(index)}>
              <DropIndicator active={overSlot === index} />
              <QuestionBlock
                question={q}
                index={index}
                total={questions.length}
                isDragging={drag?.kind === 'reorder' && drag.index === index}
                canReorder={canReorder}
                alasanTerkunci={alasanTerkunci}
                onDragStart={onQuestionDragStart}
                onDragEnd={handleDragEnd}
                onMove={onMove}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onTextCommit={onTextCommit}
                onEditOptions={onEditOptions}
              />
            </div>
          ))}
        </div>

        {/* Slot terakhir + tombol tambah cepat. Klik tetap berfungsi seperti
            sebelumnya; melepas komponen dari bilah sisi ke sini menaruhnya di
            akhir daftar. */}
        <div onDragOver={handleDragOverTail}>
          <DropIndicator active={overSlot === questions.length} />
          <div
            onClick={onAdd}
            className={`border-2 border-dashed rounded-xl p-xl md:p-2xl flex flex-col items-center justify-center gap-md text-text-secondary transition-all cursor-pointer group mt-md ${
              isDraggingSomething
                ? 'border-primary bg-primary-container/10'
                : 'border-border hover:border-primary-container hover:bg-primary-container/5'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="text-label-md font-label-md text-center">
              {isDraggingSomething
                ? 'Lepas di sini untuk menaruh di akhir daftar'
                : 'Klik di sini untuk menambah pertanyaan skala 1-4'}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
