# Spesifikasi Serah-Terima: Kunci Privat di Luar Server Aplikasi

**Status:** spesifikasi, belum disetujui, belum dikerjakan.
**Tanggal:** 4 Oktober 2026 (lihat "Riwayat suntingan" di akhir).
**Pembaca yang dituju:** developer Helpdesk, sebagai pihak yang akan memegang
produksi.
**Asal usul:** rekomendasi developer Helpdesk — pakai kunci publik/privat agar
penyerang yang membobol aplikasi tidak langsung memperoleh data aslinya.

Dokumen ini melengkapi `enkripsi-at-rest.md`, tidak menggantikannya. Bacalah
dokumen itu lebih dulu; seluruh istilah di sini mengikuti istilah di sana.

**Pembagian tanggung jawab.** Pada tahap produksi, developer Helpdesk
bertanggung jawab penuh atas pengoperasian aplikasi ini, termasuk pemegangan
kunci privat yang dibicarakan di sini. Karena itu dokumen ini bukan memo
keputusan untuk Diskominfo, melainkan **spesifikasi atas apa yang perlu
disediakan pihak Helpdesk** dan apa yang dikerjakan di dalam repo ini. Bagian 6
menyebut sisi mana yang mengerjakan tiap langkah.

Satu pembedaan dicatat sekali, karena berpengaruh pada siapa menandatangani apa
dan tidak pada rancangan teknisnya: tanggung jawab penuh atas pengoperasian
menjadikan Helpdesk **pengelola** sistem, sementara kedudukan **pengendali
data** menurut UU PDP ditentukan oleh siapa yang menetapkan tujuan pemrosesan —
dan itu tetap Diskominfo sebagai pemilik produk. Keduanya boleh berbeda pihak.
Bila sudah ada kesepakatan tertulis yang mengatur ini, kesepakatan itulah yang
berlaku, bukan catatan ini.

**Istilah.** Kata "end-to-end" tidak dipakai di dokumen ini; alasannya di bagian
2. Yang dirancang di sini adalah _envelope encryption_ dengan pemegang kunci di
luar server aplikasi. Keduanya bukan hal yang sama, dan tujuan yang disebut pada
baris "Asal usul" tercapai dengan yang kedua.

---

## 1. Celah yang ditutup

Enkripsi yang berjalan hari ini melindungi dari **kredensial basis data yang
bocor, dump yang tercecer, dan cadangan yang berpindah tangan**. Itu tertulis
tersurat di `enkripsi-at-rest.md` bagian 5, dan masih benar.

Yang **tidak** dilindunginya: penyerang yang menguasai server aplikasi. Ia
membaca `apps/api/.env`, memperoleh `DATA_ENCRYPTION_KEY`, lalu mendekripsi
seluruh arsip dalam hitungan detik. Kunci dan data terenkripsi berada di mesin
yang sama, jadi satu pembobolan memberi keduanya sekaligus.

Celah inilah yang ditutup spesifikasi ini, dan hanya ini.

## 2. Yang TIDAK diberikan spesifikasi ini

Bagian ini didahulukan supaya tak ada yang berharap lebih daripada yang ada.

**Ini bukan end-to-end encryption.** Pada E2E yang sesungguhnya, server tak
pernah dapat membaca data. SKEMA harus dapat membacanya: backend menghitung IKM,
Admin OPD membaca dan membalas pengaduan, pencarian log audit memakai nama, dan
laporan diekspor. E2E sejati mematikan semuanya. Pada E2E sejati, kunci privat
juga berada di peramban warga — bukan di server Helpdesk — sehingga warga yang
kehilangan perambannya kehilangan pengaduannya tanpa ada yang dapat menolong.

**Penyerang yang menguasai server API tetap dapat membuka data, satu per satu.**
Selama aplikasi boleh meminta pembukaan, penyerang yang menguasai aplikasi juga
boleh. Yang berubah adalah bentuk serangannya:

| Hari ini                                         | Sesudah spesifikasi ini                              |
| ------------------------------------------------ | ---------------------------------------------------- |
| Satu pembacaan `.env`, lalu seluruh arsip dibuka | Setiap blob harus diminta ke layanan pembuka         |
| Senyap — tak ada yang mencatat                   | Tiap permintaan tercatat dan dapat dibatasi lajunya  |
| Hitungan detik                                   | Lambat, dan polanya menyimpang dari pemakaian normal |

