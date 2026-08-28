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
    navLogin: "bg-primary hover:bg-primary-hover text-on-primary px-lg py-sm rounded-full font-label-md text-label-md shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300",
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
