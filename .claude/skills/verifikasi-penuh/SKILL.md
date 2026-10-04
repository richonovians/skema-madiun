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

## Enam jebakan yang membuat hasil terlihat hijau padahal hampa

Urutan di bawah bukan daftar gaya penulisan. Masing-masing pernah membuat
laporan "lulus" yang tidak benar di repo ini.

**1. Jest `apps/web` tidak keluar sendiri.** Sertakan `--forceExit`. Tanpa itu
prosesnya menggantung sesudah uji selesai dengan pesan "Jest did not exit one
second after the test run has completed". Uji biasanya tuntas di bawah 10
detik, jadi gantungan lebih lama berarti gejala ini, bukan uji yang lambat.

**2. Jangan menyalurkan keluaran uji ke `tail` atau `head`.** Penyangga pipa
menahan seluruh keluaran sampai proses berakhir, sehingga suite yang
menggantung terlihat seperti suite yang diam. Alihkan ke berkas, lalu baca
berkasnya.

**3. `prettier --check` untuk `apps/web` selalu hampa.** `.prettierignore`
mengecualikan direktori itu. Jangan pernah menyebut prettier sebagai bukti
untuk perubahan di frontend; gaya kode di sana dikelola `eslint-config-next`.

**4. `lint-staged` mengubah berkas saat commit.** Ia menjalankan
`eslint --fix` dan `prettier --write`. Hasil uji sebelum commit karena itu
tidak otomatis berlaku untuk isi yang tercatat. Sesudah commit, verifikasi
ulang dan bandingkan isi tercatat dengan isi di disk:

```bash
git diff <(git show HEAD:path/berkas) path/berkas
```

**5. Jangan menjalankan `pnpm build` selagi `pnpm dev` hidup.** Keduanya
menulis ke `.next` yang sama, dan akibatnya server pengembangan membalas 404
untuk semua halaman. Verifikasi tidak pernah menuntut build.

**6. Jangan menjalankan dua hal yang menyentuh berkas yang sama secara
bersamaan.** Menjalankan suite penuh berbarengan dengan skrip mutasi atas
berkas yang sama membuat kedua hasilnya tak dapat dipercaya. Jalankan
berurutan.

## Sesudah suite e2e apa pun: bersihkan

Wajib, dan dijalankan **setiap kali sesudah menjalankan apa pun**, bukan sekali
di akhir sesi:

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

## Keamanan data sebelum menjalankan e2e

Pastikan tiga hal sebelum satu baris pun ditulis: host, porta, dan nama basis
data benar, **serta server yang benar-benar menjawab** adalah Postgres lokal
di `docker compose`. Memeriksa `DATABASE_URL` saja tidak cukup; nilai yang
benar bisa menunjuk ke mesin yang salah.

Jangan pernah menulis data uji ke basis data produksi, dan jangan menyentuh
akun milik pengguna.

## Yang dihitung sebagai bukti

Sebutkan angkanya, bukan kesimpulannya:

```
SUITE API   62 suites / 954 tests passed
SUITE WEB   128 suites / 1011 tests passed
ESLINT API  kode=0
ESLINT WEB  0 errors
PRETTIER    All matched files use Prettier code style!
BERSIHKAN   Terhapus: {"notif":0,...,"survei":0}
```

Bila satu langkah gagal, laporkan kegagalannya beserta keluarannya. Jangan
melaporkan langkah yang dilewati sebagai langkah yang lulus, dan sebut
tersurat langkah mana yang tidak dijalankan beserta alasannya.

## Keadaan milik pengguna

Docker Desktop dan server pengembangan adalah milik pengguna. Jangan
menyalakan, mematikan, atau memuat ulangnya tanpa menyatakannya lebih dulu.
Bila `apps/api` e2e gagal karena basis data mati, laporkan itu dan minta
pengguna menyalakannya; jangan menyalakannya sendiri.
