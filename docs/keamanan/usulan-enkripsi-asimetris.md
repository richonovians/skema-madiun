# Usulan: Kunci Privat di Luar Server Aplikasi

**Status:** usulan, belum disetujui, belum dikerjakan.
**Tanggal:** 4 Oktober 2026.
**Asal usul:** rekomendasi developer Helpdesk — pakai kunci publik/privat agar
penyerang yang membobol aplikasi tidak langsung memperoleh data aslinya.

Dokumen ini melengkapi `enkripsi-at-rest.md`, tidak menggantikannya. Bacalah
dokumen itu lebih dulu; seluruh istilah di sini mengikuti istilah di sana.

---

## 1. Celah yang ditutup

Enkripsi yang berjalan hari ini melindungi dari **kredensial basis data yang
bocor, dump yang tercecer, dan cadangan yang berpindah tangan**. Itu tertulis
tersurat di `enkripsi-at-rest.md` bagian 5, dan masih benar.

Yang **tidak** dilindunginya: penyerang yang menguasai server aplikasi. Ia
membaca `apps/api/.env`, memperoleh `DATA_ENCRYPTION_KEY`, lalu mendekripsi
seluruh arsip dalam hitungan detik. Kunci dan data terenkripsi berada di mesin
yang sama, jadi satu pembobolan memberi keduanya sekaligus.

Celah inilah yang ditutup usulan ini, dan hanya ini.

## 2. Yang TIDAK diberikan usulan ini

Bagian ini didahulukan supaya tak ada yang berharap lebih daripada yang ada.

**Ini bukan end-to-end encryption.** Pada E2E yang sesungguhnya, server tak
pernah dapat membaca data. SKEMA harus dapat membacanya: backend menghitung IKM,
Admin OPD membaca dan membalas pengaduan, pencarian log audit memakai nama, dan
laporan diekspor. E2E sejati mematikan semuanya.

**Penyerang yang menguasai server API tetap dapat membuka data, satu per satu.**
Selama aplikasi boleh meminta pembukaan, penyerang yang menguasai aplikasi juga
boleh. Yang berubah adalah bentuk serangannya:

| Hari ini                                        | Sesudah usulan ini                                    |
| ----------------------------------------------- | ----------------------------------------------------- |
| Satu pembacaan `.env`, lalu seluruh arsip dibuka | Setiap blob harus diminta ke layanan pembuka           |
| Senyap — tak ada yang mencatat                   | Tiap permintaan tercatat dan dapat dibatasi lajunya    |
| Hitungan detik                                   | Lambat, dan polanya menyimpang dari pemakaian normal   |

Penyedotan data besar-besaran berubah dari tak terlihat menjadi berisik dan
lambat. Itu nyata dan berharga. Itu juga bukan kekebalan, dan tak boleh
dilaporkan sebagai kekebalan.

**Kolom yang sengaja polos tetap polos.** `users.nama` dipakai pencarian log
audit, `users.email` dan judul pengaduan dipakai daftar. Alasannya ada di
`kolom.ts` dan tidak berubah.

## 3. Pemegang kunci: keputusan tata kelola, bukan keputusan teknis

Rencananya kunci privat berada di server Helpdesk/Diskominfo **pada tahap
produksi**; pengembangan tetap memakai kunci lokal.

Siapa pun yang memegang kunci privat memperoleh kemampuan membaca isi pengaduan
warga, NIK, nomor HP, dan alamat — seluruhnya. Menurut UU PDP, Diskominfo
sebagai pengendali data perlu memutuskan itu **secara tersurat**, bukan
menerimanya sebagai efek samping sebuah perubahan teknis. Dokumen ini tidak
dapat memutuskannya.

Tiga hal yang harus terjawab sebelum pekerjaan dimulai:

