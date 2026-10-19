import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Penjaga indeks waktu pada `audit_logs` (28 September 2026).
 *
 * SETIAP pembukaan halaman log aktivitas mengurutkan dengan
 * `orderBy: { timestamp: 'desc' }` (audit.service.ts), dan penyaringan rentang
 * tanggal memakai kolom yang sama. Sebelum indeks ini ada, tabelnya hanya punya
 * indeks pada `actor_id` dan `entitas`, sehingga PostgreSQL membaca SELURUH
 * tabel lalu mengurutkannya hanya untuk menampilkan 20 baris pertama. Terukur
 * pada 6.951 baris: rencana kuerinya `Seq Scan` + `Sort` dengan perkiraan biaya
 * 379; dengan indeksnya `Index Scan Backward` dengan biaya 1,33.
 *
 * Biaya itu tumbuh lurus dengan jumlah baris, dan `audit_logs` tak pernah
 * dipangkas -- menghapus barisnya dipalang sebagai perusakan jejak audit, dan
 * pemalangan itu benar. Jadi tabel ini HANYA bertambah, dan halamannya akan
 * melambat diam-diam sampai tiba-tiba terasa sekali.
 *
 * KENAPA DIJAGA DARI BERKAS, BUKAN DARI RENCANA KUERI: uji yang menjalankan
 * `EXPLAIN` lalu menuntut bukan `Seq Scan` TAMPAK lebih meyakinkan, tetapi akan
 * merah di CI tanpa ada yang rusak. Basis data runner lahir hampir kosong, dan
 * pada tabel sekecil itu membaca seluruh tabel MEMANG pilihan yang benar.
 *
 * Dua hal dijaga terpisah dengan sengaja. Deklarasi di schema.prisma saja tak
 * cukup: ia hanya mengubah apa yang Prisma KIRA ada. Tanpa berkas migrasi,
 * basis data sungguhan tak pernah menerima indeksnya, dan tak ada yang memerah.
 */
const AKAR_API = join(__dirname, '..', '..', '..');
const SKEMA = readFileSync(join(AKAR_API, 'prisma', 'schema.prisma'), 'utf8');
const DIR_MIGRASI = join(AKAR_API, 'prisma', 'migrations');

function blokModel(nama: string): string {
  const cocok = SKEMA.match(new RegExp(`model ${nama} \\{([\\s\\S]*?)\\n\\}`));
  if (!cocok) {
    throw new Error(`model ${nama} tidak ada di schema.prisma`);
  }
  return cocok[1];
}

function semuaMigrasi(): string {
  return readdirSync(DIR_MIGRASI)
    .filter((nama) => !nama.endsWith('.toml'))
    .map((nama) => {
      try {
        return readFileSync(join(DIR_MIGRASI, nama, 'migration.sql'), 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
}

describe('indeks waktu audit_logs', () => {
  it('menemukan model AuditLog beserta petanya (penjaga premis)', () => {
    // Bila penelusurannya rusak dan mengembalikan blok kosong, kedua kasus di
    // bawah lulus tanpa memeriksa apa pun.
    expect(blokModel('AuditLog')).toContain('@@map("audit_logs")');
  });

  it('schema.prisma mendeklarasikan indeks pada timestamp', () => {
    expect(blokModel('AuditLog')).toMatch(/@@index\(\[timestamp\]\)/);
  });

  it('ada migrasi yang benar-benar membuat indeksnya di basis data', () => {
    // Spasi dibiarkan longgar supaya uji ini menjaga MAKSUDNYA, bukan gaya
    // penulisan SQL-nya.
    expect(semuaMigrasi()).toMatch(
      /CREATE\s+INDEX[\s\S]{0,80}ON\s+"audit_logs"\s*\(\s*"timestamp"\s*\)/i,
    );
  });
});
