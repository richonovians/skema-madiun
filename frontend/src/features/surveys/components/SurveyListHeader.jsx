import React from 'react';

export default function SurveyListHeader() {
  return (
    <header className="mb-8 md:mb-10 text-center md:text-left">
      <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight mb-3">
        Daftar Survei Kepuasan Masyarakat
      </h1>
      <p className="text-text-secondary text-sm md:text-base leading-relaxed md:w-3/4 lg:w-2/3 mx-auto md:mx-0">
        Berikan penilaian Anda terhadap kualitas layanan publik di Kabupaten Madiun untuk membantu kami meningkatkan kualitas pelayanan.
      </p>
    </header>
  );
}
