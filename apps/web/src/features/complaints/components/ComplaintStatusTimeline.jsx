import React from 'react';
import Badge from '@/components/ui/Badge';
import { ClipboardList } from 'lucide-react';
import { COMPLAINT_STATUS_BADGE_VARIANT } from '@/utils/enumLabels';

/**
 * Riwayat perjalanan satu pengaduan (4 November 2026, permintaan pengguna).
 *
 * BARIS PERISTIWA, bukan daftar tahap. Yang digambar hanya perpindahan yang
 * BENAR-BENAR tercatat, jadi pengaduan yang baru masuk hanya punya satu baris
 * -- "Pengaduan Terkirim" -- sementara lencananya sudah berbunyi "Menunggu
 * Verifikasi". Keduanya benar, dan perbedaannya disengaja: lencana menyatakan
 * keadaan sekarang, linimasa menyatakan apa yang sudah terjadi. Tahap yang
 * belum dilalui adalah urusan `ComplaintProgressStepper`.
 *
 * `label` datang JADI dari backend (`ComplaintStatusHistoryEntity.label`),
 * tidak diterjemahkan ulang di sini: riwayat dapat memuat status yang kelak
 * ditambahkan backend lebih dulu, dan satu baris tak berlabel merusak urutan
 * ceritanya jauh lebih parah daripada satu lencana tak berwarna.
 */

/**
 * Siapa yang memindahkan. `actorNama` `null` berarti SISTEM, bukan "tak
 * diketahui" -- lihat entitasnya. Baris warisan hasil migrasi juga jatuh ke
 * sini, dan itu jujur: alur lama memang tak pernah mencatat pelakunya.
 */
function pelaku(baris) {
  return baris.actorNama ?? 'Otomatis oleh sistem';
}

function waktuPanjang(iso) {
  if (!iso) return '';
  // `id-ID` menulis jamnya dengan titik ("09.15"), dan "WIB" ditambahkan
  // tersurat: `toLocaleString` memakai zona peramban, yang bagi pengguna di
  // Madiun memang WIB tetapi tak pernah menyebutkannya.
  return (
    new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB'
  );
}

export default function ComplaintStatusTimeline({ riwayat, currentStatus }) {
  const baris = riwayat ?? [];

  /**
   * "Catatan Petugas" = catatan dari perpindahan TERAKHIR yang membawanya
   * (keputusan pengguna 4 November 2026). Bukan medan tersendiri: datanya
   * sudah ada di riwayat, dan kolom kedua yang menyimpan kalimat yang sama
   * hanya menciptakan dua kebenaran yang dapat berbeda.
   *
   * Dicari dari BELAKANG: yang relevan bagi pembacanya adalah kalimat
   * terbaru, bukan kalimat pertama yang kebetulan ada.
   */
  const catatanTerakhir = [...baris].reverse().find((b) => b.catatan)?.catatan ?? null;

  return (
    <section className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center justify-between gap-3">
        <h2 className="text-title-md font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList size={18} aria-hidden="true" />
          Riwayat Status
        </h2>
        {currentStatus && (
          <Badge variant={COMPLAINT_STATUS_BADGE_VARIANT[currentStatus] ?? 'default'}>
            {currentStatus}
          </Badge>
        )}
      </div>

      <div className="p-lg">
        {baris.length === 0 ? (
          /* Tak pernah terjadi pada pengaduan yang dibuat sejak 4 November
             2026 -- barisnya lahir bersama tiketnya. Tetap digambar karena
             riwayat hanya ikut pada jalur DETAIL: pemanggil yang keliru
             memberinya data daftar akan melihat kalimat ini, bukan kotak
             kosong tanpa sebab. */
          <p className="text-sm text-text-secondary">
            Riwayat status pengaduan ini belum tersedia.
          </p>
        ) : (
          <ol className="relative space-y-5">
            {baris.map((item, index) => {
              const isLast = index === baris.length - 1;
              return (
                <li key={item.id ?? index} className="flex gap-4 relative">
                  <div className="shrink-0 flex flex-col items-center w-7 relative">
                    <span
                      className="w-7 h-7 rounded-full bg-primary-container text-primary text-xs font-bold flex items-center justify-center"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    {!isLast && (
                      <span className="w-[2px] flex-1 bg-outline-variant absolute top-7 bottom-[-20px] left-0 right-0 mx-auto"></span>
                    )}
                  </div>

                  <div className="pb-1 min-w-0">
                    <p className="font-bold text-text-primary">{item.label ?? item.status}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      <time dateTime={item.createdAt}>{waktuPanjang(item.createdAt)}</time>
                      {' · '}
                      {pelaku(item)}
                    </p>
                    {/* Instansi tujuan pengalihan (5 November 2026). Dibaca
                        dari BARISNYA SENDIRI, bukan dari `target` tiketnya:
                        yang itu hanya menyimpan pemilik TERAKHIR, sehingga
                        tiket yang dialihkan dua kali akan menampilkan tujuan
                        yang sama dua kali. `null` pada setiap baris yang bukan
                        pengalihan -- barisnya tak digambar sama sekali, bukan
                        digambar dengan tanda hubung. */}
                    {item.opdTujuanNama && (
                      <p className="text-sm font-semibold text-text-primary mt-1.5 break-words">
                        Dialihkan ke {item.opdTujuanNama}
                      </p>
                    )}
                    {item.catatan && (
                      // `break-words`: catatan boleh 1000 aksara dan diketik
                      // bebas, termasuk tautan panjang tanpa spasi.
                      <p className="text-sm text-text-primary mt-1.5 leading-relaxed break-words">
                        {item.catatan}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {catatanTerakhir && (
          <div className="mt-6 pt-5 border-t border-outline-variant">
            <h3 className="text-sm font-bold text-text-primary mb-1.5">Catatan Petugas</h3>
            <p className="text-sm text-text-secondary leading-relaxed break-words">
              {catatanTerakhir}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
