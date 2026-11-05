import { formatDateId, getInitials } from '@/utils/format';

/**
 * Terjemahkan ComplaintEntity backend (GET /complaints) ke bentuk yang dipakai
 * komponen. Satu tempat -- perubahan kontrak backend cukup diubah di sini (INT-6).
 *
 * CATATAN GAP BESAR: UI dummy lama (tampilan admin-kab, INT-33) mengharapkan
 * banyak field yang SAMA SEKALI TIDAK ADA di backend -- ini BUKAN masalah
 * penamaan yang bisa diselesaikan adapter, tapi kapasitas backend yang belum
 * dibangun (progress, priority, kecamatan, chronology, sla{...}, stats{...},
 * timeline[] -> tidak ada konsep ini sama sekali di skema Complaint/
 * ComplaintReply). Adapter ini SENGAJA tidak mengarang nilai untuk field-field
 * itu -- komponen yang menampilkannya sudah dirombak/dihapus di INT-33, bukan
 * tugas adapter frontend mengarang data.
 */
/**
 * Enum backend -> bentuk yang dipakai komponen (4 November 2026: tujuh nilai,
 * menggantikan empat).
 *
 * Komponen memakai LABELNYA sebagai kunci internal, bukan kode enumnya -- pola
 * yang sudah ada sejak awal berkas ini dan dipertahankan supaya seluruh layar
 * tak perlu disunting dua kali. `STATUS_TO_BACKEND` di bawah memetakannya
 * kembali sebelum dikirim.
 */
const STATUS_MAP = {
  terkirim: 'Terkirim',
  menunggu_verifikasi: 'Menunggu Verifikasi',
  diverifikasi: 'Diverifikasi',
  sedang_ditindaklanjuti: 'Sedang Ditindaklanjuti',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
  perlu_perbaikan: 'Perlu Perbaikan',
  /**
   * WAJIB ADA, dan ketiadaannya tidak memerah di mana pun (5 November 2026).
   *
   * Status backend yang tak terpetakan jatuh ke `?? complaint.status` dan
   * beredar sebagai kode mentah, lalu MELESET pada setiap peta yang berkunci
   * label: `ALLOWED_NEXT_STATUS` (tiket terbaca final dan tak dapat diubah
   * instansi tujuannya), `STATUS_ALTERNATIF` penanda kemajuan (kelima tahap
   * tergambar belum dilalui), varian lencana, penyaring daftar sisi klien
   * (selalu nol baris), ember sebaran status, dan kolom Status pada ekspor
   * PDF. Satu baris di sini, enam layar di hilir.
   */
  dialihkan: 'Dialihkan',
};

