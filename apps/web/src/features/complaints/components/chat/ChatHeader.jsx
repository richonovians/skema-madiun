import React from 'react';
import Avatar from '@/components/ui/Avatar';
import AvatarGroup from '@/components/ui/AvatarGroup';

/**
 * JUDUL PENGADUAN DI KEPALA PERCAKAPAN (22 September 2026, permintaan pengguna).
 *
 * Kepala ini dulu selalu berbunyi "Riwayat Interaksi" dengan anak judul
 * "Diskusi aktif dengan petugas lapangan" -- dua kalimat yang sama persis pada
 * setiap tiket, sehingga ruang yang sudah terpakai itu tak memberi tahu apa
 * pun. Judul pengaduannya ditaruh di sini justru karena ruangnya SUDAH ada: ia
 * tak menambah tinggi panel, dan tinggi panel itulah yang sedang diperebutkan
 * pada layar sempit.
 *
 * `title` lama dipertahankan sebagai cadangan supaya pemanggil yang belum
 * meneruskan judul pengaduan tidak berubah tampilannya.
 */
export default function ChatHeader({
  judulPengaduan,
  title = 'Riwayat Interaksi',
  subtitle = 'Diskusi aktif dengan petugas lapangan',
  participants = [],
}) {
  const adaJudul = Boolean(judulPengaduan);

  return (
    /* Bantalan mengikuti TINGGI jendela: pada jendela pendek, kepala dan kolom
         tulis bersama-sama menyisakan kurang dari tiga gelembung. */
    <div className="p-3 [@media(min-height:800px)]:p-6 border-b border-border bg-surface-container-low flex items-center justify-between gap-3">
      {/* `min-w-0`: tanpa ini, judul panjang tanpa spasi menolak menyusut dan
          mendorong kumpulan avatar keluar dari kepala di layar sempit. */}
      <div className="min-w-0">
        {/* Baris label ini hiasan: ia mengatakan hal yang sama pada setiap
            tiket. Pada jendela pendek ia disembunyikan, dan tingginya
            dikembalikan kepada percakapan yang justru dicari orang. */}
        {adaJudul && (
          <p className="hidden [@media(min-height:800px)]:block text-label-md text-text-secondary uppercase tracking-wide">
            {title}
          </p>
        )}
        {/* Dipotong satu baris: judul pengaduan boleh sepanjang 255 karakter,
            dan kepala yang ikut memanjang merampas tinggi dari percakapannya
            sendiri. Judul utuhnya tetap terbaca pada kartu "Isi Pengaduan". */}
        <h2
          className="font-headline-md text-headline-md text-text-primary truncate"
          title={adaJudul ? judulPengaduan : undefined}
        >
          {adaJudul ? judulPengaduan : title}
        </h2>
        {!adaJudul && <p className="text-text-secondary text-label-md">{subtitle}</p>}
      </div>

      {participants.length > 0 && (
        <AvatarGroup>
          {participants.map((p, idx) => (
            <Avatar key={idx} initials={p.initials} variant={p.variant || 'primary'} />
          ))}
        </AvatarGroup>
      )}
    </div>
  );
}
