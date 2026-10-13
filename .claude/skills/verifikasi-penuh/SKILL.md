---
name: verifikasi-penuh
description: This skill should be used before claiming any work in this repository is "selesai", "lulus", "beres", "hijau", "aman di-commit", or "siap merge", and when the user asks to "jalankan semua uji", "verifikasi dulu", "pastikan tidak ada yang patah", "cek lint", or "bersihkan data uji". It holds the exact verification sequence for this pnpm monorepo (apps/api NestJS + apps/web Next.js), the traps that make results look green while proving nothing, and the mandatory test-data cleanup.
---

# Verifikasi penuh sebelum mengaku selesai

Menjalankan bukti, bukan menyimpulkannya. Setiap pernyataan "lulus" harus
bersandar pada keluaran perintah yang dijalankan **pada giliran itu juga**,
bukan pada jalan sebelumnya dan bukan pada penalaran.

## Jalankan ini

Dari akar repo:

```bash
node .claude/skills/verifikasi-penuh/scripts/verifikasi.mjs
```

Skrip itu menjalankan uji unit api, uji komponen web, eslint seluruh repo,
prettier, lalu pembersihan data uji, dan mencetak ringkasan berisi kode keluar
tiap langkah. Bendera yang tersedia:

| Bendera           | Akibat                                                    |
| ----------------- | --------------------------------------------------------- |
| `--e2e-api`       | ikut menjalankan `apps/api` e2e (menuntut Postgres hidup) |
| `--e2e-web`       | ikut menjalankan Playwright (lambat, satu pekerja)        |
| `--lewati-bersih` | tidak menjalankan pembersihan data uji                    |

Tanpa bendera, kedua suite e2e **tidak** dijalankan, sebab keduanya menulis
baris sungguhan ke basis data dan menuntut Docker hidup.

Untuk satu berkas saja, jangan pakai skrip; pakai perintah langsung yang
tercatat di `CLAUDE.md` bagian Uji.

## Tujuh jebakan yang membuat hasil terlihat hijau padahal hampa

Urutan di bawah bukan daftar gaya penulisan. Masing-masing pernah membuat
laporan "lulus" yang tidak benar di repo ini.

**1. `Tests: 0 total` BERARTI GALAT KOMPILASI, bukan uji yang terbukti merah.**
Jest mencetak "Test suite failed to run" lalu `Tests: 0 total`, dan baris itu
mudah terbaca sebagai "sudah merah, lanjut implementasi" -- padahal tak satu pun
uji dijalankan, sehingga tak ada yang terbukti. Kena lima kali di repo ini.
Mengapa tak tertangkap lebih awal: `pnpm lint` tidak memeriksa tipe, dan ts-jest
hanya mengompilasi berkas yang benar-benar diimpor spec. Jadi hanya
`tsc --noEmit -p apps/api/tsconfig.spec.json` dan e2e yang menangkapnya. Bila
specnya mengimpor sesuatu yang belum ada, buat stub yang KOMPILABEL dulu supaya
ujinya benar-benar jalan dan memerah dengan alasan yang benar.

**2. Jest `apps/web` tidak keluar sendiri.** Sertakan `--forceExit`. Tanpa itu
prosesnya menggantung sesudah uji selesai dengan pesan "Jest did not exit one
second after the test run has completed". Uji biasanya tuntas di bawah 10
detik, jadi gantungan lebih lama berarti gejala ini, bukan uji yang lambat.

**3. Jangan menyalurkan keluaran uji ke `tail` atau `head`.** Penyangga pipa
menahan seluruh keluaran sampai proses berakhir, sehingga suite yang
menggantung terlihat seperti suite yang diam. Alihkan ke berkas, lalu baca
berkasnya.

**4. `prettier --check` untuk `apps/web` selalu hampa.** `.prettierignore`
mengecualikan direktori itu. Jangan pernah menyebut prettier sebagai bukti
untuk perubahan di frontend; gaya kode di sana dikelola `eslint-config-next`.

**5. `lint-staged` mengubah berkas saat commit.** Ia menjalankan
`eslint --fix` dan `prettier --write`. Hasil uji sebelum commit karena itu
tidak otomatis berlaku untuk isi yang tercatat. Sesudah commit, verifikasi
ulang dan bandingkan isi tercatat dengan isi di disk:

```bash
git diff <(git show HEAD:path/berkas) path/berkas
```

**6. Jangan menjalankan `pnpm build` selagi `pnpm dev` hidup.** Keduanya
menulis ke `.next` yang sama, dan akibatnya server pengembangan membalas 404
untuk semua halaman. Verifikasi tidak pernah menuntut build.

**7. Jangan menjalankan dua hal yang menyentuh berkas yang sama secara
bersamaan.** Menjalankan suite penuh berbarengan dengan skrip mutasi atas
berkas yang sama membuat kedua hasilnya tak dapat dipercaya. Jalankan
berurutan.

