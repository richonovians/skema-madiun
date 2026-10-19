# SKEMA

Sistem Keluhan, Evaluasi, dan Manajemen Aspirasi untuk Kabupaten Madiun.

Aplikasi web yang menjalankan dua layanan sekaligus: **Survei Kepuasan Masyarakat (SKM)** untuk mengukur mutu layanan setiap Organisasi Perangkat Daerah (OPD), dan **pengaduan masyarakat** sebagai kanal keluhan warga yang statusnya bisa dilacak sampai selesai. Pemilik produknya Dinas Komunikasi dan Informatika (Diskominfo) Kabupaten Madiun.

Dokumen ini ditulis untuk siapa pun yang perlu memahami proyek ini, termasuk yang tidak membaca kode. Petunjuk teknis ada di bagian bawah.

---

## Mengapa sistem ini ada

Penyelenggara pelayanan publik wajib mengukur kepuasan masyarakat sebagai dasar perbaikan layanan. Kewajiban itu berasal dari UU No. 25 Tahun 2009 tentang Pelayanan Publik, sedangkan cara mengukurnya diatur **PermenPANRB No. 14 Tahun 2017**: sembilan unsur pelayanan, jawaban berskala 1 sampai 4, lalu dikonversi menjadi angka Indeks Kepuasan Masyarakat (IKM).

Sembilan unsur baku itu tersedia sebagai template siap pakai:

| Kode | Unsur                                    |
| ---- | ---------------------------------------- |
| U1   | Persyaratan                              |
| U2   | Sistem, Mekanisme, dan Prosedur          |
| U3   | Waktu Penyelesaian                       |
| U4   | Biaya/Tarif                              |
| U5   | Produk Spesifikasi Jenis Pelayanan       |
| U6   | Kompetensi Pelaksana                     |
| U7   | Perilaku Pelaksana                       |
| U8   | Sarana dan Prasarana                     |
| U9   | Penanganan Pengaduan, Saran, dan Masukan |

Template ini tidak ditanam mati di dalam kode. OPD boleh menambah pertanyaannya sendiri di luar sembilan unsur, dan susunan pertanyaan bisa berubah bila pedoman nasional diperbarui.

Dua masalah yang ingin dipecahkan sistem ini:

1. **Perhitungan IKM masih manual.** Nilai dihitung sendiri oleh sistem begitu jawaban masuk, jadi OPD tidak perlu mengolah data di Excel.
2. **Hasil survei tersebar di banyak tempat.** Semua OPD memakai satu platform, sehingga kabupaten bisa membandingkan kinerja layanan antar-OPD dalam satu layar.

---

## Siapa yang memakainya

### Masyarakat

- Mengisi survei kepuasan setelah menerima layanan, lewat tautan atau kode QR yang dibagikan OPD.
- Mengajukan pengaduan, melampirkan foto atau dokumen bila perlu.
- Memantau pengaduannya sendiri: diterima, diproses, selesai, atau ditolak, beserta balasan dari OPD.
- Melihat statistik layanan publik yang terbuka untuk umum tanpa perlu masuk.

Warga cukup mendaftar sekali. Setelah itu tidak perlu mengisi ulang data diri untuk setiap survei atau pengaduan.

### Admin OPD

- Menyusun paket survei: memakai sembilan unsur baku, menambah pertanyaan sendiri, dan menetapkan periode penilaian (per triwulan).
- Menerbitkan survei, menutupnya, atau menyimpannya dulu sebagai draf.
- Membaca hasil: nilai IKM, mutu layanan A sampai D, jumlah responden, dan jawaban satu per satu.
- Menindaklanjuti pengaduan yang ditujukan ke OPD-nya dan membalas pelapor.
- Mengunduh hasil survei dan rekap pengaduan dalam bentuk Excel atau PDF.

Setiap Admin OPD hanya melihat data OPD-nya sendiri.

### Admin Kabupaten

- Melihat ringkasan seluruh OPD dalam satu dashboard, termasuk perbandingan nilai IKM antar-OPD.
- Memantau seluruh pengaduan di kabupaten.
- Mengelola akun pengguna dan perannya.
- Membaca log aktivitas: siapa mengubah apa, dan kapan.

