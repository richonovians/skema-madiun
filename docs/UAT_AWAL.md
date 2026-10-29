# Uji Penerimaan Pengguna (UAT) Awal — SKEMA

**Item roadmap:** `QA-SECURITY-UAT`, bagian #11 (`docs/TEST_KEAMANAN.md` §6).
**Disusun:** 29 Oktober 2026, terhadap `main` di `086bee8`.
**Pelaksanaan:** belum dijadwalkan; menunggu pemangku kepentingan.
**Cabang:** dokumen ini hanya ada di `tester`.

Dokumen ini dipakai dua pihak:

- **Peserta UAT** (perwakilan Diskominfo, Admin OPD, dan warga): membaca
  bagian 3 dan mengisi lembar di bagian 4.
- **Fasilitator** (tim penguji): menyiapkan bagian 2 sebelum sesi dan
  merangkum bagian 5 sesudahnya.

---

## 1. Tujuan

UAT awal menjawab satu pertanyaan: **apakah orang yang akan memakai SKEMA
dapat menyelesaikan pekerjaannya sendiri, tanpa dibantu?**

Ini bukan uji teknis. Keamanan, otorisasi, dan batas laju sudah diuji di
`TEST_KEAMANAN.md` §8-§17. Di sini yang dinilai adalah:

1. apakah tugasnya **berhasil** diselesaikan;
2. **langkah mana yang membingungkan**;
3. **berapa lama** tugasnya selesai.

Fasilitator **tidak menunjukkan caranya**. Bila peserta buntu lebih dari dua
menit, fasilitator boleh memberi petunjuk, dan skenario itu dicatat
"Lulus dengan bantuan".

---

## 2. Persiapan fasilitator

### 2.1 Lingkungan

| Hal | Isi |
| --- | --- |
| Alamat | `http://skema.local` (bukan `localhost:3000`, lihat `CLAUDE.md`) |
| Peramban | Chrome terbaru di laptop; satu ponsel untuk skenario P1 |
| Ponsel | `skema.local` harus terjemah ke IP laptop lewat DNS lokal (lihat `CLAUDE.md`); bila tidak bisa, skenario P1 dijalankan di laptop dan dicatat |
| Basis data | lokal (`skm_db`), **bukan** produksi |
| Sebelum mulai | `docker compose ps` tiga kontainer hidup; `pnpm dev` jalan; `http://skema.local/api/v1/health` menjawab 200 |

### 2.2 Akun

Peserta masuk lewat jalur **dev-login** dengan akun seed. Tidak ada akun
milik orang sungguhan yang dipakai.

| Peran | Identifier dev-login |
| ----- | -------------------- |
| Warga | `warga@example.go.id` |
| Admin OPD | `admin.opd@example.go.id` |
| Admin Kabupaten | `admin.kabupaten@example.go.id` |
| Publik | tanpa akun |

Bila waktu dan kredensial memungkinkan, satu peserta warga mencoba masuk
lewat **SSO Helpdesk** dengan akunnya sendiri pada skenario W1, dan hanya
skenario itu. Keberhasilan masuk SSO dari ujung ke ujung belum pernah
diperiksa (`CLAUDE.md`, "Keadaan yang belum tuntas").

### 2.3 Data uji

**Setiap judul yang diketik peserta diawali `[UJI UAT]`**, misalnya
`[UJI UAT] Jalan berlubang di depan pasar`. Dengan penanda itu skrip
pembersih dapat menghapusnya sesudah sesi (bagian 5.2). Judul tanpa
penanda tertinggal di basis data dan harus dihapus manual.

Siapkan **satu survei aktif berpenanda `[UJI UAT]` PER PESERTA** yang
mengizinkan pengisian tanpa akun, untuk skenario W2 dan P1, sebelum sesi
dimulai. Satu akun hanya dapat mengisi satu survei satu kali, dan akun warga
seed hanya ada satu (`warga@example.go.id`): peserta kedua yang menjalankan
W2 pada survei yang sama akan ditolak "sudah diisi", dan itu bukan cacat.
Bagikan satu survei kepada tiap peserta. P1 (tanpa akun) tidak terkena
batasan ini.

### 2.4 Bila pesertanya internal

Ditambahkan 29 Oktober 2026, untuk sesi bersama rekan magang yang **sudah
pernah melihat SKEMA**. Sesi seperti itu sah dan berguna, tetapi namanya
**UAT awal internal** (uji rintis), bukan penerimaan oleh pemangku
kepentingan.

| Yang tetap sahih | Yang melemah |
| ---------------- | ------------ |
| Langkah buntu, pesan galat yang membingungkan, alur yang patah | Skor kemudahan cenderung tinggi karena letak tombol sudah dikenal |
| Waktu penyelesaian dan status lulus/gagal | Hasilnya tidak dapat dipakai sebagai "diterima pemakai"; penerimaan sungguhan tetap di QA-FINAL-UAT bersama Diskominfo |

