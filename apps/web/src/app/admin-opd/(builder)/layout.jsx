import React from 'react';

export default function BuilderLayout({ children }) {
  return (
    /* `md:overflow-hidden`, bukan tanpa syarat (16 September 2026). Elemen
       ber-`overflow` selain `visible` menjadi wadah gulir bagi keturunan
       `sticky`-nya; karena kotak ini tak pernah digulir -- yang digulir dokumen
       -- bilah "Tambah Pertanyaan" tak punya tempat menempel dan ikut hanyut.
       Terukur pada 360px sesudah halaman digulir 1200px: tombolnya di y=-1040
       dengan penjepit ini, y=80 tanpanya. Mulai `md` builder kembali menjadi
       lapisan `fixed` layar-penuh dan penjepitnya memang dibutuhkan lagi. */
    <div className="bg-background font-body text-text-primary md:overflow-hidden min-h-screen">
      {children}
    </div>
  );
}
