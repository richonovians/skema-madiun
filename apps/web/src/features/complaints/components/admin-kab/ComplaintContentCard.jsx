import React from 'react';
import { AlignLeft } from 'lucide-react';

/**
 * Blok "Kronologi Kejadian" DIHAPUS -- backend tak punya konsep ini sama sekali (cuma judul+uraian).
 *
 * JUDUL DAN URAIAN DIPISAH (permintaan pengguna 22 September 2026). Sebelum ini
 * judul pengaduan tak muncul sama sekali di halaman warga maupun Admin OPD:
 * halaman warga memakai nomor tiket sebagai kepala besar, dan halaman Admin OPD
 * tak menampilkan apa pun. Percobaan pertama membuat judulnya MENGGANTIKAN label
 * "Deskripsi Laporan", dan itu dibatalkan penggunanya: yang dicari adalah dua
 * hal yang dapat dibedakan sekilas, bukan satu blok tulisan yang harus dibaca
 * dulu untuk tahu mana judul dan mana uraian.
 *
 * Diletakkan DI SINI karena kartu ini dipakai ketiga halaman sekaligus -- warga,
 * Admin OPD, dan Admin Kabupaten. Menambahkannya per halaman berarti satu
 * halaman akan tertinggal tanpa ada yang menyadarinya.
 *
 * Sejak judulnya bertempat di sini, kepala halaman Admin Kabupaten tak lagi
 * mencetaknya di bawah nomor tiket: di sana ia hanya mengulang apa yang terbaca
 * beberapa sentimeter di bawahnya.
 */
function Label({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{children}</h3>
  );
}

export default function ComplaintContentCard({ complaint }) {
  const adaJudul = Boolean(complaint.title);

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <AlignLeft size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Isi Pengaduan</h2>
      </div>

      <div className="p-lg space-y-lg">
        {/* Pengaduan lama yang judulnya tak terbawa data TIDAK menyisakan label
            menggantung tanpa isi: seluruh bloknya yang tak dirender. */}
        {adaJudul && (
          <section>
            <Label>Judul Pengaduan</Label>
            {/* `break-words`: judul boleh berisi satu kata panjang tanpa spasi
                (tautan, nomor berkas), dan di layar sempit kata itu akan
                mendorong kartunya keluar layar kalau dibiarkan utuh. */}
            <p className="text-title-md font-bold text-slate-900 leading-snug break-words">
              {complaint.title}
            </p>
          </section>
        )}

        <section className={adaJudul ? 'pt-lg border-t border-outline-variant' : undefined}>
          <Label>Uraian Detail Kejadian</Label>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
            {complaint.description || 'Tidak ada deskripsi yang diberikan oleh pelapor.'}
          </div>
        </section>
      </div>
    </div>
  );
}
