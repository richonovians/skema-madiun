# Pertanyaan Integrasi untuk Helpdesk

**Status:** disusun, siap dikirim ke developer Helpdesk. Belum ada jawaban.
**Tanggal disusun:** 5 Oktober 2026. Tanggal pengiriman dan jawabannya dicatat
di sini begitu ada, bukan diingat-ingat.
**Guna berkas ini:** catatan tersurat tentang apa yang ditanyakan dan kapan,
supaya jawaban yang datang berminggu-minggu kemudian dapat ditempelkan ke nomor
yang dijawabnya. Isi di bawah garis adalah naskah yang dikirim apa adanya.

Latar belakangnya ada di `usulan-enkripsi-asimetris.md` (Bagian B) dan di
catatan SSO pada `CLAUDE.md` (Bagian A). Jawaban atas nomor 5 menentukan
apakah seluruh usulan kripto itu dikerjakan atau dibatalkan.

---

Halo rekan Helpdesk,

SKEMA (Survei Kepuasan Masyarakat + pengaduan masyarakat, pemilik Diskominfo
Kab. Madiun) sudah terintegrasi dengan SSO kalian dan login responden sudah
berjalan dari ujung ke ujung. Ada beberapa hal yang perlu kami konfirmasi
sebelum lanjut, terbagi dua: soal SSO yang sudah jalan, dan soal rencana
pengamanan kunci enkripsi.

Terima kasih sebelumnya.

---

## Bagian A — SSO / OIDC (sudah jalan, tinggal konfirmasi)

1. **Nilai klaim `role`.** Pemetaan kami saat ini menjadikan nilai `admin`
   sebagai administrator tingkat kabupaten di SKEMA — peran yang dapat melihat
   dan mengelola data **seluruh** OPD. Mohon dikonfirmasi: nilai apa saja yang
   mungkin muncul di klaim `role` (atau `identity.user_type`), dan akun seperti
   apa yang memegang nilai `admin`? Kami ingin memastikan `admin` di sisi kalian
   memang berarti administrator pemkab, bukan administrator layanan lain yang
   tak seharusnya memperoleh akses seluas itu.

2. **`governance.tenant_id` dan OPD.** Untuk pengguna ASN, kami memakai
   `governance.tenant_id` dari userinfo untuk menautkan pengguna ke OPD-nya.
   Daftar OPD kami disinkron dari kalian dan tiap OPD punya UUID. Mohon
   dikonfirmasi: apakah `governance.tenant_id` yang dikirim di userinfo sama
   persis (UUID yang sama) dengan tenant OPD yang kalian sinkronkan ke kami?

3. **Dokumen integrasi.** Di halaman gateway disebut ada "Panduan integrasi &
   spesifikasi lengkap" dalam PDF, tetapi tautan unduhnya belum berfungsi.
   Bisakah dikirimkan?

4. **`redirect_uri` produksi.** Saat ini yang terdaftar dan berfungsi adalah
   alamat pengembangan kami. Saat SKEMA naik ke produksi, `redirect_uri`-nya
   akan berganti ke domain produksi. Bagaimana prosedur mendaftarkan atau
   mengubahnya dari sisi kalian?

---

## Bagian B — Pengamanan kunci enkripsi (rencana, belum dikerjakan)

Konteks singkat. Data sensitif warga (isi pengaduan, NIK, nomor HP, alamat)
kami simpan terenkripsi. Hari ini kuncinya berada di server aplikasi, sehingga
penyerang yang menguasai server itu memperoleh kunci dan data sekaligus. Rencana
kami: kunci privat dipindahkan ke sisi kalian, dan aplikasi meminta pembukaan
per-item tanpa pernah memegang kunci privatnya. Pertanyaan berikut menentukan
apakah rencana ini bisa dikerjakan dan dalam bentuk apa.

5. **Ini yang paling menentukan: layanan pembuka, atau sekadar penyimpanan?**
   Apakah kalian dapat menyediakan **layanan yang membuka (unwrap) kunci atas
   nama aplikasi tanpa pernah menyerahkan kunci privatnya** — mirip operasi
   `Decrypt`/`unwrap` pada KMS (AWS KMS, Google Cloud KMS, Azure Key Vault,
   HashiCorp Vault, atau HSM via PKCS#11)? Atau yang tersedia hanya penyimpanan
   berkas kunci yang nanti aplikasi ambil saat boot? Bila hanya penyimpanan,
   rencana ini tidak menambah perlindungan apa pun, jadi kami perlu tahu lebih
   dulu.

6. **Algoritma pembungkus.** Kami mengusulkan **RSA-OAEP**, karena JWKS kalian
   sudah memuat kunci RSA 2048 (RS256). Catatan penting: kunci yang ada itu
   untuk tanda tangan (`use: sig`); yang kami butuhkan adalah pasangan kunci
   **baru khusus enkripsi** (`use: enc`). Apakah ini bisa disediakan, atau
   kalian lebih menyarankan algoritma lain (mis. X25519/HPKE)?

7. **Otorisasi pemanggil.** Siapa yang boleh memanggil layanan pembuka itu, dan
   bagaimana pemanggilnya dibuktikan sah (mTLS, token, IP allowlist)?

8. **Batas laju.** Berapa laju maksimum permintaan pembukaan yang diizinkan, dan
   apa yang terjadi bila dilampaui?

9. **Pencadangan kunci.** Bagaimana prosedur pencadangan kunci privatnya, dan di
   mana cadangan itu disimpan? (Kehilangan kunci = kehilangan seluruh data
   terenkripsi secara permanen, jadi ini kritis.)

10. **Ketersediaan.** Bila layanan pembuka tak terjangkau, SKEMA tidak dapat
    membuka data sama sekali. Berapa lama ketidaktersediaan yang masih dianggap
    wajar, dan adakah jaminan uptime?

11. **Rotasi kunci.** Bagaimana rotasi kunci dilakukan dari sisi kalian, dan
    bagaimana aplikasi diberi tahu saat kunci berganti?

12. **TLS.** Jalur ke layanan pembuka membawa kunci dalam keadaan terbuka pada
    arah baliknya, jadi TLS wajib. Apakah endpoint-nya sudah TLS di produksi?

---

Pertanyaan nomor 5 adalah kuncinya: tanpa jawabannya, bagian B tidak bisa
dimulai. Nomor 1 (Bagian A) kami anggap penting dari sisi keamanan karena
menyangkut siapa yang memperoleh akses seluas kabupaten.
