import React from 'react';
import Link from 'next/link';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import { Eye } from 'lucide-react';

/**
 * Kolom Responden/Email/No. Telepon DIHAPUS -- SKM sengaja anonim by design
 * (ResponseEntity backend TAK memuat identitas pengisi sama sekali, lihat
 * catatan di response.entity.ts & survey.adapter.js). "Nilai" sekarang
 * `averageScore` DIDERIVASI dari jawaban skala respons itu sendiri (bukan
 * field backend).
 *
 * `basePath` (2026-08-19): akar area ('/admin-opd/surveys' | '/admin-kab/surveys').
 * Sebelumnya '/admin-opd' tertanam keras di tautan Detail, sehingga tabel ini tak
 * bisa dipakai Admin Kabupaten tanpa memindahkannya ke area peran lain.
 */
export default function SurveyResponsesTable({ surveyId, responses, basePath }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
      <Table>
        <Thead>
          <Tr>
            <Th>Respons</Th>
            {/* PENGISI (1 Oktober 2026, keputusan tersurat pengguna sesudah
                laporan "data responden bukan anonim belum tampil"). Namanya
                saja: nomor HP sengaja tinggal di halaman detail, sebab daftar
                dipakai memindai banyak baris sekaligus dan memajang data hubung
                puluhan orang pada satu layar tak dibutuhkan untuk memindai. */}
            <Th>Pengisi</Th>
            <Th>Waktu Pengisian</Th>
            <Th>Nilai Rata-Rata</Th>
            {/* `relative` (16 September 2026): `sr-only` adalah
                `position: absolute`, dan tanpa penampung di sel ini blok
                penampungnya melompat sampai ke blok awal dokumen -- keluar dari
                wadah `overflow-x-auto` milik tabel, yang karenanya tak menjepitnya.
                Terukur pada 320px: tepi kanannya 329px sementara layar 320px,
                dan halaman benar-benar bisa digeser 9px ke samping meski jalur
                itu kosong (`sr-only` memakai `clip: rect(0,0,0,0)`, jadi tak
                menggambar apa pun). Dengan `relative` di sini, ia kembali diukur
                dan dijepit di dalam gulirannya sendiri. */}
            <Th className="relative">
              <span className="sr-only">Aksi</span>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {responses.map((response, index) => (
            <Tr key={response.id}>
              <Td>
                {/* NOMOR DARI BACKEND, bukan posisi baris (4 Oktober 2026,
                    laporan pengguna "respon paling pertama masuk akan
                    tertimbun"). `index + 1` membuat nomor berubah sendiri tiap
                    ada pengisi baru, dan mengulang dari 1 di tiap halaman.
                    Frontend tak dapat menghitungnya: ia hanya memegang satu
                    potongan dan tak tahu ada berapa respons sebelumnya.

                    Tanpa `nomor` (mis. jalur yang tak berpaginasi), labelnya
                    kehilangan angka alih-alih jatuh kembali ke posisi array --
                    jatuh ke posisi berarti mengembalikan cacat ini. */}
                <span className="font-medium text-on-surface">
                  {response.nomor != null ? `Respons #${response.nomor}` : 'Respons'}
                </span>
              </Td>
              {/* "Anonim" DITULIS di sini, bukan di adapter. Null dari backend
                  berarti pengisi memilih tidak memberi datanya, dan adapter
                  meneruskannya apa adanya supaya pilihan itu tetap dapat
                  dibedakan dari data yang hilang. Menerjemahkannya menjadi kata
                  adalah keputusan TAMPILAN, dan tempatnya di sini. */}
              <Td>
                {response.respondent?.name ? (
                  <span className="text-on-surface">{response.respondent.name}</span>
                ) : (
                  <span className="text-on-surface-variant italic">Anonim</span>
                )}
              </Td>
              <Td>
                <span className="text-on-surface-variant">{formatDate(response.submittedAt)}</span>
              </Td>
              <Td>
                <span className="font-bold text-on-surface">
                  {response.averageScore != null ? `${response.averageScore.toFixed(1)} / 4` : '-'}
                </span>
              </Td>
              <Td>
                <Link href={`${basePath}/${surveyId}/responses/${response.id}`}>
                  <Button variant="secondary">
                    <Eye size={16} />
                    Detail
                  </Button>
                </Link>
              </Td>
            </Tr>
          ))}
          {responses.length === 0 && (
            <Tr>
              <Td colSpan={5} className="text-center py-xl text-on-surface-variant">
                Belum ada respons untuk survei ini.
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