1. **Layanan pembuka, atau sekadar tempat menyimpan?** Ini pembeda yang
   menentukan segalanya. Bila Helpdesk hanya *menyimpan berkas kunci* dan
   aplikasi mengambilnya saat boot, kunci itu berakhir di memori server API dan
   **tak ada perlindungan tambahan sama sekali** — persis keadaan hari ini,
   hanya berkasnya pindah. Perlindungan baru lahir bila mereka menyediakan
   layanan yang membuka atas nama kita tanpa pernah menyerahkan kuncinya.
2. **Siapa bertanggung jawab bila kunci hilang?** Kehilangan kunci privat
   berarti kehilangan seluruh lampiran dan isi pengaduan secara permanen.
   Cadangan tidak menolong karena terenkripsi kunci yang sama. Prosedur
   pencadangan di `enkripsi-at-rest.md` bagian 2 harus diperluas ke pemegang
   baru, beserta nama penanggung jawabnya.
3. **Jaminan ketersediaan.** Bila jaringan ke pemegang kunci putus, SKEMA tidak
   dapat membuka satu pun data terenkripsi — bukan melambat, melainkan berhenti.
   Preseden ketergantungan sudah ada: SSO Helpdesk masih menunggu `client_id`
   dari mereka sampai hari ini.

## 4. Bentuk yang diusulkan

**Yang dibungkus kunci publik adalah KUNCI DATANYA, bukan datanya.**

Hari ini tiap blob memakai kunci yang diturunkan HKDF dari kunci induk ditambah
garam 128-bit per blob (`envelope.ts`). Usulannya mengubah asal kunci itu, bukan
cara pemakaiannya:

1. Acak kunci data 256-bit untuk blob ini.
2. Enkripsi blobnya AES-256-GCM dengan kunci data itu — **tidak berubah**.
3. Bungkus kunci data itu dengan kunci publik, simpan bungkusannya di header.

Untuk membaca, aplikasi mengirim **bungkusan beberapa ratus bita** ke layanan
pembuka dan menerima kunci datanya kembali, lalu mendekripsi blobnya sendiri.

Alternatif yang ditolak: mengirim seluruh blob untuk dibuka di sana. Lampiran
dibatasi 5 MB × 5 berkas per pengaduan (`complaints.constants.ts`), jadi membuka
satu tiket memindahkan sampai 25 MB bolak-balik, dan **plaintext-nya melintas
jaringan** — sementara pengembangan hari ini belum memakai TLS sama sekali.

### Format amplop `SKM1 v2`

Header sekarang 49 bita: `SKM1` + versi + garam 16 + IV 12 + tag 16. Byte versi
sudah ada sejak awal dan belum pernah dipakai; v2 memakainya.

```
SKM1 | 0x02 | panjang_bungkusan (2 bita) | bungkusan | IV 12 | tag 16 | ciphertext
```

Garam HKDF hilang pada v2 karena kuncinya tak lagi diturunkan. `dekripsi()` saat
ini **tidak memeriksa byte versi** dan pesan galatnya menyebut "v1" secara
tertulis; itu harus diperbaiki lebih dulu, sebagai perubahan tersendiri, sebelum
v2 ada.

Keduanya hidup berdampingan. Blob v1 tetap terbuka dengan `DATA_ENCRYPTION_KEY`
selama masa peralihan, dan kolom basis data memakai awalan `enc:v2:` di samping
`enc:v1:` yang sudah ada.

### Kontrak layanan pembuka

```
POST /buka-kunci
  { "bungkusan": ["base64...", "base64...", ...] }   maksimum 100 per permintaan
→ { "kunci":     ["base64...", "base64...", ...] }   urutannya sama
```

**Berkelompok sejak hari pertama, bukan ditambahkan belakangan.** Satu halaman
daftar pengaduan mendekripsi `uraian` tiap baris; tanpa pengelompokan, satu
halaman berisi 20 baris berarti 20 perjalanan jaringan berurutan.

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

Ini bagian yang paling mudah diremehkan dan paling banyak menyentuh berkas.

`dekripsiKolom` hari ini **sinkron**, dipanggil langsung di tengah pemetaan
entity. Layanan pembuka di jaringan membuatnya asinkron, dan itu menjalar ke
setiap pemanggil:

| Berkas                       | Yang didekripsi                        |
| ---------------------------- | -------------------------------------- |
| `auth.service.ts:201-203`    | `nik`, `nomorHp`, `alamat`             |
| `complaints.service.ts:696`  | pembantu dekripsi umum                 |
| `complaints.service.ts:707`  | `uraian`, per baris daftar             |
| `complaints.service.ts:752`  | `pesan` balasan                        |
| `responses.service.ts:321`   | `nomorHp` responden                    |
| `app.setup.ts:208`           | lampiran, di middleware `/uploads/*`   |

Jalur daftar pengaduan adalah yang terberat: ia mendekripsi per baris, jadi
pengumpulan bungkusan harus dilakukan **sebelum** pemetaan, bukan di dalamnya.

## 6. Migrasi

Jalurnya sudah ada dan teruji — `rotasi-kunci.cjs`, `enkripsi-kolom-lama.cjs`,
dan `enkripsi-lampiran-lama.cjs`, ketiganya idempoten (`enkripsi-at-rest.md`
bagian 6–7). Yang diperlukan adalah memperluasnya, bukan menulis dari nol.

Urutannya:

1. Perbaiki `dekripsi()` agar memeriksa byte versi. Sendirian, lebih dulu.
2. Tambahkan format v2 beserta ujinya; belum ada yang menulisnya.
3. Bangun layanan pembuka, mulai dari versi lokal untuk pengembangan.
4. Ubah seluruh jalur dekripsi menjadi asinkron.
5. Tulis baru dalam v2; baca masih menerima v1 dan v2.
6. Jalankan migrasi ulang atas data lama.
7. Sesudah dipastikan tak ada lagi blob v1, dan tidak sebelum itu, pensiunkan
   `DATA_ENCRYPTION_KEY`.

Langkah 7 tak boleh didahulukan. Membuang kunci lama selagi masih ada blob v1
berarti kehilangan data itu selamanya.

## 7. Pengembangan tanpa server Helpdesk

Layanan pembuka versi lokal membaca kunci privat dari berkas, dan **menolak
menyala bila `NODE_ENV=production`**. Tanpa penjagaan itu, bentuk pengembangan
akan menemukan jalannya ke produksi dan mengembalikan celah yang justru ditutup
dokumen ini.

Uji otomatis memakai pasangan kunci tetap, mengikuti pola `KUNCI_UJI` di
`kunci.ts` — tertulis di kode, tak pernah di berkas `.env` mana pun.

## 8. Pertanyaan untuk developer Helpdesk

1. Layanan pembuka, atau sekadar tempat menyimpan berkas kunci? (Bagian 3.1)
2. Algoritma pembungkusnya apa — RSA-OAEP, atau X25519/HPKE?
3. Siapa yang boleh memanggilnya, dan bagaimana pemanggilnya dibuktikan sah?
4. Berapa laju maksimum yang diizinkan, dan apa yang terjadi bila dilampaui?
5. Siapa penanggung jawab kunci, dan bagaimana prosedur cadangannya?
6. Jaminan ketersediaan: berapa lama SKEMA boleh menganggap layanan itu mati?
7. Bagaimana rotasi kunci dilakukan dari sisi mereka?

Tanpa jawaban nomor 1, pekerjaan ini tidak boleh dimulai: bila jawabannya
"sekadar menyimpan", seluruh usulan ini tak menutup celah apa pun.

## 9. Perkiraan besarnya pekerjaan

Bukan janji tanggal, melainkan urutan besaran. Bagian 5 — mengubah seluruh jalur
dekripsi menjadi asinkron — lebih besar daripada bagian kriptonya sendiri, dan
ia menyentuh jalur yang dilalui setiap pembacaan pengaduan dan setiap pembukaan
profil. Setiap langkah di bagian 6 adalah satu commit tersendiri dengan ujinya
sendiri, dan langkah 1 sampai 3 dapat dikerjakan sebelum Helpdesk menjawab.
