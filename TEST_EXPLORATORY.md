# Panduan Pengujian Eksploratori (Exploratory Testing Charters)

## Sistem Survei Kepuasan Masyarakat (SKM) & Sistem Pengaduan Masyarakat

|                        |                                                         |
| ---------------------- | ------------------------------------------------------- |
| **Dokumen Pendamping** | TEST_PLAN.md · TEST_CASES.md                            |
| **Versi**              | 1.0                                                     |
| **Tanggal**            | 11 Agustus 2026                                         |
| **Lingkup**            | Frontend (`apps/web`) — dijalankan manual lewat browser |

---

## 1. Kenapa dokumen ini ada

`TEST_CASES.md` berisi skenario yang **sudah diketahui** harus diperiksa. Pengujian
eksploratori mencari hal yang **belum terpikirkan** — dan pada fase integrasi seperti
sekarang, di situlah sebagian besar cacat berada.

Sasaran di bawah bukan tebakan. Semuanya diturunkan dari tiga sumber:

1. **Catatan `GAP` yang ditulis tim dev sendiri** di dalam kode — 17 titik di mana
   kemampuan backend dan harapan UI berbeda.
2. **Data perubahan kode 60 hari terakhir** — makin sering sebuah area diubah, makin
   besar peluang ada yang terlewat: `complaints` 95 commit, `surveys` 91, `users` 49.
3. **Fitur yang belum punya cakupan uji otomatis sama sekali.**

## 2. Cara menjalankan satu sesi

Satu sesi = **satu charter, 60–90 menit, tanpa jeda**. Jangan menguji sambil
mengerjakan hal lain — daya temu turun drastis.

| Langkah | Isi                                                                             |
| ------- | ------------------------------------------------------------------------------- |
| 1       | Siapkan lingkungan (§3), catat waktu mulai                                      |
| 2       | Baca misi charter, jalankan **hanya** area itu                                  |
| 3       | Catat **semua** keanehan seketika, jangan ditunda — termasuk yang terasa sepele |
| 4       | Kalau menemukan jalur menarik di luar misi, catat sebagai charter baru          |
| 5       | Tutup sesi: isi ringkasan hasil, jumlah temuan, dan area yang belum sempat      |

Aturan penting: **jangan berhenti untuk memperbaiki apa pun.** Tugas sesi ini
menemukan, bukan membetulkan.

## 3. Persiapan lingkungan

```bash
# 1. Basis data + backend
docker compose up -d
cd apps/api && pnpm prisma migrate deploy && pnpm prisma db seed && pnpm start:dev

# 2. Frontend (terminal terpisah)
cd apps/web && pnpm dev        # http://localhost:3000
```

Akun uji: lihat **TEST_PLAN.md §3.3**. Login lewat tombol "Masuk via SSO Helpdesk"
di beranda, isi **email saja** — tidak ada kata sandi.

> ⚠️ Basis data dev bisa menyimpang dari `seed.ts` (per 10 Agustus 2026 sudah berbeda:
> akun `warga@gmail.com`, 54 OPD hasil sinkronisasi Helpdesk). Sebelum sesi, jalankan
> ulang seed bila ingin titik awal yang dapat direproduksi, dan **catat di laporan**
> versi data mana yang dipakai.

---

## 4. Charter

Urutan sudah disusun dari yang paling berpeluang menemukan cacat serius.

### C-01 — Survei kustom bertipe teks & pilihan ganda `P0`

**Misi:** cari tahu apa yang dialami warga ketika mengisi survei yang memuat pertanyaan
selain skala 1–4.

**Dasar kecurigaan:** `survey.adapter.js` mencatat bahwa `QuestionCard.jsx` **hanya**
merender tipe `scale_1_to_4`. Pertanyaan teks dan pilihan diterjemahkan dengan benar
oleh adapter, tetapi belum punya tampilan di wizard pengisian.

**Arah penelusuran:**

- Sebagai Admin OPD, buat survei draft, tambahkan satu pertanyaan **Isian Teks Terbuka**,
  publikasikan.
- Sebagai warga, buka survei itu. Apa yang tampil di posisi pertanyaan tersebut?
- Bisakah wizard dilanjutkan? Bisakah disubmit? Apa yang terkirim ke backend?
- Ulangi untuk tipe **Pilihan Ganda** — builder menolaknya dengan pesan, tetapi apakah
  survei yang pertanyaannya dibuat lewat jalur lain (mis. duplikasi) tetap muncul?