export function adaptComplaint(complaint) {
  const createdAt = complaint.createdAt;
  const ageDays = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
    : null;

  // Pengaduan anonim: backend MENGHILANGKAN `reporterNama` & `userId` (bukan
  // mengirimnya null). Tanpa penanganan di sini komponen hanya menampilkan '-',
  // yang membuat admin menyangka datanya rusak alih-alih disembunyikan.
  const isAnonim = complaint.isAnonim === true;
  const reporterName = isAnonim ? 'Anonim' : (complaint.reporterNama ?? null);

  return {
    id: complaint.ticketNo,
    numericId: complaint.id,
    userId: complaint.userId,
    opdId: complaint.opdId,
    isAnonim,
    reporter: {
      name: reporterName,
      initials: reporterName ? getInitials(reporterName) : '',
      // nik/phone/address (dipakai ComplaintReporterProfile.jsx, halaman detail
      // Admin OPD, INT-20). SUMBERNYA AKHIRNYA ADA, 1 Oktober 2026: ketiga
      // kolom `users` diisi dari klaim SSO Helpdesk saat login, dan
      // `GET /complaints/:ticketNo` mengirimkannya terdekripsi. Sebelum itu
      // ketiganya dipaku null di sini dan kartunya menggambar tiga tanda
      // hubung selamanya -- keluhan yang melahirkan pekerjaan ini.
      //
      // `?? null` BUKAN HIASAN. Daftar pengaduan sengaja TIDAK menarik ketiga
      // kolom ini, jadi kuncinya memang tak ada di sana; tanpa ini komponen
      // menerima `undefined` dan tak dapat membedakannya dari "Helpdesk tak
      // mengirimkannya". Pada pengaduan anonim backend menghapus kuncinya,
      // sehingga jalur yang sama membuat ketiganya null tanpa perlu
      // memeriksa `isAnonim` sekali lagi di sini.
      nik: isAnonim ? null : (complaint.reporterNik ?? null),
      phone: isAnonim ? null : (complaint.reporterNomorHp ?? null),
      address: isAnonim ? null : (complaint.reporterAlamat ?? null),
    },
    title: complaint.judul,
    description: complaint.uraian,
    dateStr: formatDateId(createdAt),
    createdAt,
    // Dipakai Statistik & Laporan Admin OPD untuk rata-rata waktu penyelesaian
    // pada periode terpilih. Backend menghitung `avgResponseHours` dari
    // `updatedAt - createdAt` pengaduan SELESAI, jadi yang menyaring per periode
    // harus memegang kedua ujungnya. `?? null`: kunci ini baru ikut diteruskan
    // sekarang, dan respons lama/tiruan yang tak membawanya tak boleh menjadi
    // `undefined` yang lolos ke perhitungan.
    updatedAt: complaint.updatedAt ?? null,
    ageDays,
    status: STATUS_MAP[complaint.status] ?? complaint.status,
    /**
     * Riwayat perpindahan status (4 November 2026). HANYA ada pada
     * `GET /complaints/:ticketNo`; daftar pengaduan tak menariknya.
     *
     * `?? null`, BUKAN `?? []`: array kosong terbaca komponen sebagai "tiket
     * ini tak punya riwayat", dan itu tak pernah benar sejak baris "Terkirim"
     * lahir bersama tiketnya. `null` menyatakan "tak ditarik kueri".
     *
     * `label` DITERUSKAN APA ADANYA dari backend, tidak diterjemahkan ulang
     * lewat STATUS_MAP: status yang kelak ditambahkan backend lebih dulu akan
     * tetap terbaca, alih-alih muncul sebagai kode mentah di tengah linimasa.
     */
    statusHistory: (complaint.statusHistory ?? null)?.map((baris) => ({
      id: baris.id,
      status: baris.status,
      label: baris.label ?? STATUS_MAP[baris.status] ?? baris.status,
      catatan: baris.catatan ?? null,
      actorNama: baris.actorNama ?? null,
      // Instansi tujuan pengalihan (5 November 2026). `null` pada setiap
      // baris yang bukan `dialihkan`, termasuk seluruh baris yang lahir
      // sebelum kolomnya ada.
      opdTujuanNama: baris.opdTujuanNama ?? null,
      createdAt: baris.createdAt,
    })) ?? null,
    // Kode kategori mentah ('kab_kesehatan', 'kec_sarana', ...) -- label
    // ramah-baca perlu di-cross-reference terpisah ke
    // GET /ref/complaint-categories, di luar tanggung jawab adapter sinkron ini.
    kategori: complaint.kategori,
    // Cakupan pengaduan: 'kabupaten' | 'kecamatan' (4 November 2026). Tak dapat
    // disimpulkan dari OPD tujuan -- pengaduan tanpa tujuan juga punya tingkat,
    // dan di sana tingkatnya justru satu-satunya petunjuk triase.
    tingkat: complaint.tingkat ?? null,
    // Kapan & di mana kejadiannya. `null` berarti pengaduan ini dibuat SEBELUM
    // kedua medan ini ada -- bukan "pelapornya mengosongkan", sebab keduanya
    // wajib sejak 4 November 2026. Tampilan menyembunyikan barisnya alih-alih
    // menggambar tanda hubung, dan itu sebabnya `null` tak diubah jadi ''.
    incidentDate: complaint.tanggalKejadian ?? null,
    incidentDateStr: complaint.tanggalKejadian ? formatDateId(complaint.tanggalKejadian) : null,
    incidentLocation: complaint.lokasiKejadian ?? null,
    // Nama OPD tujuan (terisi dari GET /complaints maupun /complaints/:ticketNo, INT-18).
    target: complaint.opdNama ?? null,
    attachments: (complaint.attachments ?? []).map(adaptComplaintAttachment),
  };
}

export function adaptComplaintList(complaints) {
  return complaints.map(adaptComplaint);
}

/** Origin API tanpa suffix /api/v1 -- dasar utk URL lampiran statis (INT-18). */
function getFileOrigin() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