Daftar OPD sendiri tidak diketik manual di sini. Data itu disinkronkan dari sistem Helpdesk kabupaten dan bersifat baca saja, supaya satu daftar OPD berlaku untuk semua sistem daerah.

---

## Perjalanan satu survei

```
Admin OPD menyusun pertanyaan
  -> survei diterbitkan, tautan dan kode QR dibagikan
  -> warga mengisi lewat ponsel atau komputer
  -> nilai IKM terhitung sendiri dan langsung tampil
```

Survei yang sudah punya jawaban tidak bisa diubah sembarangan. Judul dan pengaturan masih boleh disunting, tetapi periode dan susunan pertanyaan terkunci, supaya hasil yang sudah masuk tidak berubah artinya di tengah jalan. Survei yang dihapus masuk ke Sampah lebih dulu dan masih bisa dipulihkan.

## Perjalanan satu pengaduan

```
Warga mengajukan pengaduan, boleh dengan lampiran
  -> berstatus diterima, OPD membacanya
  -> berstatus diproses, OPD membalas pelapor
  -> berstatus selesai atau ditolak, pelapor diberi tahu
```

Pengaduan dikelompokkan menjadi tiga kategori umum: Aduan, Lapor, dan Lainnya. Ada batas jumlah pengaduan per akun per hari agar kanal ini tidak dibanjiri kiriman berulang.

---

## Status proyek

Dikembangkan sejak 20 Juli 2026 dan **masih dalam pengembangan**. Alur utamanya sudah berjalan, tetapi beberapa hal belum bisa dinyalakan karena menunggu pihak lain:

- **Masuk lewat SSO Helpdesk** sudah ditulis lengkap, tetapi belum bisa dipakai di lapangan karena `client_id` dan `client_secret` belum diberikan tim Helpdesk. Selama itu, lingkungan pengembangan memakai jalur masuk sementara yang mati sendiri di produksi.
- **Captcha pengisian survei** (Cloudflare Turnstile) belum punya kunci produksi atas nama akun resmi Diskominfo.
- **Docker untuk aplikasi.** Yang berjalan di dalam kontainer baru basis data dan reverse proxy. Backend dan frontend masih dijalankan langsung di komputer pengembang.
- **Uji ujung-ke-ujung baru mencakup satu alur**, yaitu pengisian survei tanpa sesi. Selebihnya diuji di tingkat unit dan komponen.

---

## Isi repositori

Satu repositori berisi beberapa bagian sekaligus (monorepo), dikelola dengan pnpm.

| Folder                  | Isi                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/api`              | Backend: NestJS, Prisma, PostgreSQL. Menangani aturan bisnis, perhitungan IKM, dan ekspor berkas. |
| `apps/web`              | Frontend: Next.js. Semua halaman yang dilihat warga dan admin.                                    |
| `packages/shared-types` | Tipe data yang dipakai bersama oleh backend dan frontend.                                         |
| `infra/nginx`           | Konfigurasi reverse proxy untuk pengembangan dan produksi.                                        |
| `docs`                  | Dokumen produk: PRD, diagram basis data (ERD), dan daftar rute.                                   |

---

## Menjalankan di komputer sendiri

### Yang perlu disiapkan

- Node.js 22 atau lebih baru
- pnpm 9 atau lebih baru
- Docker Desktop (untuk PostgreSQL dan reverse proxy)

### Langkah

**1. Tambahkan nama host lokal.**

Aplikasi disajikan pada satu alamat, `http://skema.local`, sama seperti di produksi. Tambahkan baris ini ke berkas hosts:

```
127.0.0.1 skema.local
```

Di Windows berkasnya ada di `C:\Windows\System32\drivers\etc\hosts` dan harus disunting sebagai Administrator.

**2. Siapkan berkas konfigurasi.**

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Buka `apps/api/.env` dan isi tiga baris berikut. Masing-masing diisi nilai acak **sendiri**, bukan disalin dari orang lain:

| Baris                   | Gunanya                                 |
| ----------------------- | --------------------------------------- |
| `SESSION_JWT_SECRET`    | Menandatangani token sesi               |
| `DATA_ENCRYPTION_KEY`   | Mengenkripsi lampiran dan isi pengaduan |
| `BACKUP_ENCRYPTION_KEY` | Mengenkripsi berkas cadangan            |

Ketiganya dibuat dengan perintah yang sama, dijalankan sekali untuk tiap baris:

```bash
openssl rand -hex 32
```

Tanpa `SESSION_JWT_SECRET` yang panjangnya cukup, aplikasi menolak menyala. Tanpa `DATA_ENCRYPTION_KEY`, backend juga menolak menyala, dengan pesan yang menyebutkan hal ini.

**Kehilangan `DATA_ENCRYPTION_KEY` berarti kehilangan lampiran dan isi pengaduan secara permanen.** Tidak ada pintu belakang, dan cadangan tidak menolong karena isinya terenkripsi kunci yang sama. Simpan salinannya di luar komputer ini sebelum melanjutkan. Penjelasan lengkapnya ada di `docs/keamanan/enkripsi-at-rest.md`.

**3. Nyalakan basis data dan proxy.**

```bash
docker compose up -d
```

**4. Pasang dependensi.**

```bash
pnpm install
```

**5. Siapkan struktur tabel.**

```bash
pnpm --filter @skm-spm/api prisma:deploy
```

**6. Isi data contoh (opsional).**

```bash
pnpm --filter @skm-spm/api db:seed
```

Mengisi tiga akun contoh (Admin Kabupaten, Admin OPD, Responden), tiga OPD, dua survei, dan satu pengaduan. Aman dijalankan berulang kali: isinya diperbarui, bukan digandakan. Tanpa langkah ini aplikasi tetap menyala, hanya saja isinya kosong.

**7. Jalankan backend dan frontend.**

```bash
pnpm dev
```

**8. Buka aplikasinya.**

<http://skema.local>

Bukan `http://localhost:3000`. Frontend dan backend disatukan oleh reverse proxy pada satu alamat, dan membuka port 3000 langsung membuat panggilan ke API tidak ditemukan.

Alamat lain yang mungkin berguna selama pengembangan:

| Alamat                        | Isi                                                     |
| ----------------------------- | ------------------------------------------------------- |
| <http://skema.local/api/v1>   | Backend                                                 |
| <http://skema.local/api/docs> | Dokumentasi API (Swagger). Wajib dimatikan di produksi. |

---

## Kunci enkripsi dalam tim

Sejak 23 September 2026, lampiran pengaduan dan dua kolom teks bebas di basis data tersimpan dalam bentuk terenkripsi. Ada satu aturan yang paling mudah salah, dan akibatnya tidak terlihat sampai terlambat.

**Basis data sendiri, kunci sendiri.** Tiap orang menjalankan PostgreSQL-nya sendiri lewat `docker compose`, jadi buat kunci sendiri dan jangan menyalin punya orang lain.

**Basis data bersama, kunci bersama.** Begitu tim memakai satu basis data yang sama, misalnya server uji coba atau produksi, `DATA_ENCRYPTION_KEY` di semua tempat harus sama persis. Bila tidak, pengaduan yang ditulis lewat satu laptop tidak terbaca lewat laptop lain. Gejalanya bukan pesan galat yang jelas, melainkan data yang gagal dibuka satu per satu ketika ada yang membukanya.

**Jangan pernah mencetak nilai kunci** ke layar, berkas log, tiket, atau percakapan. Yang boleh ditunjukkan hanya sidik jarinya. Kunci yang pernah terlihat orang lain harus dianggap tidak rahasia lagi dan diputar dengan `pnpm rotasi:kunci` dari `apps/api`. Prosedur lengkapnya, termasuk empat langkah sesudah rotasi yang tidak boleh dilewat, ada di bagian 7 `docs/keamanan/enkripsi-at-rest.md`.

### Kalau basis data Anda sudah terisi sebelumnya