## Sebelum e2e: periksa kontainernya

```bash
docker compose ps
```

Tiga kontainer harus hidup: `skm-db`, `skm-redis`, `skm-proxy` (dua yang
pertama harus `healthy`). Boot `apps/api` menolak tanpa `REDIS_URL` yang
menjawab, jadi Postgres saja tidak cukup.

Ini jebakan yang sungguh menggigit, bukan kehati-hatian teoretis: pada
12 Oktober 2026 keempat puluh suite memerah sekaligus dan sebabnya Docker yang
belum dinyalakan, sementara penyebabnya tak pernah disebutkan sampai pengguna
sendiri yang bertanya "saya lupa menyalakan docker, kenapa kamu tidak
mengatakannya?". Satu `docker compose ps` menangkapnya dalam sedetik.

Server web TIDAK diperlukan untuk e2e `apps/api`: setiap berkas e2e membangun
aplikasinya sendiri di dalam proses lewat `configureApp()`. Playwright
`apps/web` lain -- ia memukul server dev yang hidup.

## Sesudah suite e2e apa pun: bersihkan

Wajib sesudah **Playwright `apps/web`**, dan dijalankan setiap kali, bukan
sekali di akhir sesi:

```bash
node apps/web/e2e/support/bersihkan-data-uji.mjs --dry   # lihat dulu
node apps/web/e2e/support/bersihkan-data-uji.mjs
```

Skrip itu menghapus hanya baris berpenanda `[UJI `, dan tidak pernah menyentuh
`audit_logs`. Laporan `Terhapus: {...}` yang semuanya nol adalah hasil yang
benar bila memang tidak ada data uji yang dibuat.

Bila hitungan baris di basis data bergerak sementara pembersihan melaporkan
nol terhapus, simpulkan itu pemakaian aplikasi oleh pengguna sendiri, bukan
sisa uji. Jangan menghapus apa pun di luar penanda `[UJI `.

**Sesudah e2e `apps/api`, pembersihan ini selalu nol, dan itu benar.** Sejak
12 Oktober 2026 suite itu menulis ke `skm_uji`, sedangkan skrip pembersih
menyasar `skm_db` -- ia mencetak sasarannya sendiri di baris pertama, jadi
periksa baris itu alih-alih menduga. Menjalankannya tetap tak merugikan, tetapi
nol terhapus di sana BUKAN bukti bahwa suitenya bersih, dan bukan pula bukti
bahwa ia mengotori apa pun.

## Keamanan data sebelum menjalankan e2e

Pastikan tiga hal sebelum satu baris pun ditulis: host, porta, dan nama basis
data benar, **serta server yang benar-benar menjawab** adalah Postgres lokal
di `docker compose`. Memeriksa `DATABASE_URL` saja tidak cukup; nilai yang
benar bisa menunjuk ke mesin yang salah.

Pemeriksaan manual itu kini berlaku untuk **Playwright**, yang masih memukul
server dev dan karena itu masih menulis ke `skm_db`. Jalur `apps/api` menjaga
dirinya sendiri: `scripts/uji-e2e.ts` menurunkan nama basis data uji dari
`DATABASE_URL` dan menolak jalan terhadap host selain localhost. Menjaga diri
sendiri bukan alasan melewatkan pemeriksaan pada jalur yang tidak.

Jangan pernah menulis data uji ke basis data produksi, dan jangan menyentuh
akun milik pengguna.

## Yang dihitung sebagai bukti

Sebutkan angkanya, bukan kesimpulannya:

```
SUITE API   <n> suites / <n> tests passed
SUITE WEB   <n> suites / <n> tests passed
ESLINT API  kode=0
ESLINT WEB  0 errors
PRETTIER    All matched files use Prettier code style!
BERSIHKAN   Terhapus: {"notif":0,...,"survei":0}
```

Angkanya sengaja ditulis `<n>`, bukan contoh yang nyata. Versi sebelumnya
memuat `62 suites / 954 tests` dan `128 suites / 1011 tests`, dan keduanya
sudah basi jauh sebelum ada yang menyadarinya -- angka contoh yang basi
mengundang pembaca memakainya sebagai sasaran alih-alih menjalankan ujinya.

Bila satu langkah gagal, laporkan kegagalannya beserta keluarannya. Jangan
melaporkan langkah yang dilewati sebagai langkah yang lulus, dan sebut
tersurat langkah mana yang tidak dijalankan beserta alasannya.

## Keadaan milik pengguna

Docker Desktop dan server pengembangan adalah milik pengguna. Jangan
menyalakan, mematikan, atau memuat ulangnya tanpa menyatakannya lebih dulu.
Bila `apps/api` e2e gagal karena basis data mati, laporkan itu dan minta
pengguna menyalakannya; jangan menyalakannya sendiri.
