'use client';

import React, { useState, useRef } from 'react';
import { Paperclip, Send, CheckCircle, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Textarea from '@/components/ui/Textarea';
import TemplatePesanPicker from './TemplatePesanPicker';
import { TEMPLATE_WARGA, gabungPesan } from '@/features/complaints/adapters/templatePesan';

export default function ChatReplyForm({ onSubmit, nomorTiket }) {
  const [reply, setReply] = useState('');
  const [file, setFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const kirim = async () => {
    // Boleh kirim lampiran saja tanpa teks (2026-08-06, laporan bug user
    // "kirim foto tanpa teks tidak terkirim") -- backend (CreateReplyDto)
    // kini terima salah satu (pesan/lampiran), bukan wajib keduanya.
    if ((!reply.trim() && !file) || !onSubmit) return;
    // Enter dapat ditekan berkali-kali jauh lebih cepat daripada tombol dapat
    // diklik, jadi penjagaan ini bukan pengulangan dari `disabled` tombolnya.
    if (isSending) return;
    setIsSending(true);
    try {
      await onSubmit(reply, file);
      setReply('');
      removeFile();
    } catch {
      // Teks SENGAJA tak dihapus supaya pengguna bisa coba lagi -- pesan
      // error ditampilkan oleh ComplaintChatSection.jsx.
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    kirim();
  };

  /**
   * TIDAK berlaku pada peranti sentuh: papan ketik layar tak punya Shift+Enter,
   * sehingga Enter-mengirim membuat tanggapan berparagraf mustahil ditulis dari
   * ponsel. Penjagaan yang sama dipakai AdminResolutionWorkspace.jsx.
   */
  const enterMengirim = () => !window.matchMedia?.('(pointer: coarse)')?.matches;

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    // Papan ketik beraksara majemuk memakai Enter untuk MEMILIH calon aksara.
    // Tanpa penjagaan ini, pemilihan itu ikut mengirim pesan yang belum jadi.
    // `keyCode 229` adalah penanda peramban lama untuk keadaan yang sama.
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return;
    if (!enterMengirim()) return;
    e.preventDefault();
    kirim();
  };

  return (
    /* Bantalan mengikuti TINGGI jendela -- lihat catatan yang sama di
         ChatHeader. */
    <div className="p-3 [@media(min-height:800px)]:p-6 bg-surface border-t border-border">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Di ATAS kotak: barisnya sudah penuh oleh kotak teks, klip, dan
            tombol kirim, dan menambah satu tombol lagi di sana akan menyempitkan
            kotak teks justru di layar yang paling sempit. */}
        <TemplatePesanPicker
          templates={TEMPLATE_WARGA}
          nomorTiket={nomorTiket}
          onPilih={(teks) => setReply((sekarang) => gabungPesan(sekarang, teks))}
          className="self-start"
        />
        {file && (
          <div className="p-2.5 mb-1 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-600 shrink-0">
                <CheckCircle size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-800 truncate">{file.name}</p>
                <p className="text-[10px] text-emerald-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={removeFile}
              className="text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-100 rounded-md transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex flex-row items-center gap-3 sm:gap-4">
          <div className="flex-grow">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 md:p-4 border border-border rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none resize-none transition-all text-body-md"
              placeholder="Tulis tanggapan Anda di sini..."
              rows={1}
              style={{ minHeight: '52px' }}
            />
          </div>
          {/* Tombol ini TAK PERNAH punya nama, di lebar berapa pun: isinya hanya
              ikon klip. Nama di tombolnyalah yang dibutuhkan, bukan pada
              inputnya: input tetap `hidden`, dan pemakai keyboard menekan Enter
              di tombol ini yang lalu membuka pemilih berkas lewat `onClick`.

              Inputnya dipindah keluar menjadi saudara (21 September 2026):
              elemen interaktif bersarang di dalam `<button>` bukan HTML yang
              sah, dan penamaan tombol justru bekerja di atas isinya. */}
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <IconButton
            className="text-text-secondary hover:text-primary transition-colors p-2 shrink-0 relative"
            type="button"
            aria-label="Lampirkan Dokumen/Foto"
            title="Lampirkan Dokumen/Foto"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={24} aria-hidden="true" />
          </IconButton>
          {/* Nama yang dapat diakses: lihat catatan di SurveyFilterBar. */}
          <Button
            type="submit"
            variant="primary"
            aria-label={isSending ? 'Mengirim...' : 'Kirim Pesan'}
            title={isSending ? 'Mengirim...' : 'Kirim Pesan'}
            className="w-[52px] h-[52px] !p-0 sm:w-auto sm:!px-6 rounded-full sm:!rounded-xl font-bold flex items-center justify-center sm:gap-2 whitespace-nowrap shrink-0 transition-all"
            disabled={(!reply.trim() && !file) || isSending}
          >
            <span className="hidden sm:inline">{isSending ? 'Mengirim...' : 'Kirim Pesan'}</span>
            <Send size={20} aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}
