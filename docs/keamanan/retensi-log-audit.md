# Retensi Log Audit

> Ditujukan bagi yang mengoperasikan dan men-deploy SKEMA — tim Helpdesk sebagai
> pemegang server dan akun Admin Kabupaten, serta pengembang berikutnya.

Sejak 30 September 2026 `audit_logs` dipangkas otomatis. Sebelum itu tabel ini
tak pernah dipangkas sama sekali, dan itu keputusan tersurat. Yang berubah bukan
sikap terhadap jejak audit, melainkan bahwa sekarang ada **kebijakan**: batas
waktu tetap, dibaca dari satu variabel lingkungan, sama untuk semua baris, dan
dinyatakan kepada pembacanya di halaman Log Aktivitas. Pemangkasan berdasar
kebijakan berbeda dari penghapusan sesuka hati, dan bedanya justru terletak pada
dinyatakan atau tidaknya.

## Pengaturan

| Variabel | Arti | Baku |
| --- | --- | --- |
| `AUDIT_RETENTION_DAYS` | Lama jejak audit disimpan, dalam hari | **tidak disetel = retensi mati** |
| `AUDIT_RETENTION_ALLOW_SHORT` | Izin tersurat untuk nilai di bawah 7 hari | `false` |

`.env.example` menuliskan `14` — dua minggu, angka yang diminta pengguna.

**Tidak disetel berarti tidak ada yang dihapus, dan itu disengaja.** Ketiadaan
konfigurasi harus berarti menyimpan data: kalau bakunya menghapus, satu env yang
lupa disalin ke server baru akan memusnahkan log tanpa ada seorang pun
memutuskannya.

Bentuk nilainya dijaga gerbang boot (`env.validation.ts`): wajib bilangan bulat
minimal 1, sehingga salah tulis menolak boot alih-alih diam-diam mematikan
retensi. `parseInt('dua minggu')` menghasilkan `NaN`, dan `NaN` yang lolos ke
penjadwal adalah kegagalan yang baru terlihat berbulan-bulan kemudian.

### Palang tujuh hari

Nilai di bawah 7 hari **menolak berjalan** dan mencatat peringatan. Satu digit
hilang mengubah 14 menjadi 1, dan itu memusnahkan hampir seluruh log dalam satu
lintasan yang tak dapat dibatalkan. Bila nilai sependek itu memang disengaja,
setel `AUDIT_RETENTION_ALLOW_SHORT=true` — memakainya menjadi keputusan
operasional yang tercatat, bukan kelonggaran yang diam-diam berlaku.

## Cara ia berjalan

Penjadwalnya ada **di dalam aplikasi** (`AuditRetensiService`), bukan cron
sistem, dan berjalan sekali sehari pukul **03.00 waktu server**. Penghapusannya
berkelompok 5.000 baris, sebab halaman Log Aktivitas membaca tabel yang sama dan
satu `DELETE` raksasa menahannya lama.

Penjadwal di dalam aplikasi dipilih karena repo ini belum punya artefak
penyebaran produksi, dan penyebarannya dikerjakan tim lain di server yang bukan
dikendalikan pengembang. Mekanisme yang menuntut pemasangan cron di sisi server
adalah mekanisme yang besar kemungkinannya tak pernah dipasang — dan kebijakan
retensi yang tak pernah berjalan lebih buruk daripada tak punya kebijakan, sebab
sistemnya mengaku menyimpan 14 hari sementara kenyataannya menyimpan selamanya.

Banyak instance API tidak menjadi masalah: penghapusannya idempoten
(`timestamp < batas`), jadi instance kedua tak menemukan apa pun.

## Melihat dampaknya sebelum menyalakan

Mode kering menghitung tanpa menghapus, dan itu **bakunya** pada skrip:

```bash
pnpm --filter @skm-spm/api pangkas:audit
```

Menjalankannya sungguhan sekarang, tanpa menunggu jam 03.00:

```bash
pnpm --filter @skm-spm/api pangkas:audit -- --hapus
```

Skrip ini memakai layanan yang **sama** dengan penjadwal; ia tidak menyalin
hitungan batas waktunya.

## Jejak pemangkasan

Pemangkasan **tidak** menulis baris ke `audit_logs`. Itu keputusan sadar, dengan
dua sebab:

1. `audit_logs.actor_id` NOT NULL dan ber-FK ke `users`, jadi mencatatnya
   menuntut sebuah akun sistem — dan akun itu akan muncul di halaman Manajemen
   User, sebab `UsersService.findAll` hanya menyaring `deletedAt`.
2. Lebih menentukan: catatan itu tinggal di tabel yang sama, sehingga
   pemangkasan berikutnya menghapusnya juga. Jejaknya punah tepat pada saat
   dibutuhkan.

Yang dipakai sebagai gantinya:

- **Log aplikasi di sisi server.** Setiap pemangkasan mencatat satu baris
  bertingkat `log`, memuat batas waktunya dan jumlah baris yang dibuang.
- **Keterangan di halaman Log Aktivitas.** Angkanya dibaca dari
  `GET /audit-logs/retensi`, bukan ditulis mati di frontend, supaya keterangan
  di layar tak pernah berbeda dari kebijakan yang sebenarnya berlaku. Inilah
  yang menerangkan kekosongan di luar rentang retensi **sebelum** ada yang
  bertanya — kosong tanpa sebab pada halaman audit terbaca sebagai aplikasi
  rusak, atau lebih buruk, sebagai jejak yang dihilangkan orang.

## Yang masih terbuka

**Dua minggu itu pendek untuk sebuah log audit.** Insiden biasanya baru
ditemukan berminggu-minggu kemudian, dan yang pertama dicari justru jejak yang
sudah terhapus. Angka retensi resmi masih menunggu jawaban Diskominfo; karena
itulah ia ada di env, bukan di dalam kode — jawaban mereka cukup mengubah satu
baris tanpa deploy kode baru.

Bila kelak dibutuhkan catatan pemangkasan yang dapat dikueri dari antarmuka dan
tidak punah, jalan termurahnya tabel kecil tanpa FK ke `users`. Itu tetap tidak
menuntut akun sistem.
