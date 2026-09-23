# Enkripsi At-Rest: Apa yang Terlindungi, dan Apa yang Tidak

Berlaku sejak 23 September 2026.

Dokumen ini untuk siapa pun yang menggelar, memelihara, atau memulihkan sistem
SKM & Pengaduan Masyarakat. Bacalah bagian **Kunci** sampai habis sebelum
menyalakan enkripsi di lingkungan mana pun.

---

## 1. Yang terenkripsi, dan yang tidak

| Data | Keadaan | Dengan apa |
|---|---|---|
| Lampiran pengaduan di disk | **Terenkripsi** | AES-256-GCM, `DATA_ENCRYPTION_KEY` |
| `complaints.uraian` (isi pengaduan) | **Terenkripsi** | AES-256-GCM, `DATA_ENCRYPTION_KEY` |
| `complaint_replies.pesan` (percakapan) | **Terenkripsi** | AES-256-GCM, `DATA_ENCRYPTION_KEY` |
| Berkas cadangan | **Terenkripsi** | AES-256-GCM, `BACKUP_ENCRYPTION_KEY` |
| Lalu lintas jaringan | **Terenkripsi** | TLS 1.2/1.3 di nginx (`infra/nginx/prod.conf`) |
| `users.nama`, `users.email` | **Polos** | lihat di bawah |
| `complaints.judul` | **Polos** | lihat di bawah |
| Seluruh kolom lain | **Polos** | lihat di bawah |
| Berkas data PostgreSQL | **Bergantung server** | enkripsi volume, bagian 5 |

### Mengapa tidak semuanya

**`users.nama` dicari.** Pencarian log audit memakai `contains` pada kolom itu
(`audit.service.ts`). Kolom terenkripsi tak dapat dicari tanpa membongkar
seluruh tabel lebih dulu, jadi mengenkripsinya akan mematahkan fitur yang
dipakai Admin Kabupaten setiap hari. Ini pertukaran yang disadari, bukan
kelalaian.

**Yang dipilih adalah dua kolom teks bebas yang ditulis warga.** Di sistem
pengaduan, ceritanya sendirilah yang paling pribadi. Keduanya diperiksa dan
terbukti tak pernah dicari, sehingga mengenkripsinya tak mematahkan apa pun.

**Jangan menyebut basis data ini "terenkripsi" tanpa keterangan.** Ia
terenkripsi sebagian, dan tabel di atas adalah batas tepatnya.

---

## 2. Kunci

Ada **dua**, masing-masing 64 karakter heksadesimal, keduanya di
`apps/api/.env`.

| Kunci | Melindungi | Boleh keluar dari server? |
|---|---|---|
| `DATA_ENCRYPTION_KEY` | lampiran + dua kolom | **Tidak.** |
| `BACKUP_ENCRYPTION_KEY` | berkas cadangan | Ya, kepada pemegang salinan cadangan. |

Membuat kunci baru:

```bash
openssl rand -hex 32
```

### Kehilangan kunci berarti kehilangan datanya

Bukan "sulit dipulihkan". Hilang. Tak ada pintu belakang di dalam kode ini, dan
memang tak boleh ada: pintu belakang yang dapat dipakai Anda dapat dipakai
orang lain juga.

Kalau `DATA_ENCRYPTION_KEY` hilang, seluruh lampiran dan seluruh isi pengaduan
menjadi bita acak selamanya. Cadangan tidak menolong, karena isi cadangan itu
sendiri terenkripsi dengan kunci yang sama.

### Prosedur pencadangan kunci (WAJIB, sebelum menyalakan enkripsi)

1. Salin kedua baris kunci dari `apps/api/.env`.
2. Simpan di **dua tempat terpisah yang bukan mesin ini**. Misalnya pengelola
   kata sandi organisasi dan amplop tersegel di brankas. Satu salinan bukan
   salinan.
3. Catat tanggal pembuatannya.
4. **Jangan** menaruhnya di repositori, tiket, catatan rapat, atau percakapan
   obrolan. `.env` sudah diabaikan git; yang berbahaya adalah salinan yang
   dibuat orang.
5. Uji salinannya: tutup `.env`, ambil kunci dari tempat simpanan, dan pastikan
   ia benar-benar terbaca. Salinan yang tak pernah dibuka bukan salinan.

### Cadangan tanpa kunci data adalah hiasan

Berkas cadangan memuat kolom dan lampiran yang terenkripsi
`DATA_ENCRYPTION_KEY`. Memulihkannya di server baru menuntut **kedua** kunci.
`manifes.json` di setiap cadangan mencatat sidik jari keduanya (bukan kuncinya)
supaya kelak dapat diketahui kunci mana yang dibutuhkan.

---

## 3. Cadangan

```bash
cd apps/api
pnpm cadangan
```

Hasilnya `cadangan/skm-<stempel>/` berisi `dump.sql.enc` (terenkripsi),
`uploads/` (lampiran, sudah terenkripsi masing-masing), dan `manifes.json`.

Skrip memakai `pg_dump` dari PATH bila ada, selain itu dari container `skm-db`,
dan **selalu mencetak pilihannya**. Versi `pg_dump` harus sepadan dengan server
PostgreSQL 18; container menjaminnya, PATH belum tentu. Paksa dengan
`BACKUP_PG_DUMP_MODE=local` atau `=docker`.

Bila ada lampiran yang **belum terenkripsi**, skrip menyebut namanya satu per
satu dan memperingatkan bahwa berkas itu mendarat polos di dalam cadangan.
Jalankan `pnpm enkripsi:lampiran` lalu cadangkan ulang.

