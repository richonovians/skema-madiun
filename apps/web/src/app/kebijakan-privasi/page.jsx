import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Kebijakan Privasi — SKEMA Madiun',
  description:
    'Bagaimana SKEMA Madiun mengumpulkan, memakai, menyimpan, dan melindungi data pribadi warga.',
};

export const ALAMAT_PDP = 'diskominfo@madiunkab.go.id';

/**
 * Kebijakan privasi (25 September 2026).
 *
 * KENAPA ADA. Gerbang persetujuan (ConsentGate.jsx) sudah memuat empat butir
 * yang substantif, tetapi teksnya HANYA muncul di gerbang. Warga yang sudah
 * menyetujui tak punya cara membacanya lagi, dan tak ada alamat yang dapat
 * ditaut dari footer maupun dirujuk saat ada sengketa.
 *
 * ISINYA DITARIK DARI SKEMA, BUKAN DARI TEMPLAT. Setiap medan yang disebut di
 * bawah dicocokkan ke prisma/schema.prisma: users, respondent_profiles,
 * survey_responses, complaints, complaint_replies, audit_logs.
 *
 * ANGKA MASA SIMPAN ADALAH USULAN, dan penandanya bukan hiasan. Tak seorang pun
 * pernah menetapkannya. Menerbitkan angka tanpa penanda membuat Pemerintah
 * Kabupaten Madiun menyatakan sesuatu yang tak pernah diputuskannya. Uji di
 * __tests__/page.test.jsx memerah bila penanda itu hilang.
 *
 * BAGIAN KEAMANAN SENGAJA TIDAK DIBAGUSKAN. Yang terenkripsi hanya lampiran,
 * `complaints.uraian`, dan `complaint_replies.pesan`; identitas pelapor tidak.
 * Klaim berlebih di halaman hukum lebih buruk daripada tak mengklaim apa pun.
 */
const DATA_DIKUMPULKAN = [
  {
    kelompok: 'Identitas akun',
    isi: 'Nama, alamat surel, dan pengenal akun dari Helpdesk Kabupaten Madiun. Diperoleh saat Anda masuk, bukan diisi ulang di sini.',
  },
  {
    kelompok: 'Data demografis',
    isi: 'Jenis kelamin, kelompok umur, pendidikan, dan pekerjaan. Anda isi sendiri, dan dipakai untuk memilah hasil survei.',
  },
  {
    kelompok: 'Isi survei',
    isi: 'Jawaban Anda atas pertanyaan survei, serta nama dan nomor telepon bila Anda memilih mengisinya. Keduanya tidak wajib.',
  },
  {
    kelompok: 'Isi pengaduan',
    isi: 'Judul, uraian, lampiran yang Anda unggah, dan seluruh percakapan tindak lanjut dengan petugas.',
  },
  {
    kelompok: 'Catatan aktivitas',
    isi: 'Tindakan petugas atas data Anda beserta waktunya. Disimpan untuk pertanggungjawaban, dan tidak dapat diubah maupun dihapus petugas.',
  },
];

const MASA_SIMPAN = [
  { data: 'Pengaduan, lampiran, dan percakapannya', usulan: '5 tahun sejak pengaduan selesai' },
  { data: 'Respons survei beserta identitas pengisinya', usulan: '2 tahun sejak dikirim' },
  { data: 'Data demografis responden', usulan: 'Selama akun aktif, lalu 1 tahun' },
  { data: 'Catatan aktivitas petugas', usulan: '5 tahun sejak dicatat' },
  { data: 'Akun yang sudah tidak dipakai', usulan: '2 tahun sejak dinonaktifkan' },
];

const HAK = [
  'Meminta salinan data pribadi Anda yang kami simpan.',
  'Meminta perbaikan data yang keliru atau tidak lengkap.',
  'Meminta penghapusan data, sepanjang tidak sedang diperlukan untuk menindaklanjuti pengaduan yang berjalan atau diwajibkan peraturan.',
  'Menarik persetujuan yang pernah Anda berikan, kapan saja.',
  'Mengajukan keberatan atas cara data Anda diproses.',
];