Penyedotan data besar-besaran berubah dari tak terlihat menjadi berisik dan
lambat. Itu nyata dan berharga. Itu juga bukan kekebalan, dan tak boleh
dilaporkan sebagai kekebalan.

**Kolom yang sengaja polos tetap polos.** `users.nama` dipakai pencarian log
audit, `users.email` dan judul pengaduan dipakai daftar. Alasannya ada di
`kolom.ts` dan tidak berubah.

## 3. Pemegang kunci

Kunci privat berada di server Helpdesk **pada tahap produksi**; pengembangan
tetap memakai kunci lokal (bagian 7). Pemegangnya karena itu sudah tertentu, dan
dokumen ini tidak membuka lagi pertanyaan siapa.

Yang tersisa hanya satu pertanyaan, dan ia menentukan apakah seluruh pekerjaan
ini ada gunanya.

### 3.1 Layanan pembuka, atau sekadar tempat menyimpan berkas kunci?

Bila Helpdesk hanya **menyimpan berkas** kunci privat dan server API
mengambilnya saat boot, kunci itu berakhir di memori server API. Penyerang yang
menguasai server itu tetap memperoleh seluruhnya, dan **celah di bagian 1 tidak
tertutup sama sekali** — hanya berkasnya yang berpindah tempat.

Perlindungan baru lahir bila Helpdesk menyediakan **layanan yang membuka atas
nama aplikasi tanpa pernah menyerahkan kuncinya**.

Pembedaan ini tidak berubah oleh pembagian tanggung jawab, dan itu perlu
dinyatakan tersurat supaya tidak disangka sudah selesai: tanggung jawab
menentukan siapa menanggung akibat **sesudah** pembobolan; arsitektur menentukan
**apakah** pembobolan menghasilkan data asli. Keduanya berdiri di sumbu yang
berbeda. Yang dirancang di sini hanya sumbu kedua.

### 3.2 Dua akibat yang menyertai

Keduanya bukan pertanyaan terbuka lagi, melainkan konsekuensi yang perlu
diketahui pemegangnya.

**Kehilangan kunci privat berarti kehilangan seluruh lampiran dan isi pengaduan
secara permanen.** Cadangan basis data tidak menolong karena terenkripsi kunci
yang sama. Prosedur pencadangan di `enkripsi-at-rest.md` bagian 2 berlaku atas
kunci baru ini. Yang masih kosong bukan siapa penanggung jawabnya, melainkan
prosedurnya sendiri — ditanyakan di bagian 8.