Simpan cadangan **di luar mesin ini**. `cadangan/` diabaikan git dengan
sengaja: riwayat git disalin ke setiap klona dan sering berakhir di forge yang
aksesnya lebih luas daripada server aslinya.

---

## 4. Pemulihan

```bash
cd apps/api
pnpm pulihkan -- --dari cadangan/skm-20260923-024643 --db nama_basis_data_tujuan
```

Dump didekripsi dan **tagnya diverifikasi sampai tuntas sebelum satu pernyataan
SQL pun dijalankan**. Berkas hasil dekripsi tak pernah ada kecuali
verifikasinya lolos.

Tiga penjaga, semuanya hanya dapat dilewati dengan `--paksa`:

1. `--db` wajib diketik. Tak ada tujuan baku.
2. Tujuan yang sama dengan `DATABASE_URL` ditolak.
3. Tujuan yang sudah berisi tabel ditolak.

**Lampiran tidak disalin otomatis.** Menyalin balik direktori unggahan dapat
menimpa lampiran yang lebih baru daripada cadangannya, dan itu kehilangan data
yang tak bergejala. Skrip mencetak jalurnya; penyalinannya keputusan Anda.

### Hasil pengujian pemulihan

Diuji 23 September 2026 terhadap basis data pengembangan. Cadangan `skm_db`
dipulihkan ke basis data baru `skm_db_uji_pulih`; cacah barisnya identik di
keenam tabel yang diperiksa:

| Tabel | Asli | Hasil pemulihan |
|---|---|---|
| users | 7 | 7 |
| complaints | 10 | 10 |
| complaint_replies | 63 | 63 |
| surveys | 5 | 5 |
| survey_responses | 7 | 7 |
| audit_logs | 6740 | 6740 |

Lalu satu bita terakhir sebuah **salinan** cadangan dibalik. Pemulihannya
ditolak dengan `unable to authenticate data`, dan basis data tujuannya berisi
**0 tabel** sesudahnya, membuktikan tak satu pun pernyataan SQL sempat berjalan.

Ulangi pengujian ini setiap kali server berubah. Cadangan yang belum pernah
dipulihkan bukan cadangan.

---

## 5. Enkripsi volume basis data

PostgreSQL versi open source **tidak punya** enkripsi at-rest bawaan. Yang
melindungi berkas basis datanya hanyalah enkripsi volume di tingkat sistem
operasi, pada disk yang memuat direktori data.

Aplikasi **tidak dapat memeriksanya**. Karena itu `DB_STORAGE_ENCRYPTED=true`
wajib dinyatakan di produksi, dan tanpa itu aplikasi menolak boot. Baris itu
adalah **pernyataan Anda**, bukan bukti. Periksa sungguhan sebelum mengisinya.

**Linux:**

```bash
lsblk -o NAME,FSTYPE,MOUNTPOINT
cryptsetup status <nama-perangkat>
```

Cari `crypto_LUKS` pada perangkat yang memuat `/var/lib/postgresql`, dan
`cryptsetup status` yang menjawab `is active`.

**Windows:**

```powershell
manage-bde -status C:
```

Cari `Conversion Status: Fully Encrypted` dan `Protection Status: Protection On`
pada drive yang memuat volume Docker.

### Apa yang dilindungi masing-masing

Enkripsi volume dan enkripsi kolom menutup ancaman yang **berbeda**, dan tak
satu pun menggantikan yang lain:

- **Enkripsi volume** melindungi dari disk atau mesin yang dicuri. Ia tak
  melindungi apa pun dari `DATABASE_URL` yang bocor, sebab basis data yang
  berjalan melayani siapa pun yang punya kredensial.
- **Enkripsi kolom** melindungi dari kredensial yang bocor, dump yang tercecer,
  dan cadangan yang berpindah tangan. Ia tak melindungi kolom yang sengaja
  dibiarkan polos (bagian 1).

---

## 6. Migrasi

Dua skrip, keduanya idempoten dan aman dijalankan ulang.

```bash
cd apps/api
pnpm enkripsi:lampiran -- --uji   # laporan saja
pnpm enkripsi:lampiran            # sungguhan

pnpm enkripsi:kolom -- --uji      # laporan saja, DAN membuktikan pulang-pergi tiap baris
pnpm enkripsi:kolom               # sungguhan
```

`enkripsi:kolom` membuktikan pulang-pergi **setiap baris di memori** sebelum
menulis apa pun, dan membatalkan seluruh lari bila satu baris saja gagal.
Jalankan `--uji` lebih dulu, dan jalankan **sesudah** ada cadangan yang terbukti
dapat dipulihkan.

Data yang belum dimigrasi tetap terbaca: baris polos dan berkas polos dikenali
dan disajikan apa adanya, sehingga migrasi boleh bertahap. Berkas polos yang
tersisa disebut namanya di log aplikasi setiap kali diakses.

---

## 7. Bila kunci harus diganti

Belum ada perkakas rotasi kunci. Menggantinya menuntut mendekripsi seluruh data
dengan kunci lama lalu mengenkripsinya dengan kunci baru, dan itu pekerjaan
tersendiri yang belum ditulis.

Yang **tidak boleh** dilakukan: mengganti isi `DATA_ENCRYPTION_KEY` di `.env`
tanpa memigrasi data. Akibatnya bukan galat saat boot, melainkan setiap
lampiran dan setiap pengaduan menjadi tak terbaca satu per satu, saat ada yang
membukanya.