Data yang ditulis sebelum perubahan ini masih tersimpan polos. Aplikasi tetap membacanya dengan normal, jadi langkah ini tidak mendesak, tetapi selama belum dijalankan data tersebut terbaca oleh siapa pun yang memperoleh berkas disknya.

```bash
cd apps/api
pnpm enkripsi:lampiran -- --uji   # laporan saja, tidak menulis apa pun
pnpm enkripsi:lampiran

pnpm enkripsi:kolom -- --uji
pnpm enkripsi:kolom
```

Keduanya aman dijalankan berulang kali. Yang sudah terenkripsi dilewati, jadi menjalankannya lagi adalah cara memastikan tidak ada yang tertinggal.

---

## Perintah sehari-hari

Dijalankan dari akar repositori.

| Perintah      | Kegunaan                                   |
| ------------- | ------------------------------------------ |
| `pnpm dev`    | Menjalankan backend dan frontend bersamaan |
| `pnpm test`   | Menjalankan seluruh uji otomatis           |
| `pnpm lint`   | Memeriksa gaya penulisan kode              |
| `pnpm format` | Merapikan format berkas                    |
| `pnpm build`  | Membangun versi produksi                   |

Jangan menjalankan `pnpm build` selagi `pnpm dev` hidup. Keduanya menulis ke folder keluaran yang sama, dan hasilnya server pengembangan membalas 404 untuk semua halaman.

---

## Dokumen lain

| Berkas                                            | Isi                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `docs/PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md` | Dokumen kebutuhan produk: latar belakang, ruang lingkup, peran pengguna, dan alur lengkap |
| `docs/ERD-Sistem-SKM-dan-Pengaduan.mermaid`       | Diagram relasi antar-tabel basis data                                                     |
| `docs/Routes-List-API-dan-Frontend.md`            | Daftar seluruh alamat API dan halaman web                                                 |
| `docs/Rencana-Integrasi-Frontend-Backend.md`      | Rencana penyambungan frontend dengan backend                                              |
| `docs/Roadmap-Timeline-*.csv`                     | Rencana kerja dan lini masa, siap diimpor ke ClickUp                                      |
| `docs/keamanan/enkripsi-at-rest.md`               | Apa yang terenkripsi dan apa yang tidak, kustodi kunci, rotasi, cadangan, dan pemulihan   |

Perlu diketahui saat membaca PRD: dokumen itu masih menyebut peran **Superuser** sebagai peran tersendiri. Peran tersebut dilebur ke Admin Kabupaten pada 15 September 2026, jadi sekarang hanya ada tiga peran, yaitu Admin Kabupaten, Admin OPD, dan Responden.

---

## Catatan keamanan

- Berkas `.env` tidak pernah masuk ke repositori. Yang tercatat hanya `.env.example` berisi contoh tanpa nilai rahasia. Kunci SSO, secret captcha, dan kunci penanda tangan sesi diisi sendiri di setiap lingkungan.
- Dokumentasi API di `/api/docs` harus dimatikan di produksi. Tanpa itu seluruh permukaan API, termasuk endpoint admin, terpampang tanpa perlu masuk.
- Lampiran pengaduan tidak dapat dibuka lewat alamat biasa. Setiap tautan lampiran ditandatangani dan kedaluwarsa, supaya alamat yang bocor tidak berlaku selamanya.
- Lampiran dan dua kolom paling pribadi (`complaints.uraian` dan `complaint_replies.pesan`) tersimpan terenkripsi. Basis datanya **tidak** terenkripsi seluruhnya: nama dan email pengguna, judul pengaduan, serta nama dan nomor HP responden survei tetap tersimpan polos. `users.nama` memang tidak bisa dienkripsi selama pencarian log audit memakainya; sisanya polos karena belum masuk cakupan, dan bisa menyusul. Cara menyebutnya yang benar adalah "isi pengaduan dan percakapannya terenkripsi, identitas pelapor tidak". Batas tepatnya, prosedur kunci, dan runbook cadangan ada di `docs/keamanan/enkripsi-at-rest.md`.
