'use client';

import React, { useCallback, useMemo, useState } from 'react';
import OPDHeader from '@/features/opd/components/OPDHeader';
import OPDFilterBar from '@/features/opd/components/OPDFilterBar';
import OPDTable from '@/features/opd/components/OPDTable';
import Pagination from '@/components/ui/Pagination';
import CatatanPemotongan from '@/components/ui/CatatanPemotongan';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getOpdList, syncOpd } from '@/features/opd/services/opd.api';

const ITEMS_PER_PAGE = 10;
const FETCH_LIMIT = 100;

export default function ManajemenOPDPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);

  const fetchOpd = useCallback(() => getOpdList({ limit: FETCH_LIMIT }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchOpd);

  const filteredData = useMemo(() => {
    // `.trim()` ditambahkan 23 Oktober 2026 (BUG-011). Menempel nama OPD dari
    // dokumen, surel, atau sel spreadsheet hampir selalu membawa spasi ikut
    // serta, dan tanpa pemangkasan ini hasilnya nol baris beserta kalimat
    // "Tidak ada data OPD yang ditemukan." -- terdengar pasti, padahal
    // datanya jelas ada, dan kata kuncinya sendiri tampak benar di kotaknya.
    const q = searchQuery.trim().toLowerCase();
    return (response?.data ?? []).filter((opd) => {
      return opd.name.toLowerCase().includes(q) || opd.code.toLowerCase().includes(q);
    });
  }, [response, searchQuery]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  // Baris yang diambil berhenti di FETCH_LIMIT, dan penyaring serta pencarian di
  // atas bekerja atas irisan itu saja -- jadi baris yang cocok tetapi tak
  // terambil tak akan pernah muncul. Total sebenarnya hanya diketahui dari meta
  // backend; tanpa menyebutnya, halaman ini tampak lengkap padahal bukan.
  const totalSeluruhnya = response?.meta?.pagination?.total ?? 0;
  const barisTerambil = response?.data?.length ?? 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncNotice(null);
    try {
      const report = await syncOpd();
      // BUG-012 (23 Oktober 2026): `skipped` dahulu tak disebut sama sekali,
      // padahal `syncOpd()` mengembalikan LIMA angka. Empat yang lain
      // melaporkan hal yang berhasil; yang ini melaporkan OPD yang TIDAK ikut
      // tersinkron -- satu-satunya angka yang menuntut tindak lanjut. Tanpa
      // ia, sinkronisasi yang melewatkan sepuluh OPD terbaca persis sama
      // suksesnya dengan yang tak melewatkan satu pun.
      //
      // Nol pun disebut tersurat. Kalimat yang menghilangkan angkanya saat
      // nol tak dapat dibedakan dari kalimat yang sekadar tidak
      // melaporkannya, jadi "0 dilewati" adalah bukti positif.
      //
      // `report.skipped` tak dijaga `?? 0`: backend selalu mengirimnya
      // (`opd.service.ts` memulainya dari 0 dan selalu menyertakannya), dan
      // jaga-jaga di sini hanya akan menyembunyikan kontrak yang patah.
      setSyncNotice({
        pesan: `Sinkron selesai: ${report.fetched} diambil, ${report.created} baru, ${report.updated} diperbarui, ${report.deactivated} dinonaktifkan, ${report.skipped} dilewati.`,
        adaDilewati: report.skipped > 0,
      });
      await refetch();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Memuat data OPD..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat data OPD" description={error.message} onRetry={refetch} />;
  }

  return (
    <div className="p-lg max-w-container-max w-full mx-auto flex-1 flex flex-col min-h-full">
      <OPDHeader onSync={handleSync} isSyncing={isSyncing} />

      {/* `role="status"` ditambahkan bersama BUG-012. Sampai hari ini banner ini
          tak punya `role` apa pun, jadi menekan "Sinkronkan dari Helpdesk"
          lalu menunggu menghasilkan KESUNYIAN bagi pembaca layar -- berhasil
          maupun melewatkan. `role="alert"` sengaja tidak dipakai: di basis
          kode ini ia khusus untuk galat, dan hasil yang diminta pengguna
          sendiri tak perlu menyela.

          Kuning saat ada yang dilewati, hijau bila tidak. Kontras amber-700 di
          atas amber-50 terukur 4,84:1 -- lulus WCAG AA, sejajar dengan
          emerald yang 5,21:1. */}
      {syncNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-lg p-3 border rounded-xl text-sm font-medium ${
            syncNotice.adaDilewati
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {syncNotice.pesan}
        </div>
      )}
      {syncError && (
        <div className="mb-lg p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Gagal sinkronisasi: {syncError}
        </div>
      )}

      <OPDFilterBar
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <OPDTable
          data={paginatedData}
          pagination={
            totalItems > 0 && (
              <>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  itemName="OPD"
                />
                <div className="px-6 pb-3">
                  <CatatanPemotongan
                    ditampilkan={barisTerambil}
                    total={totalSeluruhnya}
                    namaItem="OPD"
                    adaPenyaring
                  />
                </div>
              </>
            )
          }
        />
      </div>
    </div>
  );
}
