import React from 'react';
import Badge from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { formatDateId } from '@/utils/format';

/**
 * `TINDAKAN` (menu Aktifkan/Nonaktifkan) DIHAPUS -- backend TAK PUNYA endpoint
 * mutasi status OPD sama sekali (cuma `GET /opd` & `POST /opd/sync`, lihat D10).
 * Isian sebelumnya 100% dummy, tak pernah terhubung apa pun. Diganti kolom
 * `TERAKHIR DISINKRON` (`syncedAt`, field asli yg sebelumnya tak ditampilkan
 * sama sekali) -- info nyata yg berguna menggantikan aksi karangan.
 */
export default function OPDTable({ data, pagination }) {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Aktif';
      case 'INACTIVE':
        return 'Nonaktif';
      default:
        return status;
    }
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="w-full overflow-x-auto min-h-[250px]">
        <Table>
          <Thead>
          <Tr className="bg-[#F8FAFC]">
            <Th>KODE OPD</Th>
            <Th>NAMA INSTANSI</Th>
            <Th>JENIS LAYANAN</Th>
            <Th>AKTIVITAS SISTEM</Th>
            <Th>STATUS</Th>
            <Th>TERAKHIR DISINKRON</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item) => (
            <Tr key={item.id}>
              <Td className="whitespace-nowrap font-mono text-primary font-medium">
                {item.code}
              </Td>
              <Td>
                {/* Alamat DIHAPUS dari tampilan (bukan disembunyikan diam-diam)
                    -- backend tak punya kolom ini, OPD cache read-only dari
                    Helpdesk (D7): menambah kolom lokal berarti data itu tak
                    akan pernah tersinkronisasi. */}
                <div className="font-bold text-text-primary">{item.name}</div>
              </Td>
              <Td className="text-on-surface-variant font-body-md text-body-md">
                {item.serviceType}
              </Td>
              <Td>
                {/* PENGHITUNG DIBACA ULANG (1 September 2026, laporan pengguna:
                    "bingung melihatnya pada tampilan hp").

                    Bentuk lamanya: satu baris flex tanpa pembungkus, dua
                    penghitung dipisah garis tegak `|`, dan angka serta labelnya
                    memakai bobot & warna yang SAMA -- "2 Survei Aktif | 5
                    Pengaduan Terbuka" terbaca sebagai satu kalimat panjang.
                    Di sel tabel yang sempit pada ponsel, mata tak punya
                    pegangan untuk memisahkan mana nilai dan mana yang dihitung.

                    Empat perubahan, masing-masing menjawab satu sebab:
                    - Angka dipisahkan dari labelnya lewat bobot & warna, jadi
                      terbaca "nilai lalu keterangannya", bukan satu frasa.
                    - Menumpuk di ponsel, berdampingan dari `sm` ke atas --
                      tak ada lagi dua penghitung berdesakan dalam satu baris.
                    - Titik status kini ada di KEDUANYA; sebelumnya hanya
                      survei yang punya, sehingga penandaannya tidak konsisten.
                    - `tabular-nums` supaya angka sejajar antar-baris tabel,
                      dan `|` dibuang karena pemisahnya kini jarak, bukan glif. */}
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.activeSurveys > 0 ? 'bg-primary' : 'bg-outline'}`}
                      aria-hidden="true"
                    ></span>
                    <span
                      className={`font-bold tabular-nums ${item.activeSurveys > 0 ? 'text-primary' : 'text-outline'}`}
                    >
                      {item.activeSurveys}
                    </span>
                    <span className="font-medium text-on-surface-variant">Survei Aktif</span>
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.openComplaints > 0 ? 'bg-tertiary' : 'bg-outline'}`}
                      aria-hidden="true"
                    ></span>
                    <span
                      className={`font-bold tabular-nums ${item.openComplaints > 0 ? 'text-tertiary' : 'text-outline'}`}
                    >
                      {item.openComplaints}
                    </span>
                    <span className="font-medium text-on-surface-variant">Pengaduan Terbuka</span>
                  </span>
                </div>
              </Td>
              <Td>
                <Badge variant={getStatusVariant(item.status)}>
                  {getStatusLabel(item.status)}
                </Badge>
              </Td>
              <Td className="text-on-surface-variant font-body-md text-body-md whitespace-nowrap">
                {item.syncedAt ? formatDateId(item.syncedAt) : 'Belum pernah'}
              </Td>
            </Tr>
          ))}
          {data.length === 0 && (
            <Tr>
              <Td colSpan={6} className="text-center py-8 text-text-secondary">
                Tidak ada data OPD yang ditemukan.
              </Td>
            </Tr>
          )}
          </Tbody>
        </Table>
      </div>
      {pagination}
    </div>
  );
}
