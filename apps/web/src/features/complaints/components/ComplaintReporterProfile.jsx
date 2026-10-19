import React from 'react';
import { User, IdCard, Phone, MapPin } from 'lucide-react';

/**
 * Kartu "Profil Pelapor" pada detail pengaduan.
 *
 * MEDAN KOSONG DISEMBUNYIKAN, TIDAK DIBERI STRIP (1 Oktober 2026). Kartu
 * inilah yang melahirkan laporan pengguna: NIK, No. Telepon, dan Alamat
 * memajang '-' terus-menerus, bukan karena datanya rusak melainkan karena
 * sumbernya memang tak ada. Deretan tanda hubung itu terbaca sebagai aplikasi
 * yang gagal memuat sesuatu.
 *
 * Sumbernya kini ADA -- ketiga kolom `users` diisi dari klaim SSO Helpdesk saat
 * login (lihat apps/api sso-identitas.mapper.ts). Tetapi SSO melayani ASN
 * maupun warga umum, dan tak satu pun medan ini dijamin terisi, sehingga
 * KEKOSONGAN TETAP MENJADI KEADAAN NORMAL. Karena itu yang kosong hilang dari
 * tampilan alih-alih diberi tanda. Pola yang sama dipakai SurveyRespondentCard.
 *
 * String kosong diperlakukan sama dengan null: respons Helpdesk sungguhan
 * memakai `''` untuk sebagian medan dan `null` untuk sebagian lain dalam satu
 * payload, dan keduanya menyatakan hal yang sama.
 */
function Medan({ ikon: Ikon, kelasIkon, label, nilai, kelasNilai }) {
  if (!nilai) return null;

  return (
    <div className="flex gap-4 items-start">
      <div className={`p-2 rounded-lg mt-0.5 ${kelasIkon}`}>
        <Ikon size={18} />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
          {label}
        </span>
        <span className={kelasNilai}>{nilai}</span>
      </div>
    </div>
  );
}

export default function ComplaintReporterProfile({ reporter }) {
  if (!reporter) return null;

  const adaIsinya = Boolean(reporter.name || reporter.nik || reporter.phone || reporter.address);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* Header section */}
      <div className="bg-slate-50/80 p-lg border-b border-border/50 flex items-center justify-between">
        <h3 className="font-h3 text-h3 text-slate-800 font-bold">Profil Pelapor</h3>
        <div className="p-2 bg-white rounded-xl shadow-sm text-primary border border-slate-100">
          <User size={20} strokeWidth={2.5} />
        </div>
      </div>

      {/* Details section */}
      <div className="p-lg space-y-5">
        <Medan
          ikon={User}
          kelasIkon="bg-blue-50 text-blue-600"
          label="Nama Lengkap"
          nilai={reporter.name}
          kelasNilai="text-sm font-semibold text-slate-800 break-words"
        />
        {/* Gaya nilainya SAMA dengan No. Telepon & Alamat (1 Oktober 2026,
            permintaan pengguna). Sebelumnya NIK sendirian memakai `font-mono`
            di atas latar kotak abu berbingkai, dan perbedaan itu membuat satu
            baris tampak sebagai kode yang berbeda jenisnya dari tetangganya --
            padahal ketiganya sama-sama satu medan data diri. */}
        <Medan
          ikon={IdCard}
          kelasIkon="bg-indigo-50 text-indigo-600"
          label="NIK"
          nilai={reporter.nik}
          kelasNilai="text-sm font-medium text-slate-700"
        />
        <Medan
          ikon={Phone}
          kelasIkon="bg-emerald-50 text-emerald-600"
          label="No. Telepon"
          nilai={reporter.phone}
          kelasNilai="text-sm font-medium text-slate-700"
        />
        {/* `break-words` BUKAN hiasan: alamat sungguhan dari Helpdesk yang
            diukur panjangnya 84 aksara ("Dusun ... RT.004/RW.001 Kecamatan ...
            Kabupaten ... Jawa Timur"), sementara kartu ini berdiri di kolom
            samping yang sempit. Sebelum ini medannya selalu '-' sehingga
            panjangnya tak pernah teruji. */}
        <Medan
          ikon={MapPin}
          kelasIkon="bg-orange-50 text-orange-600"
          label="Alamat"
          nilai={reporter.address}
          kelasNilai="text-sm font-medium text-slate-700 leading-relaxed break-words"
        />

        {/* DIKATAKAN, bukan dibiarkan kosong. Tanpa baris ini kartu yang
            seluruh medannya kosong hanya menyisakan judulnya, dan ruang kosong
            di bawah judul terbaca sebagai pemuatan yang belum selesai. */}
        {!adaIsinya && (
          <p className="text-sm text-slate-500 leading-relaxed">
            Helpdesk tidak mengirimkan data profil untuk akun pelapor ini.
          </p>
        )}
      </div>
    </section>
  );
}