Cara mengurangi biasnya:

1. Beri tiap peserta **peran yang paling jarang ia buka**. Yang biasa
   mengerjakan halaman admin memerankan warga, dan sebaliknya.
2. Fasilitator **tidak memberi petunjuk** sama sekali; bantuan apa pun
   membuat skenarionya tercatat `Lulus dengan bantuan`.
3. Isi kolom **Jenis peserta** di lembar isian (bagian 4) dengan `internal`.

Akses dari laptop lain. `skema.local` hanya terbaca di laptop yang berkas
hosts-nya memuat baris itu. Dua cara, urut dari yang paling mudah:

1. Peserta **bergantian memakai laptop fasilitator**.
2. Di laptop peserta (Wi-Fi yang sama), tambahkan baris hosts yang menunjuk
   ke **IP laptop fasilitator**, bukan `127.0.0.1` -- alamat itu menunjuk ke
   laptop peserta sendiri. Porta 80 laptop fasilitator harus diizinkan
   Windows Firewall untuk jaringan itu. Masuk tetap lewat dev-login; jalur
   SSO tidak dipakai dari laptop lain (`CLAUDE.md`).

---

## 3. Skenario

Kode skenario dipakai di lembar isian. Kolom "Hasil yang diharapkan"
adalah patokan fasilitator untuk menilai lulus atau gagal; jangan dibacakan
kepada peserta.

### 3.1 Warga

| Kode | Tugas yang dibacakan kepada peserta | Hasil yang diharapkan |
| ---- | ----------------------------------- | --------------------- |
| W1 | "Masuk ke SKEMA sebagai warga." | Sampai di halaman persetujuan data pribadi bila belum pernah menyetujui, lalu ke beranda warga. |
| W2 | "Isi survei kepuasan untuk salah satu layanan sampai terkirim." | Survei tampil satu pertanyaan per langkah dengan penunjuk "Pertanyaan X dari Y"; sesudah dikirim muncul halaman selesai. Membuka survei yang sama lagi ditolak karena sudah diisi. |
| W3 | "Laporkan keluhan tentang sebuah layanan, sertakan satu foto." | Formulir **Ajukan Pengaduan** menerima foto (JPG, PNG, WebP, atau PDF, maks. 5MB); sesudah dikirim muncul nomor tiket. |
| W4 | "Temukan pengaduan yang tadi Anda kirim dan baca tanggapannya." | Pengaduan ada di daftar pengaduan dengan status yang terbaca (diterima / diproses / selesai / ditolak); balasan petugas tampil di detailnya. Dijalankan **sesudah** O4. |
| W5 | "Periksa apakah ada pemberitahuan baru untuk Anda." | Lonceng pemberitahuan menunjukkan balasan dari O4. |

### 3.2 Publik (tanpa akun)

| Kode | Tugas | Hasil yang diharapkan |
| ---- | ----- | --------------------- |
| P1 | "Pindai QR atau buka tautan ini di ponsel, lalu isi surveinya." | Muncul layar persetujuan data pribadi; peserta dapat memilih **Isi survei sebagai Anonim** atau mengisi data diri, lalu mengisi dan mengirim survei. |
| P2 | "Cari tahu nilai kepuasan layanan di kabupaten ini." | Halaman Statistik menampilkan nilai IKM tanpa perlu masuk. |

### 3.3 Admin OPD

| Kode | Tugas | Hasil yang diharapkan |
| ---- | ----- | --------------------- |
| O1 | "Buat survei kepuasan standar (SKM) untuk layanan Anda dan aktifkan." | **Buat Survei** jenis SKM langsung memuat sembilan unsur U1-U9; kalimat pertanyaan boleh diubah, unsurnya tidak dapat dihapus. Survei berstatus aktif. |
| O2 | "Buat survei biasa (Custom) dengan dua pertanyaan Anda sendiri." | Jenis Custom wajib memilih tujuan dan metode nilai; tersimpan sebagai draf. |
| O3 | "Bagikan survei O1 kepada warga lewat QR." | **Bagikan** menampilkan tautan `/survei/...` dan QR yang dapat diunduh. |
| O4 | "Tanggapi pengaduan yang masuk dari W3, lalu ubah statusnya." | Pengaduan W3 ada di daftar OPD; balasan terkirim; status berubah dan terlihat oleh warga di W4. |
| O5 | "Unduh hasil survei O1 untuk dilaporkan." | **Ekspor** menghasilkan berkas Excel atau CSV yang terbuka dan berisi jawaban W2/P1. |

### 3.4 Admin Kabupaten

