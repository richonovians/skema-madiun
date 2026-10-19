import React from 'react';
import Card from '@/components/ui/Card';
import { EyeOff, IdCard, Phone, User, Users } from 'lucide-react';

/**
 * Data diri pengisi pada halaman detail respons (1 Oktober 2026, laporan
 * pengguna: "data responden bukan anonim belum tampil ketika menjawab survei").
 *
 * KARTU TERPISAH dari "Informasi Survei", sebab keduanya menerangkan hal yang
 * berbeda: yang satu surveinya, yang ini orangnya. Pola yang sama sudah berdiri
 * pada detail pengaduan, tempat "Profil Pelapor" punya kartunya sendiri.
 *
 * MEDAN KOSONG DISEMBUNYIKAN, TIDAK DIBERI STRIP, dan itu bukan selera. Laporan
 * yang melahirkan pekerjaan ini bermula dari kartu "Profil Pelapor" pengaduan
 * yang memajang NIK, telepon, dan alamat sebagai '-' terus-menerus -- bukan
 * karena datanya rusak melainkan karena sumbernya memang tak ada. Deretan strip
 * itu terbaca sebagai aplikasi yang gagal memuat sesuatu, dan di sinilah
 * tempatnya tidak diulang.
 */
const LABEL_JENIS_KELAMIN = {
  laki_laki: 'Laki-laki',
  perempuan: 'Perempuan',
};

function Medan({ ikon: Ikon, warna, label, nilai }) {
  if (!nilai) return null;

  return (
    <div className="flex items-start gap-sm">
      <div className={`mt-1 shrink-0 ${warna}`}>
        <Ikon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wider text-on-surface-variant uppercase">
          {label}
        </p>
        <p className="text-sm font-medium break-words text-on-surface">{nilai}</p>
      </div>
    </div>
  );
}

export default function SurveyRespondentCard({ respondent }) {
  if (!respondent) return null;

  return (
    <Card className="p-lg">
      <h3 className="font-h3 text-h3 border-outline-variant mb-md pb-sm border-b text-on-surface">
        Data Pengisi
      </h3>

      {respondent.isAnonim ? (
        /* DIKATAKAN, bukan dikosongkan. Pengisi yang memilih anonim membuat
           keputusan yang dijamin kepadanya; petugas yang membuka halaman ini
           perlu tahu bahwa datanya TIDAK ADA KARENA DIPILIH BEGITU, bukan
           karena gagal dimuat. Keduanya terlihat sama bila ruangnya sekadar
           dibiarkan kosong. */
        <div className="flex items-start gap-sm">
          <div className="mt-1 shrink-0 text-on-surface-variant">
            <EyeOff size={18} />
          </div>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Pengisi memilih mengisi survei ini sebagai anonim, sehingga data dirinya tidak direkam
            bersama jawaban.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-4">
          <Medan ikon={User} warna="text-primary" label="Nama" nilai={respondent.name} />
          <Medan ikon={Phone} warna="text-emerald-500" label="No. Telepon" nilai={respondent.phone} />
          <Medan
            ikon={IdCard}
            warna="text-indigo-500"
            label="Jenis Kelamin"
            nilai={LABEL_JENIS_KELAMIN[respondent.gender] ?? respondent.gender}
          />
          <Medan
            ikon={Users}
            warna="text-orange-500"
            label="Kelompok Umur"
            nilai={respondent.ageGroup}
          />
        </div>
      )}
    </Card>
  );
}
