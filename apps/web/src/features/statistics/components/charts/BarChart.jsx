import React from 'react';

/**
 * `children` (7 Oktober 2026): isi tambahan di BAWAH deretan batang, di dalam
 * kartu yang sama. Dipakai halaman statistik publik untuk menyandingkan
 * sebaran status dengan daftar kategori, alih-alih meninggalkan bagian bawah
 * kartu kosong saat kartu tetangganya jauh lebih tinggi.
 *
 * Opsional, jadi seluruh pemakai lain tak berubah sama sekali.
 */
export default function BarChart({ data, title, children = null }) {
  // Find max value to calculate percentage width
  const maxCount = Math.max(...data.map(d => d.count), 1); // fallback to 1 to avoid div by 0

  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col h-full">
      <h3 className="text-lg font-bold text-text-primary mb-6">{title}</h3>
      
      <div className="flex flex-col gap-4">
        {data.map((item, index) => {
          const widthPercent = (item.count / maxCount) * 100;
          return (
            <div key={index} className="flex flex-col gap-1 group">
              {/* Label di sini pendek pada dashboard kabupaten ("Kurang",
                  "Baik", "Sangat Baik"), tapi komponen yang sama juga dipakai
                  untuk kategori pengaduan yang bisa jauh lebih panjang.
                  `min-w-0 truncate` + `shrink-0` menjaga angkanya tetap di
                  tempat alih-alih terdorong keluar layar sempit. */}
              <div className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium text-text-secondary group-hover:text-primary transition-colors" title={item.category || item.label}>
                  {item.category || item.label}
                </span>
                <span className="shrink-0 font-bold text-text-primary">{item.count || `${item.percentage}%`}</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${item.percentage || widthPercent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Jarak TETAP, bukan margin otomatis. Dorongan ke dasar kartu sempat
          dipakai agar isi tambahan ini merapat ke bawah kartu yang diregangkan,
          dan itu tidak menghilangkan ruang kosongnya -- hanya memindahkannya ke
          atas garis pemisah, di mana ia terlihat sama kosongnya (laporan
          pengguna, 7 Oktober 2026). Peregangannya sendiri yang dihentikan,
          lewat `items-start` pada grid pemanggilnya. */}
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}