/**
 * Lampiran disajikan lewat `/uploads/*` (2026-08-05; sebelumnya `fileUrl` sudah
 * benar tapi tak ada rute yang menyajikannya, selalu 404).
 *
 * SEJAK 7 September 2026 (temuan audit T1) rute itu TIDAK lagi publik: backend
 * mengembalikan `fileUrl` yang sudah bertanda tangan dan berbatas waktu
 * (`?exp=...&sig=...`), dan permintaan tanpa itu dijawab 403. Karena itu:
 *
 * - `url` HARUS membawa kuerinya utuh. Memotongnya berarti setiap gambar 403.
 * - `alt` TIDAK boleh membawanya. Ia diambil dari potongan terakhir jalur, jadi
 *   tanpa pemisahan di bawah teks alternatifnya berbunyi
 *   "foto.png?exp=1764000000&sig=aB3..." -- dibacakan lantang oleh pembaca
 *   layar, dan ikut muncul di mana pun nama berkas ditampilkan.
 *
 * Tautannya dapat KEDALUWARSA (baku 1 jam). Bila halaman dibiarkan terbuka
 * lebih lama dan gambarnya dimuat ulang, jawabannya 403 dan pengguna perlu
 * memuat ulang halaman untuk mendapatkan tautan baru -- itu konsekuensi yang
 * disengaja dari pendekatan URL bertanda tangan.
 */
/**
 * Buang awalan UUID yang ditambahkan backend saat menyimpan.
 *
 * Berkas disimpan sebagai `<uuid>-<nama asli>` (ComplaintsService.persistFiles)
 * supaya dua unggahan bernama sama tak saling menimpa. UUID itu urusan
 * penyimpanan, bukan nama yang layak dibaca pengguna — dan sejak tombol unduh
 * benar-benar bekerja (7 September 2026), nama inilah yang tersimpan di
 * komputer mereka.
 *
 * Polanya MENGIKAT bentuk UUID persis (8-4-4-4-12 heksadesimal), bukan sekadar
 * "ada tanda hubung di depan": `laporan-2026-buku.png` tak boleh ikut terpotong.
 */
const AWALAN_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

export function adaptComplaintAttachment(attachment) {
  const jalurTanpaKueri = attachment.fileUrl.split('?')[0];
  const namaTersimpan = jalurTanpaKueri.split('/').pop();
  return {
    id: attachment.id,
    url: `${getFileOrigin()}${attachment.fileUrl}`,
    alt: namaTersimpan.replace(AWALAN_UUID, ''),
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  };
}

const STATUS_TO_BACKEND = {
  Terkirim: 'terkirim',
  'Menunggu Verifikasi': 'menunggu_verifikasi',
  Diverifikasi: 'diverifikasi',
  'Sedang Ditindaklanjuti': 'sedang_ditindaklanjuti',
  Selesai: 'selesai',
  Ditolak: 'ditolak',
  'Perlu Perbaikan': 'perlu_perbaikan',
  // Tanpa baris ini penyaring status di daftar admin tak dapat memilih
  // "Dialihkan": nilainya akan dikirim apa adanya dan ditolak backend.
  Dialihkan: 'dialihkan',
};

/** Terjemahkan status frontend ('Diproses' dkk) -> enum backend ('diproses' dkk). */
export function toBackendComplaintStatus(status) {
  return STATUS_TO_BACKEND[status] ?? status;
}

/** Terjemahkan payload form (lihat CreateComplaintForm.jsx) -> CreateComplaintDto backend. */
export function toCreateComplaintPayload({
  opdId,
  tingkat,
  kategori,
  title,
  description,
  incidentDate,
  incidentLocation,
  isAnonim,
}) {
  return {
    // `undefined` bila tujuannya belum diketahui (6 September 2026). Number('')
    // menghasilkan 0 dan Number(undefined) menghasilkan NaN -- keduanya akan
    // terkirim sebagai medan yang ada dan ditolak backend.
    opdId: opdId == null || opdId === '' ? undefined : Number(opdId),
    tingkat,
    kategori,
    judul: title,
    uraian: description,
    // `<input type="date">` sudah bernilai 'YYYY-MM-DD', persis bentuk yang
    // diminta backend. TIDAK dilewatkan `new Date()` lalu diformat ulang di
    // sini: perjalanan bolak-balik itu akan menggeser tanggalnya sehari bagi
    // peramban di WIB, yang zona lokalnya UTC+7.
    tanggalKejadian: incidentDate,
    lokasiKejadian: incidentLocation,
    isAnonim: isAnonim === true,
  };
}