| Kode | Tugas | Hasil yang diharapkan |
| ---- | ----- | --------------------- |
| K1 | "Lihat ringkasan kepuasan seluruh OPD." | Beranda dan Statistik & Laporan menampilkan survei semua OPD; penyaring jenis SKM/Custom bekerja. |
| K2 | "Temukan pengaduan yang belum jelas OPD tujuannya dan teruskan ke OPD yang tepat." | Aksi **Teruskan** memindahkan pengaduan ke OPD terpilih; OPD itu melihatnya. Butuh satu pengaduan W3 tanpa OPD tujuan. |
| K3 | "Beri seorang pegawai akses sebagai Admin OPD untuk dinasnya." | Halaman Pengguna dapat memberi peran `opd` dan menautkan OPD; perubahan tercatat di log. |
| K4 | "Periksa siapa yang mengubah status pengaduan O4 dan kapan." | Log Audit menampilkan baris O4 dengan nama pelaku dan waktunya; pencarian menemukannya. |
| K5 | "Pastikan daftar OPD sesuai data Helpdesk." | Halaman OPD baca saja; **Sinkronkan** menarik daftar dari Helpdesk dan melaporkan hasilnya. |

### 3.5 Urutan yang disarankan

Beberapa skenario bergantung pada hasil skenario lain:

```
O1 -> O3 -> W2 / P1 -> O5
W3 -> O4 -> W4 -> W5
W3 (tanpa OPD tujuan) -> K2
O4 -> K4
```

Jalankan O1, O3, dan W3 lebih dulu.

---

## 4. Lembar isian

Satu baris per skenario per peserta. **Status** salah satu dari:
`Lulus`, `Lulus dengan bantuan`, `Gagal`, `Tidak dijalankan`.

**Kemudahan** memakai skala yang sama dengan SKM: 1 = Sulit, 2 = Kurang
mudah, 3 = Mudah, 4 = Sangat mudah. Diisi oleh **peserta**, bukan fasilitator.

**Jenis peserta**: `stakeholder` (Diskominfo, Admin OPD, warga sungguhan)
atau `internal` (sudah pernah melihat SKEMA, lihat 2.4).

| Kode | Peserta | Jenis peserta | Status | Waktu (menit) | Kemudahan (1-4) | Langkah yang membingungkan | Catatan fasilitator |
| ---- | ------- | ------------- | ------ | ------------- | --------------- | -------------------------- | ------------------- |
| W1 | | | | | | | |
| W2 | | | | | | | |
| W3 | | | | | | | |
| W4 | | | | | | | |
| W5 | | | | | | | |
| P1 | | | | | | | |
| P2 | | | | | | | |
| O1 | | | | | | | |
| O2 | | | | | | | |
| O3 | | | | | | | |
| O4 | | | | | | | |
| O5 | | | | | | | |
| K1 | | | | | | | |
| K2 | | | | | | | |
| K3 | | | | | | | |
| K4 | | | | | | | |
| K5 | | | | | | | |

Pertanyaan penutup untuk setiap peserta, dicatat apa adanya:

1. Bagian mana yang paling menyulitkan?
2. Adakah yang Anda cari tetapi tidak ada?
3. Bersediakah Anda memakai SKEMA dalam pekerjaan sehari-hari? Mengapa?

---

## 5. Sesudah sesi

### 5.1 Kriteria UAT awal dinyatakan lulus

| Syarat | Batas |
| ------ | ----- |
| Skenario inti (W2, W3, W4, P1, O1, O4, K2) | semuanya `Lulus` atau `Lulus dengan bantuan` |
| `Gagal` pada skenario mana pun | nol yang berasal dari cacat aplikasi |
| Rata-rata kemudahan per peran | 3,0 atau lebih |

`Gagal` karena lingkungan (server mati, jaringan ponsel) tidak dihitung
sebagai cacat aplikasi, tetapi skenarionya diulang.

Sesi yang seluruh pesertanya `internal` dinyatakan **"UAT awal internal:
lulus/tidak lulus"**, tidak pernah "UAT awal: lulus". Syarat kemudahannya
tetap dicatat, tetapi tidak dipakai sebagai bukti penerimaan pemakai.

### 5.2 Membereskan data

```bash
node apps/web/e2e/support/bersihkan-data-uji.mjs --dry   # lihat dulu
node apps/web/e2e/support/bersihkan-data-uji.mjs --tanpa-induk
```

Skrip itu hanya menghapus baris berpenanda `[UJI `, dan tidak menyentuh
`audit_logs`. Perubahan peran dari K3 dikembalikan manual lewat halaman
Pengguna.

### 5.3 Mencatat temuan

- Setiap `Gagal` dan setiap `Lulus dengan bantuan` yang sebabnya aplikasi
  dicatat ke `BUG_REPORTS.md` sebagai BUG baru, dengan kode skenario di
  kolom Charter (mis. `UAT-W3`).
- Langkah yang membingungkan tetapi berhasil dicatat sebagai usulan
  perbaikan, bukan BUG.
- Rekap hasil ditulis ke `TEST_KEAMANAN.md` sebagai bagian baru, dan baris
  #11 di §4 diperbarui.
