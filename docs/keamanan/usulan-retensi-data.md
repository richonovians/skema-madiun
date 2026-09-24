# Usulan masa simpan data pribadi

**Status: USULAN. Belum ditetapkan siapa pun.**

Dokumen ini dibuat 25 September 2026 untuk dibawa ke Diskominfo Kabupaten Madiun.
Angka di dalamnya belum berlaku dan belum mengikat. Tujuannya menyediakan sesuatu
yang konkret untuk disetujui atau dicoret, sebab rapat yang dibuka dengan halaman
kosong biasanya berakhir tanpa keputusan.

Halaman publik `/kebijakan-privasi` mencantumkan angka yang sama dan menyatakan
tersurat bahwa angka itu masih usulan. Begitu Diskominfo menetapkan angkanya,
dua tempat harus diperbarui bersamaan: dokumen ini dan halaman tersebut.

## Kenapa ini mendesak

Undang-Undang Nomor 27 Tahun 2022 menuntut data pribadi disimpan dengan batas
waktu yang dinyatakan. Sekarang tidak ada batas di mana pun: tidak di kode, tidak
di dokumen, tidak di gerbang persetujuan.

Akibatnya bukan sekadar administratif. Pengaduan memuat nama, nomor telepon, dan
uraian yang sering kali berisi keluhan pribadi warga terhadap pelayanan. Tanpa
batas simpan, seluruhnya menumpuk tanpa akhir, dan setiap tahun tambahan
memperbesar kerugian bila suatu saat terjadi kebocoran.

## Usulan

| Data                                       | Usulan masa simpan                | Dihitung sejak                  |
| ------------------------------------------ | --------------------------------- | ------------------------------- |
| Pengaduan, lampiran, dan percakapannya     | 5 tahun                           | Status pengaduan menjadi selesai |
| Respons survei beserta identitas pengisinya | 2 tahun                           | Respons dikirim                 |
| Data demografis responden                  | Selama akun aktif, lalu 1 tahun   | Akun dinonaktifkan              |
| Catatan aktivitas (`audit_logs`)           | 5 tahun                           | Baris dicatat                   |
| Akun yang sudah tidak dipakai              | 2 tahun                           | Akun dinonaktifkan              |

### Alasan tiap angka

**Pengaduan, 5 tahun.** Pengaduan adalah bukti bahwa warga pernah melapor dan
instansi pernah menindaklanjuti. Ia perlu bertahan cukup lama untuk melayani
sengketa, audit, dan pemeriksaan yang datang belakangan. Lima tahun mengikuti
kebiasaan penyimpanan arsip pelayanan publik yang aktif. Lebih pendek berisiko
menghapus bukti yang masih diperlukan; lebih panjang menahan data yang sudah
tidak dipakai siapa pun.

**Respons survei, 2 tahun.** Yang bernilai jangka panjang dari survei adalah
angka IKM-nya, bukan siapa yang mengisinya. Nilai IKM dihitung dan dilaporkan per
periode, dan sesudah periode berikutnya lewat, respons perseorangan hampir tak
pernah dibuka lagi. Dua tahun memberi ruang untuk perbandingan antarperiode
sambil membuang identitas yang tak lagi berfungsi.

Catatan penting: yang dimaksud dihapus di sini adalah identitas pengisinya, bukan
angkanya. Rekapitulasi IKM harus tetap ada selamanya, dan memang tidak memuat
identitas siapa pun.

**Data demografis, selama akun aktif lalu 1 tahun.** Data ini melekat pada akun
dan hanya berguna selama akunnya dipakai.

**Catatan aktivitas, 5 tahun.** Disamakan dengan pengaduan dengan sengaja: log
audit ada justru untuk menjelaskan apa yang terjadi pada pengaduan. Log yang mati
lebih dulu daripada data yang dijaganya tidak menjelaskan apa-apa.

Perlu diketahui: tabel ini sekarang berisi sekitar 7.000 baris dan bertambah
terus tanpa pernah dipangkas. Menghapus barisnya juga sudah dipalang sebagai
perusakan jejak audit, dan pemalangan itu benar. Karena itu yang diputuskan
bukan "boleh dihapus atau tidak", melainkan **ke mana diarsipkan** sesudah lima
tahun.

**Akun tidak dipakai, 2 tahun.** Saat ini "hapus akun" berupa penghapusan lunak:
`deletedAt` dan `isActive:false` diisi, tetapi nama dan alamat surelnya tetap
tersimpan. Bagi UU PDP itu belum penghapusan. Usulannya, dua tahun sesudah
dinonaktifkan, identitasnya dianonimkan sementara barisnya tetap ada supaya
pengaduan yang pernah dikirimnya tidak kehilangan induk.

## Yang perlu diputuskan Diskominfo

1. Apakah kelima angka di atas diterima, atau ada ketentuan kearsipan daerah yang
   mengikat dan harus dipakai?
2. Ke mana `audit_logs` diarsipkan sesudah lewat masa simpannya, dan siapa yang
   menyimpannya?
3. Siapa pejabat yang menerima dan memutuskan permintaan warga untuk mengakses,
   mengoreksi, atau menghapus datanya? Halaman kebijakan sekarang mengarahkan ke
   `diskominfo@madiunkab.go.id`, dan alamat itu perlu dipastikan ada yang
   menanganinya.
4. Berapa lama permintaan semacam itu dijanjikan dijawab?

## Sesudah ditetapkan

Baru setelah angkanya disahkan, penegakannya dibuat di kode. Urutan ini
disengaja: skrip yang menghapus data warga berdasarkan angka yang belum
disepakati adalah cara kehilangan data sungguhan.

Bentuk yang diusulkan mengikuti pola perkakas yang sudah ada di `apps/api/scripts/`:
punya mode `--uji` yang hanya melaporkan tanpa menghapus, aman dijalankan
berulang, dan mencetak jumlah baris yang terkena sebelum menyentuh apa pun.
Penjadwalan otomatis menyusul paling akhir, sesudah mode laporannya dijalankan
beberapa kali dan hasilnya masuk akal.