/**
 * Terjemahkan ComplaintReplyEntity (GET /complaints/:id/replies) -> bentuk
 * pesan chat (lihat ChatMessageBubble.jsx: role/senderName/text/timestamp).
 *
 * CATATAN GAP: backend hanya punya `authorId` (angka) -- `ComplaintReplyEntity`
 * TIDAK mengekspos nama maupun peran pengirim. Yang bisa diketahui frontend
 * hanyalah "pelapor atau bukan", dengan membandingkan `authorId` terhadap
 * `complaintUserId`.
 *
 * KOREKSI (2026-08-19, laporan bug user "kirim pesan dari role admin kabupaten
 * masih menampilkan admin OPD"): catatan lama di sini menyatakan hanya 2 pihak
 * yang boleh membalas (pelapor & Admin OPD pemilik) -- itu KELIRU.
 * `ComplaintsService.assertAccess` meloloskan `Role.kabupaten` lebih dulu,
 * jadi ada TIGA kemungkinan pengirim: pelapor, Admin OPD, Admin Kabupaten. Akibatnya label lama
 * "Admin OPD" bukan sekadar generik, tapi salah: pada data pengembangan, 4 dari
 * 10 balasan ditulis akun kabupaten dan semuanya dilabeli Admin OPD.
 *
 * `senderName` kini "Admin" untuk SEMUA pengirim non-pelapor -- benar untuk
 * kedua peran admin sekaligus. Membedakan "Admin Kabupaten" vs "Admin OPD"
 * MUSTAHIL di frontend tanpa backend mengekspos peran penulis; menebaknya dari
 * OPD pengaduan akan salah setiap kali kabupaten yang membalas.
 *
 * PENGADUAN ANONIM (4 September 2026): `authorId` balasan pelapor DIHILANGKAN
 * backend, dan `complaint.userId` pun tak dikirim. Pembandingan lama
 * (`authorId === complaintUserId`) kebetulan masih "benar" karena
 * undefined === undefined -- dan kebetulan seperti itu tak boleh dijadikan
 * dasar. Yang diperiksa di sini ADA-TIDAKNYA `authorId`, tepat seperti yang
 * dijanjikan kontrak backend.
 */
/**
 * Sisi gelembung ditentukan `dariPelapor` dari backend, BUKAN perbandingan id
 * penulis terhadap id pelapor.
 *
 * Perbandingan id itu keliru sejak awal (ketahuan 12 September 2026): satu akun
 * di sistem ini lazim memegang beberapa peran sekaligus, dan layar masuk justru
 * meminta penggunanya MEMILIH peran. Akun yang melaporkan pengaduan lalu
 * menanganinya sebagai petugas karena itu punya id yang sama persis dengan
 * pelapor, sehingga balasan petugasnya digolongkan sebagai balasan pelapor --
 * muncul di sisi yang salah pada halaman warga MAUPUN halaman admin sekaligus.
 * Yang menentukan adalah peran yang dipakai saat menulis, dan hanya backend
 * mengetahuinya (lihat kolom `dari_pelapor`).
 *
 * `isAnonim` tetap diperlukan, tapi hanya untuk LABEL pengirimnya.
 */
export function adaptComplaintReplyToChatMessage(reply, { isAnonim = false } = {}) {
  const isReporter = reply.dariPelapor === true;
  const time = reply.createdAt
    ? new Date(reply.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';
  return {
    type: 'chat',
    role: isReporter ? 'user' : 'admin',
    // Pelapor anonim DIBERI label: tanpanya, percakapan di mata admin tampak
    // seolah ditulis pihak yang tak dikenal. Pelapor biasa tetap tanpa label
    // (gelembungnya memang tak pernah menampilkan nama).
    senderName: isReporter ? (isAnonim ? 'Pelapor (anonim)' : undefined) : 'Admin',
    text: reply.pesan,
    // Lampiran balasan (2026-08-06, laporan bug user) -- URL dibangun sama
    // persis dgn attachments tingkat-pengaduan (adaptComplaintAttachment).
    attachments: (reply.attachments ?? []).map(adaptComplaintAttachment),
    timestamp: time ? `${time} WIB` : '',
    // Tanggal mentah diteruskan apa adanya. Gelembung chat cukup menampilkan
    // jam, tetapi ekspor PDF tiket menyusun tanggal lengkap darinya -- arsip
    // tanpa tanggal tak dapat dirunut.
    createdAt: reply.createdAt ?? null,
    status: 'Terkirim',
  };
}

export function adaptComplaintRepliesToChatMessages(replies, opsi) {
  return replies.map((r) => adaptComplaintReplyToChatMessage(r, opsi));
}