- Periksa apakah tombol Submit tetap aktif walau pertanyaan itu tidak terisi.

---

### C-02 — Alur pengaduan lintas peran `P0`

**Misi:** telusuri satu pengaduan dari pengajuan warga sampai selesai ditangani, dan
pastikan setiap peran melihat keadaan yang konsisten.

**Dasar kecurigaan:** area `complaints` berubah 95 kali dalam 60 hari — paling panas di
seluruh proyek. Notifikasi lintas peran baru ditambahkan (D9) dan belum pernah diuji
manual.

**Arah penelusuran:**

- Warga mengajukan pengaduan → catat nomor tiket yang muncul.
- Admin OPD membuka pengaduan itu → apakah muncul di daftarnya? Ubah status bertahap
  `diterima → diproses → selesai`.
- Setiap kali status berubah, periksa **lonceng notifikasi warga**: apakah lencana
  muncul? Apakah pesan sesuai? Apakah tautannya membuka pengaduan yang benar?
- Admin Kabupaten membuka pengaduan yang sama — apakah benar hanya bisa memantau
  (tidak bisa mengubah status)?
- Coba transisi mundur (`selesai → diproses`). Apa yang terjadi di UI?
- Balas percakapan dari kedua sisi. Apakah pengirim tiap pesan ditampilkan dengan benar?
  (`complaint.adapter.js` mencatat backend hanya menyimpan `authorId`, tanpa nama/peran.)

---

### C-03 — Lampiran pengaduan `P0`

**Misi:** uji batas dan perilaku unggah berkas.

**Arah penelusuran:**

- Unggah beberapa berkas sekaligus; unggah berkas sangat besar; unggah tipe tak lazim
  (`.exe`, `.svg`, berkas tanpa ekstensi).
- Apa yang terjadi bila jaringan terputus di tengah unggahan?
- Buka pratinjau gambar — apakah bisa ditutup? Apakah gambar rusak ditangani dengan baik?
- Apakah lampiran pengaduan orang lain bisa diakses langsung lewat URL berkasnya?
  **(Periksa dengan sungguh-sungguh — ini menyangkut kerahasiaan pengaduan, FR-CMP-08.)**

---

### C-04 — Proteksi route & peralihan peran `P0`

**Misi:** buktikan matriks proteksi route (TEST_CASES **A.5.1**) berlaku di aplikasi
sungguhan, bukan hanya di test.

**Arah penelusuran:**

- Untuk tiap peran, coba buka langsung setiap route pada matriks lewat bilah alamat.
- Login sebagai warga, lalu **ubah cookie `role` menjadi `kabupaten`** lewat DevTools.
  Apakah halaman admin terbuka? Apakah datanya ikut tampil, atau API tetap menolak?
- Logout, lalu tekan tombol Back. Apakah halaman terlindungi masih tampil dari cache?
- Buka dua tab dengan peran berbeda secara bersamaan. Apa yang terjadi?

> Konteks: `TC-AUTH-031` mencatat logout bersifat _stateless_ — token lama tetap sah di
> backend. Sesi ini memeriksa dampak nyatanya bagi pengguna.

---

### C-05 — Form buat & ubah akun admin `P1`

**Misi:** cari data yang diminta ke pengguna tetapi tidak pernah disimpan.

**Dasar kecurigaan:** `user.adapter.js` mencatat form mengumpulkan `phone` dan
`isActive`, padahal `CreateUserDto` tidak punya keduanya — sengaja tidak dikirim.

**Arah penelusuran:**

- Buat akun Admin OPD sambil mengisi nomor telepon. Simpan, buka lagi akunnya —
  masih ada? Apakah pengguna diberi tahu bahwa data itu tidak tersimpan?
- Matikan sakelar "Aktif" saat membuat akun. Apakah akun tetap dibuat dalam keadaan
  aktif? Apakah itu bertentangan dengan yang ditampilkan?
- Buat akun `opd` tanpa memilih OPD. Apakah pesan errornya jelas?
- Coba surel yang sudah terdaftar.

---

### C-06 — Sinkronisasi & daftar OPD `P1`

**Misi:** uji perilaku daftar OPD pada volume data sungguhan (54 entri, bukan 3 dari seed).

**Arah penelusuran:**

