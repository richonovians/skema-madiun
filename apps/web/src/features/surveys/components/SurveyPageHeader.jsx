import React from 'react';

export default function SurveyPageHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md mb-xl">
      <div>
        <h1 className="font-h1 text-h1 text-text-primary tracking-tight">Paket Survei Kepuasan Masyarakat</h1>
        <p className="text-text-secondary font-body mt-2">Kelola seluruh instrumen survei unit layanan di bawah naungan OPD Anda.</p>
      </div>
    </div>
  );
}