function Bagian({ judul, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-headline-sm font-headline-sm text-text-primary mb-3">{judul}</h2>
      <div className="space-y-3 text-body-md font-body-md text-text-secondary leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function KebijakanPrivasi() {
  return (
    <main className="flex-1">
      <article className="mx-auto w-full max-w-[760px] px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-headline-lg font-headline-lg text-text-primary leading-tight">
          Kebijakan Privasi
        </h1>
        <p className="mt-3 text-body-md font-body-md text-text-secondary leading-relaxed">
          Halaman ini menjelaskan data pribadi apa yang dikumpulkan SKEMA Madiun, untuk apa
          dipakai, berapa lama disimpan, dan hak apa yang Anda miliki atasnya.
        </p>

        <Bagian judul="Pengendali data">
          <p>
            Pengendali data pribadi dalam layanan ini adalah Dinas Komunikasi dan Informatika
            Kabupaten Madiun, bersama Organisasi Perangkat Daerah yang menerima pengaduan atau
            menyelenggarakan survei Anda.
          </p>
          <p>
            Pertanyaan mengenai kebijakan ini dapat dikirim ke{' '}
            <a className="text-primary underline underline-offset-4" href={`mailto:${ALAMAT_PDP}`}>
              {ALAMAT_PDP}
            </a>
            .
          </p>
        </Bagian>

        <Bagian judul="Data yang kami kumpulkan">
          <dl className="space-y-4">
            {DATA_DIKUMPULKAN.map(({ kelompok, isi }) => (
              <div key={kelompok}>
                <dt className="font-semibold text-text-primary">{kelompok}</dt>
                <dd className="mt-0.5">{isi}</dd>
              </div>
            ))}
          </dl>
        </Bagian>

        <Bagian judul="Tujuan pemrosesan">
          <p>
            Data survei dipakai untuk menghitung Indeks Kepuasan Masyarakat dan memperbaiki mutu
            pelayanan. Hasilnya ditampilkan kepada petugas dalam bentuk gabungan, tanpa
            mengidentifikasi Anda.
          </p>
          <p>
            Data pengaduan dipakai untuk menyalurkan aduan Anda ke OPD yang berwenang,
            menindaklanjutinya, dan memberi tahu Anda perkembangannya.
          </p>
          <p>
            Data Anda tidak diperjualbelikan, tidak dipakai untuk iklan, dan tidak dibagikan ke
            pihak di luar Pemerintah Kabupaten Madiun kecuali diwajibkan peraturan
            perundang-undangan.
          </p>
        </Bagian>

        <Bagian judul="Dasar hukum pemrosesan">
          <p>
            Pemrosesan dilakukan berdasarkan persetujuan yang Anda berikan sebelum mengirim survei
            atau pengaduan, serta dalam rangka pelaksanaan tugas pelayanan publik, sebagaimana
            diatur Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
          </p>
        </Bagian>

        <Bagian judul="Siapa yang dapat mengakses">
          <p>
            Pengaduan Anda dapat dilihat petugas OPD tujuan dan Admin Kabupaten, sebatas yang
            diperlukan untuk menindaklanjuti. Setiap akses petugas atas data Anda tercatat beserta
            waktunya.
          </p>
        </Bagian>

        <Bagian judul="Masa simpan">
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-text-primary">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
            <p className="text-body-sm font-body-md leading-relaxed">
              Masa simpan di bawah ini <strong className="font-semibold">belum ditetapkan</strong>{' '}
              secara resmi. Angkanya masih berupa usulan yang menunggu penetapan Diskominfo
              Kabupaten Madiun, dan dicantumkan di sini supaya dapat ditinjau secara terbuka, bukan
              karena sudah berlaku.
            </p>
          </div>

          <table className="w-full mt-4 text-left text-body-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 font-semibold text-text-primary">
                  Data
                </th>
                <th scope="col" className="py-2 font-semibold text-text-primary">
                  Usulan masa simpan
                </th>
              </tr>
            </thead>
            <tbody>
              {MASA_SIMPAN.map(({ data, usulan }) => (
                <tr key={data} className="border-b border-border/60 align-top">
                  <td className="py-2.5 pr-4">{data}</td>
                  <td className="py-2.5">{usulan}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p>
            Selama masa simpan belum ditetapkan, data tidak dihapus otomatis. Anda tetap dapat
            meminta penghapusan lebih awal lewat alamat di bawah.
          </p>
        </Bagian>

        <Bagian judul="Keamanan">
          <p>
            Lampiran pengaduan, uraian pengaduan, dan isi percakapan tindak lanjut disimpan dalam
            keadaan terenkripsi. Sambungan ke layanan ini memakai enkripsi, dan setiap tindakan
            petugas atas data Anda tercatat.
          </p>
          <p>
            Perlu dinyatakan apa adanya: yang terenkripsi adalah bagian di atas, bukan seluruh isi
            basis data. Identitas pelapor, yaitu nama dan alamat surel, tersimpan tanpa enkripsi
            karena diperlukan untuk menjalankan layanan.
          </p>
        </Bagian>

        <Bagian judul="Hak Anda">
          <ul className="list-disc pl-5 space-y-2">
            {HAK.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p>
            Untuk menggunakan hak tersebut, kirim permintaan ke{' '}
            <a className="text-primary underline underline-offset-4" href={`mailto:${ALAMAT_PDP}`}>
              {ALAMAT_PDP}
            </a>{' '}
            dengan menyebutkan nama dan alamat surel akun Anda.
          </p>
        </Bagian>

        <Bagian judul="Perubahan">
          <p>
            Bila kebijakan ini berubah, versi terbarunya diterbitkan di halaman ini. Perubahan yang
            memperluas pemrosesan data akan dimintakan persetujuan ulang.
          </p>
          <p className="pt-2">
            <Link className="text-primary underline underline-offset-4" href="/">
              Kembali ke beranda
            </Link>
          </p>
        </Bagian>
      </article>
    </main>
  );
}