- Tekan tombol Sinkronisasi. Berapa lama? Apakah ada indikator proses? Apa yang terjadi
  bila ditekan dua kali beruntun?
- Uji pencarian dengan kata yang tidak ada, dengan huruf besar-kecil campur, dan dengan
  spasi di awal/akhir.
- Cari sesuatu di halaman 3 — apakah halaman kembali ke 1? Kalau tidak, apakah tabelnya
  kosong padahal hasil ada?
- Bandingkan jumlah pada indikator paginasi dengan jumlah baris yang benar-benar tampil.

---

### C-07 — Profil responden & pemakaian ulang data `P1`

**Misi:** periksa FR-AUTH-05 — data profil dipakai ulang otomatis saat mengisi survei.

**Dasar kecurigaan:** `me.adapter.js` mencatat "dummy mengharapkan banyak field identitas
yang TIDAK ADA" di backend.

**Arah penelusuran:**

- Isi profil demografis lengkap, lalu isi survei. Apakah identitas terisi sendiri?
- Ubah profil sebagian saja (mis. hanya pekerjaan). Apakah field lain tetap utuh?
- Kosongkan salah satu field wajib. Apa pesan errornya, dan apakah bisa dipahami awam?
- Apakah ada field di halaman profil yang tampil kosong terus-menerus?

---

### C-08 — Ketahanan saat backend bermasalah `P1`

**Misi:** pastikan aplikasi gagal dengan anggun, bukan layar putih.

**Arah penelusuran:**

- Matikan backend, lalu buka bergantian: dashboard, statistik, daftar survei, pengaduan,
  audit log. Mana yang menampilkan pesan error yang jelas, mana yang kosong tanpa
  penjelasan?
- Nyalakan lagi backend, tekan tombol "Coba Lagi". Apakah benar pulih?
- Matikan backend **di tengah** pengisian survei, lalu tekan Submit. Apakah jawaban yang
  sudah diisi hilang?
- Perlambat jaringan lewat DevTools (throttling). Apakah tombol bisa ditekan dua kali
  sebelum indikator proses muncul?

---

## 5. Format laporan temuan

Satu temuan satu entri. Tulis segera saat ditemukan, jangan menunggu sesi berakhir.

```markdown
### BUG-00X — [Judul singkat yang menjelaskan gejala]

|                       |                                         |
| --------------------- | --------------------------------------- |
| **Charter**           | C-0X                                    |
| **Tanggal**           | 11 Agustus 2026                         |
| **Peran**             | Responden / Admin OPD / Admin Kabupaten |
| **Halaman**           | /surveys/12                             |
| **Severity**          | Critical / High / Medium / Low          |
| **Kasus uji terkait** | TC-FE-0XX (bila ada)                    |

**Langkah reproduksi** 1. 2. 3.

**Hasil yang diharapkan**

**Hasil sebenarnya**

**Bukti** — tangkapan layar, pesan di Console, atau respons di tab Network

**Catatan** — apakah selalu terjadi atau kadang-kadang; apakah ada jalan memutar
```

### Panduan severity

| Severity     | Kriteria                                                               |
| ------------ | ---------------------------------------------------------------------- |
| **Critical** | Data bocor antar-pengguna/OPD, data hilang, atau alur inti buntu total |
| **High**     | Fitur utama tidak berfungsi, tidak ada jalan memutar                   |
| **Medium**   | Fitur bermasalah tetapi ada jalan memutar                              |
| **Low**      | Kosmetik, salah ketik, ketidakrapian tampilan                          |

> Isi kolom **Severity** berdasarkan dampak ke pengguna, bukan seberapa sulit
> memperbaikinya. Menentukan prioritas perbaikan adalah urusan tim dev.

---

## 6. Catatan penutup sesi

Setiap sesi berakhir dengan ringkasan singkat:

| Isi              | Contoh                                                |
| ---------------- | ----------------------------------------------------- |
| Charter          | C-01                                                  |
| Durasi           | 75 menit                                              |
| Cakupan tercapai | ~70% — tipe Pilihan Ganda belum sempat diuji          |
| Temuan           | 3 (1 High, 2 Medium)                                  |
| Hambatan         | Seed perlu dijalankan ulang, memakan ~10 menit        |
| Charter baru     | C-09 — perilaku duplikasi survei berpertanyaan kustom |

Ringkasan inilah yang menjadi bahan laporan pengujian, bukan daftar temuan saja.
