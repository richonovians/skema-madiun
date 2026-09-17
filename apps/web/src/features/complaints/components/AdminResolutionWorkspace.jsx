'use client';
import React, { useState, useEffect, useRef } from 'react';
import { User, Headset, Paperclip, CheckCircle, X, FileText, AlertTriangle } from 'lucide-react';
import ImageViewer from '@/components/ui/ImageViewer';
import TemplatePesanPicker from './chat/TemplatePesanPicker';
import { TEMPLATE_ADMIN, gabungPesan } from '@/features/complaints/adapters/templatePesan';

export default function AdminResolutionWorkspace({ currentStatus, chatHistory = [], nomorTiket, onSendUpdate, onCloseTicket }) {
  const [replyText, setReplyText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [sedangMengirim, setSedangMengirim] = useState(false);
  const [galatKirim, setGalatKirim] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  /**
   * Enter mengirim, Shift+Enter menyisipkan baris baru.
   *
   * TIDAK berlaku pada peranti sentuh: papan ketik layar tak punya Shift+Enter,
   * sehingga Enter-mengirim akan membuat balasan berparagraf mustahil ditulis
   * dari ponsel -- padahal di sana tombol Kirim Pesan sudah selebar layar.
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
    handleSend();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderAttachments = (attachments = []) => {
    if (!attachments.length) return null;
    const images = attachments.filter((a) => a.mimeType?.startsWith('image/'));
    const documents = attachments.filter((a) => !a.mimeType?.startsWith('image/'));
    return (
      <>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2 max-w-[200px]">
            {images.map((img) => (
              <ImageViewer key={img.id} src={img.url} alt={img.alt} className="aspect-square" />
            ))}
          </div>
        )}
        {documents.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-primary underline underline-offset-2"
              >
                <FileText size={14} className="flex-shrink-0" />
                <span className="truncate">{doc.alt}</span>
              </a>
            ))}
          </div>
        )}
      </>
    );
  };

  const handleSend = async () => {
    if (sedangMengirim) return;
    if (!replyText.trim() && !attachedFile) return;
    setGalatKirim(null);
    setSedangMengirim(true);
    try {
      await onSendUpdate(replyText, attachedFile);
      setReplyText('');
      removeFile();
    } catch (err) {
      // Teks SENGAJA dibiarkan utuh: tulisan admin adalah satu-satunya
      // salinan yang ada, dan mengosongkannya saat pengiriman gagal berarti
      // membuangnya. Sebabnya ditampilkan di sini, bukan di puncak halaman,
      // karena di sinilah admin sedang melihat.
      setGalatKirim(err?.message || 'Pesan gagal terkirim. Coba lagi.');
    } finally {
      setSedangMengirim(false);
    }
  };

  // Tinggi 750px TETAP diganti tinggi relatif viewport (2026-08-20): di ponsel
  // (area pandang ~600px) panel setinggi 750px selalu lebih tinggi dari layar,
  // sehingga riwayat chat DAN halaman ikut bergulir bersamaan -- kolom balasan di
  // bawah pun terdorong keluar pandangan. `min-h` menjaga panel tetap layak di
  // layar sangat pendek, dan pada layar besar tingginya kembali seperti semula.
  // Wadah `flex flex-col` + `flex-1 overflow-y-auto` pada riwayat sudah menangani
  // sisanya.
  return (
    <div className="bg-surface rounded-xl shadow-2xl border border-border flex flex-col h-[70vh] min-h-[420px] lg:h-[750px]">
      
      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 p-md sm:p-lg overflow-y-auto space-y-lg scrollbar-hide bg-slate-50/50">
        {chatHistory.map((msg, idx) => (
          msg.role === 'admin' ? (
            <div key={idx} className="flex items-start gap-md max-w-[85%] ml-auto flex-row-reverse">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
                <Headset size={20} className="text-white" />
              </div>
              <div className="space-y-xs text-right">
                <div className="bg-primary-container text-on-primary-container p-md rounded-2xl rounded-tr-none shadow-sm text-left">
                  {msg.text && <p className="font-body-md text-body-md leading-relaxed">{msg.text}</p>}
                  {renderAttachments(msg.attachments)}
                </div>
                <span className="text-[11px] text-text-secondary pr-1">{msg.timestamp}</span>
              </div>
            </div>
          ) : (
            <div key={idx} className="flex items-start gap-md max-w-[85%]">
              <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center flex-shrink-0 border border-outline-variant">
                <User size={20} className="text-on-surface-variant" />
              </div>
              <div className="space-y-xs">
                {/* Label pengirim untuk pihak-lawan. Gelembung ini SEBELUMNYA tak
                    pernah menampilkan nama sama sekali, sehingga balasan pelapor
                    anonim akan tampak seolah ditulis pihak yang tak dikenal. */}
                {msg.senderName && (
                  <span className="block text-label-md font-bold text-text-secondary">
                    {msg.senderName}
                  </span>
                )}
                <div className="bg-white border border-border p-md rounded-2xl rounded-tl-none shadow-sm">
                  {msg.text && (
                    <p className="font-body-md text-body-md text-text-primary leading-relaxed">{msg.text}</p>
                  )}
                  {renderAttachments(msg.attachments)}
                </div>
                <span className="text-[11px] text-text-secondary pl-1">{msg.timestamp}</span>
              </div>
            </div>
          )
        ))}

        <div className="flex items-center gap-md py-md">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[3px]">Ruang Solusi Aktif</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>
      </div>

      {/* Response Editor */}
      <div className="p-md sm:p-lg border-t border-border bg-white rounded-b-xl">
        {/* File Attachment Preview */}
        {attachedFile && (
          <div className="mb-3">
            <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-2 sm:pr-4 rounded-lg">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                <Paperclip size={18} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-emerald-800 truncate max-w-[200px]">{attachedFile.name}</span>
                <span className="text-xs text-emerald-600">{(attachedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button 
                type="button"
                onClick={removeFile}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-200 text-emerald-600 transition-colors ml-2 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="relative mb-lg">
          <textarea 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[128px] sm:min-h-[160px] p-md sm:p-lg pb-14 border border-outline-variant rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none font-body-md text-body-md" 
            placeholder="Tulis jawaban solusi atau update status di sini..."
          />
          <div className="absolute bottom-md left-md flex items-center gap-sm">
            <TemplatePesanPicker
              templates={TEMPLATE_ADMIN}
              nomorTiket={nomorTiket}
              onPilih={(teks) => setReplyText((sekarang) => gabungPesan(sekarang, teks))}
            />
            <label className="p-sm text-on-surface-variant hover:bg-surface-variant/50 rounded-lg transition-colors flex items-center gap-xs cursor-pointer">
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Paperclip size={20} />
              <span className="text-label-md hidden sm:inline">Lampirkan Dokumen/Foto</span>
            </label>
          </div>
          {/* Hanya pada layar lebar: di peranti sentuh Enter memang menyisipkan
              baris baru, jadi petunjuk ini akan menyesatkan di sana. */}
          <span className="hidden sm:block absolute bottom-md right-md text-xs text-text-secondary">
            Enter untuk mengirim, Shift + Enter baris baru
          </span>
        </div>

        {galatKirim && (
          <div className="mb-md flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium">{galatKirim}</p>
          </div>
        )}

        {/* Menutup tiket dipisahkan dari mengirim pesan (11 September 2026,
            laporan salah klik). Sebelumnya tombol penutup tiket-lah yang paling
            menonjol -- hijau terisi, di ujung kanan, tempat kursor mendarat --
            padahal ia jarang ditekan dan tak dapat dibatalkan, sementara
            tindakan sehari-harinya justru tampil pucat di sebelahnya.
            Bobotnya kini ditukar: yang sering ditekan menjadi tombol utama di
            kanan, yang menutup tiket turun menjadi garis tepi dan didorong ke
            ujung kiri. Di layar sempit keduanya bertumpuk, dan urutan ini
            menaruh tombol penutup tiket di posisi terjauh dari ibu jari. */}
        <div className="flex flex-col sm:flex-row sm:justify-end items-center gap-md">
          {currentStatus === 'Diproses' && (
            <button
              onClick={onCloseTicket}
              className="w-full sm:w-auto sm:mr-auto px-md sm:px-lg py-3 rounded-lg border border-green-600/50 text-green-700 font-bold whitespace-nowrap hover:bg-green-50 transition-all active:scale-95 flex items-center justify-center gap-sm"
            >
              <CheckCircle size={20} className="hidden sm:block" />
              Selesaikan Pengaduan
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={sedangMengirim}
            className="w-full sm:w-auto px-md sm:px-lg py-3 rounded-lg bg-primary text-white font-bold whitespace-nowrap shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {sedangMengirim ? 'Mengirim...' : 'Kirim Pesan'}
          </button>
        </div>
      </div>
    </div>
  );
}