**Ketersediaan.** Bila layanan pembuka tak terjangkau, SKEMA tidak dapat membuka
satu pun data terenkripsi; bukan melambat, melainkan berhenti (bagian 4, "Gagal
tertutup"). Risiko ini lebih ringan daripada dugaan versi pertama dokumen ini:
aplikasi dan pemegang kunci dua-duanya berada di bawah Helpdesk pada tahap
produksi, jadi ini urusan di dalam satu pihak, bukan ketergantungan lintas
lembaga. Angka tolerannya tetap perlu disepakati (bagian 8).

## 4. Bentuk yang diusulkan

### Tiga bahan kunci, bukan tiga kunci asimetris

Perlu dijelaskan lebih dulu karena mudah tertukar. Kriptografi kunci publik
hanya mengenal **sepasang** kunci; "secret key" bukan anggota ketiga pasangan
itu, melainkan istilah baku untuk kunci simetris. Yang dipakai rancangan ini ada
tiga **bahan**:

| Bahan                      | Letaknya                              | Tugasnya                        |
| -------------------------- | ------------------------------------- | ------------------------------- |
| Kunci publik               | server API; boleh diketahui siapa pun | hanya membungkus                |
| Kunci privat               | server Helpdesk, di luar server API   | hanya ia yang membuka bungkusan |
| Kunci data (simetris, AES) | di dalam blob, sudah terbungkus       | mengenkripsi datanya sendiri    |

**AES-256-GCM tidak digantikan.** RSA maupun X25519 tak dapat mengenkripsi teks
panjang, apalagi lampiran. Yang dibungkus kunci publik adalah **kunci datanya,
bukan datanya.**

Hari ini tiap blob memakai kunci yang diturunkan HKDF dari kunci induk ditambah
garam 128-bit per blob (`envelope.ts`). Karena _diturunkan_, siapa yang memegang
kunci induk memegang semua blob. Spesifikasi ini mengubah asal kunci itu, bukan
cara pemakaiannya:

1. Acak kunci data 256-bit untuk blob ini — diacak, tidak diturunkan.
2. Enkripsi blobnya AES-256-GCM dengan kunci data itu — **tidak berubah**.
3. Bungkus kunci data itu dengan kunci publik, simpan bungkusannya di header.

Untuk membaca, aplikasi mengirim **bungkusan beberapa ratus bita** ke layanan
pembuka dan menerima kunci datanya kembali, lalu mendekripsi blobnya sendiri.

Alternatif yang ditolak: mengirim seluruh blob untuk dibuka di sana. Lampiran
dibatasi 5 MB x 5 berkas per pengaduan (`complaints.constants.ts`), jadi membuka
satu tiket memindahkan sampai 25 MB bolak-balik, dan **plaintext-nya melintas
jaringan**.

### Format amplop `SKM1 v2`

Header sekarang 49 bita: `SKM1` + versi + garam 16 + IV 12 + tag 16. Byte versi
sudah ada sejak awal dan belum pernah dipakai; v2 memakainya.

```
SKM1 | 0x02 | panjang_bungkusan (2 bita) | bungkusan | IV 12 | tag 16 | ciphertext
```

Garam HKDF hilang pada v2 karena kuncinya tak lagi diturunkan.

Keduanya hidup berdampingan. Blob v1 tetap terbuka dengan `DATA_ENCRYPTION_KEY`
selama masa peralihan, dan kolom basis data memakai awalan `enc:v2:` di samping
`enc:v1:` yang sudah ada.

#### Satu hal harus dibereskan lebih dulu: `terenkripsi()` mencampur dua pertanyaan

`terenkripsi()` memeriksa penanda `SKM1` **dan** menuntut byte versinya tepat
`0x01` (`envelope.ts`, dan salinan CJS-nya di `scripts/lib/envelope.cjs`). Dua
pertanyaan yang berbeda dijawab satu fungsi: "apakah ini amplop SKM1?" dan
"versinya berapa?"

Selama hanya ada v1, itu tidak pernah menjadi masalah. Begitu v2 ada, blob v2
dijawab `false` — artinya **dianggap bukan amplop sama sekali**, bukan dianggap
amplop berversi lain. Tiga pemanggilnya menanggapinya dengan tiga cara yang
semuanya salah:

| Pemanggil                         | Yang terjadi pada blob v2                        |
| --------------------------------- | ------------------------------------------------ |
| `app.setup.ts:201`                | lampiran disajikan apa adanya: ciphertext mentah |
| `scripts/enkripsi-lampiran-lama.cjs:62` | dianggap belum terenkripsi, lalu dienkripsi lagi |
| `scripts/lib/rotasi.cjs:27`       | berstatus `polos`, dibungkus ulang dengan kunci baru |
| `scripts/cadangan.cjs:89`         | dilaporkan sebagai berkas polos                  |

Dua yang tengah itu yang berbahaya: skrip migrasi akan **melapisi blob yang
sudah terenkripsi**, membungkus v2 di dalam v1. Masih dapat dipulihkan, tetapi
hanya bila ada yang menyadarinya.

Karena itu langkah pertama di bagian 6 bukan menambahkan pemeriksaan versi —
pemeriksaan itu sudah ada — melainkan **memisahkan deteksi amplop dari
versinya**, sehingga tiap pemanggil memutuskan dengan sadar apa yang dilakukan
terhadap versi yang tidak dikenalnya. Pesan galat `dekripsi()` juga menyebut
"v1" secara tertulis dan ikut diperbaiki di situ.

Ujinya belum ada: `envelope.spec.ts:51` menguji masukan yang terlalu pendek,
bukan byte versi yang tidak dikenal. Perbaikan ini pekerjaan repo ini dan tidak
menunggu siapa pun.

### Kontrak layanan pembuka

Ini yang perlu disediakan pihak Helpdesk.

```
POST /buka-kunci
  { "bungkusan": ["base64...", "base64...", ...] }   maksimum 100 per permintaan
→ { "kunci":     ["base64...", "base64...", ...] }   urutannya sama
```

**Berkelompok sejak hari pertama, bukan ditambahkan belakangan.** Satu halaman
daftar pengaduan mendekripsi `uraian` tiap baris; tanpa pengelompokan, satu
halaman berisi 20 baris berarti 20 perjalanan jaringan berurutan.

**Jalur ini wajib TLS, dan itu prasyarat yang hari ini belum ada.** Yang
dikembalikan layanan pembuka adalah kunci data dalam keadaan terbuka. Tanpa TLS,
penyadap pada jalur itu memperoleh kunci tanpa perlu membobol apa pun — dan
seluruh gunanya hilang. Pengembangan hari ini berjalan di porta 80 tanpa TLS
sama sekali (`infra/nginx/dev.conf`). Versi pertama dokumen ini menyebut TLS
hanya sebagai alasan menolak pengiriman seluruh blob; ia luput menyebut bahwa
kunci yang dikembalikan sendiri adalah rahasia yang melintas jaringan.

Layanan itu mencatat tiap permintaan (jumlah, pemanggil, waktu) dan membatasi
lajunya. Catatan itulah yang membuat penyedotan massal terlihat.

### Tembolok kunci data, dan harganya

Kunci data yang sudah terbuka ditahan di memori aplikasi dengan masa hidup
pendek (usulan: 5 menit, paling banyak beberapa ribu entri), supaya membuka satu
tiket lalu membalasnya tak menjadi dua perjalanan jaringan.

Harganya harus disebut: **tembolok itu plaintext kunci di memori mesin yang
justru diandaikan dapat dibobol.** Masa hidup pendek membatasi kerugiannya, tak
meniadakannya. Ini pertukaran yang disengaja antara ketahanan dan kecepatan, dan
angkanya pantas ditinjau ulang setelah dipakai.

### Gagal tertutup

Bila layanan pembuka tak terjangkau, aplikasi **menolak permintaannya** dengan
galat yang jelas. Tidak ada jalur cadangan ke `DATA_ENCRYPTION_KEY`, sebab jalur
cadangan semacam itu meniadakan seluruh gunanya.

## 5. Akibat terbesar pada kode: dekripsi menjadi asinkron

Seluruh bagian ini pekerjaan repo ini, bukan pihak Helpdesk. Ia yang paling
mudah diremehkan dan paling banyak menyentuh berkas.

`dekripsiKolom` hari ini **sinkron**, dipanggil langsung di tengah pemetaan
entity. Layanan pembuka di jaringan membuatnya asinkron, dan itu menjalar ke
setiap pemanggil:

| Berkas                      | Yang didekripsi                      |
| --------------------------- | ------------------------------------ |
| `auth.service.ts:201-203`   | `nik`, `nomorHp`, `alamat`           |
| `complaints.service.ts:696` | pembantu dekripsi umum               |
| `complaints.service.ts:707` | `uraian`, per baris daftar           |
| `complaints.service.ts:752` | `pesan` balasan                      |
| `responses.service.ts:321`  | `nomorHp` responden                  |
| `app.setup.ts:208`          | lampiran, di middleware `/uploads/*` |

Jalur daftar pengaduan adalah yang terberat: ia mendekripsi per baris, jadi
pengumpulan bungkusan harus dilakukan **sebelum** pemetaan, bukan di dalamnya.

## 6. Migrasi, dan sisi yang mengerjakannya

Jalurnya sudah ada dan teruji — `rotasi-kunci.cjs`, `enkripsi-kolom-lama.cjs`,
dan `enkripsi-lampiran-lama.cjs`, ketiganya idempoten (`enkripsi-at-rest.md`
bagian 6–7). Yang diperlukan adalah memperluasnya, bukan menulis dari nol.

| #   | Langkah                                                                  | Sisi                             |
| --- | ------------------------------------------------------------------------ | -------------------------------- |
| 1   | Pisahkan deteksi amplop dari versinya di `terenkripsi()`, TS maupun CJS, beserta ujinya. Sendirian, lebih dulu | repo ini |
| 2   | Tambahkan format v2 beserta ujinya; belum ada yang menulisnya            | repo ini                         |
| 3   | Layanan pembuka versi lokal, untuk pengembangan dan uji                  | repo ini                         |
| 4   | Layanan pembuka produksi, sesuai kontrak bagian 4, beserta TLS-nya       | **Helpdesk**                     |
| 5   | Ubah seluruh jalur dekripsi menjadi asinkron (bagian 5)                  | repo ini                         |
| 6   | Tulis baru dalam v2; baca masih menerima v1 dan v2                       | repo ini                         |
| 7   | Jalankan migrasi ulang atas data lama                                    | repo ini, di lingkungan Helpdesk |
| 8   | Sesudah dipastikan tak ada lagi blob v1, pensiunkan `DATA_ENCRYPTION_KEY` | bersama                         |

Langkah 1 sampai 3 tidak bergantung pada jawaban siapa pun dan dapat dikerjakan
lebih dulu. Langkah 5 ke atas bergantung pada jawaban bagian 3.1; bila
jawabannya "sekadar menyimpan berkas", langkah-langkah itu tak menutup celah apa
pun dan tidak layak dikerjakan dalam bentuk ini.

Langkah 8 tak boleh didahulukan. Membuang kunci lama selagi masih ada blob v1
berarti kehilangan data itu selamanya.

## 7. Pengembangan tanpa server Helpdesk

Layanan pembuka versi lokal membaca kunci privat dari berkas, dan **menolak
menyala bila `NODE_ENV=production`**. Tanpa penjagaan itu, bentuk pengembangan
akan menemukan jalannya ke produksi dan mengembalikan celah yang justru ditutup
dokumen ini.

Uji otomatis memakai pasangan kunci tetap, mengikuti pola `KUNCI_UJI` di
`kunci.ts` — tertulis di kode, tak pernah di berkas `.env` mana pun.

## 8. Pertanyaan untuk developer Helpdesk

1. **Layanan pembuka, atau sekadar tempat menyimpan berkas kunci?** (Bagian 3.1)
2. **RSA-OAEP, bukan X25519/HPKE?** Usulan kami RSA-OAEP, dan alasannya
   terukur: JWKS Helpdesk per 4 Oktober 2026 sudah memuat kunci RSA 2048 dengan
   RS256 (`kid: sso-key-1`), jadi RSA sudah ada di tumpukan kalian beserta
   tempat penyimpanan kunci privatnya dan praktik `kid` untuk membedakan kunci.
   X25519 berarti memperkenalkan hal baru tanpa sebab.
   **Peringatan yang menyertainya:** `sso-key-1` itu `use: sig` — kunci tanda
   tangan. Yang dibutuhkan pasangan kunci **baru** dengan `use: enc`. Satu kunci
   dipakai menandatangani sekaligus mengenkripsi tidak dibenarkan, dan itu
   berlaku terlepas dari seberapa praktis kelihatannya.
3. Siapa yang boleh memanggil layanan itu, dan bagaimana pemanggilnya dibuktikan
   sah?
4. Berapa laju maksimum yang diizinkan, dan apa yang terjadi bila dilampaui?
5. Bagaimana prosedur pencadangan kunci privatnya, dan di mana cadangan itu
   disimpan? (Bagian 3.2)
6. Berapa lama SKEMA boleh menganggap layanan itu mati sebelum dianggap
   gangguan? (Bagian 3.2)
7. Bagaimana rotasi kunci dilakukan dari sisi Helpdesk?
8. Apakah jalur ke layanan pembuka sudah memakai TLS di produksi? (Bagian 4)

Tanpa jawaban nomor 1, langkah 5 ke atas di bagian 6 tidak boleh dimulai: bila
jawabannya "sekadar menyimpan", seluruh pekerjaan itu tak menutup celah apa pun.

## 9. Perkiraan besarnya pekerjaan

Bukan janji tanggal, melainkan urutan besaran. Bagian 5 — mengubah seluruh jalur
dekripsi menjadi asinkron — lebih besar daripada bagian kriptonya sendiri, dan
ia menyentuh jalur yang dilalui setiap pembacaan pengaduan dan setiap pembukaan
profil. Setiap langkah di bagian 6 adalah satu commit tersendiri dengan ujinya
sendiri.

Pembagiannya kasar: langkah 1 dan 2 kecil, langkah 3 sedang, langkah 5 adalah
bagian terbesar dari sisi repo ini, dan langkah 4 seluruhnya di luar repo ini
sehingga tak dapat diperkirakan dari sini.

## Riwayat suntingan

**4 Oktober 2026, suntingan pertama.** Versi pertama ditulis sebagai memo
keputusan untuk Diskominfo: bagian 3 memanggil Diskominfo memutuskan siapa
pemegang kunci, dan bagian 6 serta 9 memperkirakan seluruh pekerjaan sebagai
pekerjaan repo ini. Keduanya tidak tepat — pada tahap produksi developer
Helpdesk bertanggung jawab penuh atas pengoperasian aplikasi, jadi pemegang
kunci sudah tertentu dan sebagian pekerjaan berada di luar repo ini.

Yang berubah: pembacanya menjadi developer Helpdesk; bagian 3 menjadi pernyataan
beserta satu pertanyaan yang tersisa alih-alih tiga pertanyaan terbuka;
pertanyaan "siapa penanggung jawab kunci" dicabut dari bagian 8 karena sudah
terjawab, sementara prosedur pencadangannya tetap ditanyakan; bagian 6 memisah
sisi pengerjaan tiap langkah.

Dua hal ditambahkan yang luput pada versi pertama, dan keduanya bukan akibat
perubahan pembaca:

- Bagian 4 kini menyebut bahwa **kunci data yang dikembalikan layanan pembuka
  sendiri adalah rahasia yang melintas jaringan**, jadi TLS adalah prasyarat,
  bukan penyempurnaan. Versi pertama menyebut TLS hanya sebagai alasan menolak
  pengiriman seluruh blob.
- Bagian 4 kini menjelaskan tiga **bahan** kunci dan menyatakan tersurat bahwa
  kunci asimetris hanya sepasang. Istilah "publik, secret, privat" sebagai tiga
  sekawan sempat menimbulkan salah paham dalam pembahasan, dan dokumen yang
  tidak meluruskannya akan mengulanginya pada pembaca berikutnya.

**4 Oktober 2026, suntingan kedua.** Pertanyaan 2 di bagian 8 berubah dari
pertanyaan terbuka menjadi usulan beserta alasannya, sesudah metadata OIDC dan
JWKS Helpdesk dibaca langsung dari sumbernya hari itu:
`https://helpdesk.madiunkab.go.id/.well-known/openid-configuration` dan
`https://api.madiunkab.go.id/api/oauth/jwks`. Keduanya terbitan umum untuk
integrator, dan repo ini sudah mengonsumsinya; tidak ada endpoint yang
ditebak-tebak atau dipindai.

Yang terbaca di sana dan mengubah isi dokumen: Helpdesk sudah menjalankan RSA
2048/RS256, sehingga RSA-OAEP menjadi pilihan yang tidak menambah apa pun yang
baru bagi mereka. Yang terbaca dan **tidak** mengubah isi dokumen tapi perlu
dicatat: kunci yang ada itu `use: sig`, jadi ia tak boleh dipakai ulang untuk
enkripsi; dan sisi Helpdesk sudah memakai TLS, sehingga prasyarat TLS di bagian
4 kurang dari yang dibayangkan — yang belum memakai TLS adalah lingkungan
pengembangan kita sendiri di porta 80.

Satu temuan yang terbawa ke luar dokumen ini: `claims_supported` pada metadata
mereka tidak memuat `nik`, `phone_number`, `alamat`, maupun `jenis_kelamin`,
padahal keempatnya dipetakan `sso-identitas.mapper.ts` dan berjalan. Itu bukti
terukur bagi peringatan yang sudah lama tertulis di `CLAUDE.md`, dan dicatat di
sana, bukan di sini.

**4 Oktober 2026, suntingan ketiga — memperbaiki kesalahan dokumen ini
sendiri.** Dua versi sebelumnya menyatakan bahwa `dekripsi()` **tidak**
memeriksa byte versi. Itu tidak benar, dan tertulis dua kali tanpa diperiksa:
`dekripsi()` memeriksanya melalui `terenkripsi()`, yang menguji
`data[MAGIC.length] === VERSI`. Saya menulisnya dari ingatan atas berkas itu
alih-alih membacanya, dan langkah pertama di bagian 6 karena itu menyuruh
mengerjakan hal yang sudah ada.

Cacatnya sungguh ada, hanya berbeda bentuk, dan baru terlihat ketika berkasnya
dibaca utuh: `terenkripsi()` menjawab dua pertanyaan sekaligus, sehingga blob
berversi tak dikenal dilaporkan sebagai bukan-amplop. Uraiannya ada di bagian 4
beserta keempat pemanggil yang menanggapinya dengan salah, dua di antaranya
skrip migrasi yang akan membungkus ulang blob yang sudah terenkripsi.

Langkah 1 di bagian 6 diganti sesuai temuan itu. Pelajarannya dicatat di sini
karena pembaca dokumen ini akan membaca kodenya juga: pernyataan tentang kode
dalam dokumen ini harus berasal dari berkasnya, bukan dari ingatan tentang
berkasnya.
