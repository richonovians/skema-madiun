---
name: commit-dan-merge
description: This skill should be used when the user asks to "commit", "commit dan push", "simpan perubahan ini", "merge ke main", "buat commit", or "siapkan pesan commit" in this repository. It holds the branch-commit-merge sequence this repo requires, the commit-message rules (always `git commit -F`, Indonesian, with the Co-Authored-By footer), the files that must never be committed, and the post-commit re-verification that lint-staged makes necessary.
---

# Ritual commit dan merge

## Urutan

Periksa cabang lebih dulu: `git branch --show-current`.

**Di `main`:** cabangkan, commit, lalu merge kembali.

```bash
git checkout -b <jenis>/<nama-ringkas>
git add <berkas tersebut saja>
git commit -F <berkas-pesan>
git checkout main
git merge --no-ff <jenis>/<nama-ringkas> -m "merge: <ringkasan>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Jangan berhenti di cabang. Repo ini tidak memakai alur pull request; merge
langsung ke `main` adalah penyelesaiannya. `--no-ff` wajib supaya simpul merge
tetap ada dan satu pekerjaan tetap terbaca sebagai satu kesatuan.

**Di cabang `tester`:** cukup commit. **Jangan** merge ke `main`. Ini
pengecualian tersurat dari aturan di atas.

**Di cabang lain:** commit, lalu merge ke `main` dengan `--no-ff` seperti pola
pertama.

`develop` sudah mati meski `origin/HEAD` masih menunjuk ke sana. Jangan
memakainya.

## Push

Push hanya bila pengguna memintanya. `git commit` dan `git push` adalah dua
permintaan terpisah; "commit" sendirian tidak memberi izin mengirim.

Bila push ditolak pemeriksa izin, jangan mencari jalan memutar: jangan lewat
alat lain, jangan dipecah-pecah, jangan ditunda ke giliran berikutnya.
Laporkan penolakannya, sebutkan commit mana yang menunggu, dan serahkan
keputusannya kepada pengguna.

Dari luar kantor, push dan pull dapat menjawab 403 karena Cloudflare, bukan
karena kredensial salah. Gejalanya `cf-mitigated: challenge` pada POST.
Kenali itu sebagai masalah jaringan, bukan masalah akses.

## Pesan commit

**Selalu `git commit -F <berkas>`, tidak pernah `-m`.** Tulis berkas pesannya
di direktori scratchpad sesi, bukan di dalam repo.

Tulis dalam bahasa Indonesia. Akhiri dengan footer:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Isinya menjelaskan **mengapa**, bukan mengulang daftar berkas yang sudah
terbaca dari diff. Sertakan fakta yang tidak enak bila ada: pengukuran yang
ternyata belum lengkap, naskah yang menjadi tidak benar pada hari yang sama ia
ditulis, cacat yang disebabkan sendiri. Commit adalah catatan permanen, dan
alasan yang disembunyikan akan menyesatkan pembaca berikutnya.

Buat commit baru, jangan `--amend` commit yang sudah ada.

Jangan melewati hook (`--no-verify`) dan jangan membatalkan penandatanganan
(`--no-gpg-sign`) kecuali pengguna memintanya tersurat. Hook yang gagal
diselidiki, bukan dilewati.

## Verifikasi ulang SESUDAH commit

`husky` menjalankan `lint-staged`, yang menjalankan `eslint --fix` dan
`prettier --write` atas berkas yang di-stage. **Isi yang tercatat karena itu
bisa berbeda dari isi yang diuji sebelum commit.**

Sesudah commit, pastikan dua hal:

```bash
git status --porcelain                              # harus kosong
git diff <(git show HEAD:path/berkas) path/berkas   # harus tanpa selisih
```

Lalu jalankan verifikasi penuh terhadap isi pascacommit. Prosedurnya ada di
skill `verifikasi-penuh`.

## Yang tidak pernah boleh ikut tercatat

Periksa `git status` dan isi stage sebelum commit.

| Jalur               | Sebab                                            |
| ------------------- | ------------------------------------------------ |
| `.env`, `.env.*`    | rahasia. Hanya `.env.example` yang tercatat      |
| `docs/superpowers/` | dipalang `.gitignore` dan `.git/info/exclude`    |
| `.remember/`        | menyingkirkan dirinya lewat `.gitignore` sendiri |

Nilai rahasia juga tidak pernah dikutip ke pesan commit maupun ke percakapan.
Untuk kunci, yang boleh ditampilkan hanya sidik jari SHA-256 enam belas hex
pertama.

`git rm --cached` diikuti merge ke `main` pernah menghapus berkasnya dari
disk. Salin dulu sebelum melepas pelacakan berkas apa pun.

## Hal yang membuat pohon kerja terlihat kotor tanpa ada yang menyunting

`apps/web/AGENTS.md` memuat blok `nextjs-agent-rules` yang ditulis ulang
`next dev` setiap kali jalan. Ikutkan blok itu dalam commit supaya pohon kerja
bersih; menghapusnya dari diff hanya membuatnya kembali.

## Akhiran baris

Repo menyimpan LF, ditegakkan `.gitattributes` dan `.prettierrc.json`. Skrip
yang menulis berkas di Windows harus menyatakan akhiran barisnya tersurat
(`newline="\n"` di Python, `-Encoding utf8` pada `Out-File`). Tanpa itu CRLF
masuk tanpa ada alat yang memerah, dan baru terlihat sebagai diff yang
seluruh berkasnya berubah.

Untuk memeriksa, hitung bytenya; jangan mengandalkan `grep` atas `\r`:

```bash
python3 -c "b=open('berkas','rb').read(); print('CRLF:', b.count(b'\r\n'))"
```
