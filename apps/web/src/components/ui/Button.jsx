import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) {
  // Gaya nonaktif (2026-08-27): sebelumnya tombol `disabled` tampak PERSIS sama
  // dengan yang aktif -- masih meninggi & berbayang saat disorot, padahal tak
  // bisa diklik. Semua utilitas di bawah hanya berlaku saat `disabled`, jadi
  // penampilan tombol normal tak berubah sedikit pun.
  const baseClasses =
    'transition-all active:scale-[0.98] flex items-center gap-xs ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ' +
    'disabled:hover:translate-y-0 disabled:active:scale-100';
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-on-primary py-md px-lg rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 shadow-primary/30 transition-all duration-300 font-bold text-lg justify-center",
    "primary-box": "bg-primary hover:bg-primary-hover text-on-primary py-md px-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 shadow-primary/30 transition-all duration-300 font-bold text-lg justify-center",
    secondary: "bg-white text-primary py-sm px-md rounded-full font-bold text-sm hover:bg-primary-hover hover:text-white transition-all duration-300 flex items-center justify-center gap-xs border border-primary/20 hover:border-transparent hover:shadow-md",
    // Ukurannya sengaja sama dengan RegistrasiHelpdeskLink (14 September 2026,
    // permintaan pengguna): px-5/py-2.5 + font-bold menghasilkan tinggi 40px,
    // terukur di peramban. Keduanya kini berdampingan -- tombol masuk di hero
    // dan tombol registrasi di navbar -- dan beda tinggi 7px di antara dua pil
    // sejenis terbaca sebagai ketidaksengajaan.
    //
    // `leading-5` WAJIB ikut, dan itu temuan pengukuran: `text-label-md` cuma
    // menetapkan ukuran huruf, sehingga tinggi barisnya jatuh ke `normal`
    // (16,8px) sedangkan `text-sm` milik tombol registrasi membawa 20px.
    // Tanpa baris ini padding-nya sudah sama persis tapi tombolnya tetap
    // lebih pendek 3,2px.
    navLogin:
      "bg-primary hover:bg-primary-hover text-on-primary px-5 py-2.5 rounded-full font-label-md text-label-md font-bold leading-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
  };

  const variantClass = variants[variant] || variants.primary;

  return (
    <button 
      className={`${baseClasses} ${variantClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
