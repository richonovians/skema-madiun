import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Hapus baris audit milik akun uji SEBELUM akunnya dihapus (13 September 2026).
 *
 * `audit_logs.actor_id` bersifat RESTRICT, jadi akun yang pernah beraksi tak
 * dapat dihapus selama barisnya masih ada. Sebelumnya tak ada spec yang
 * kerepotan: hanya aksi ADMIN yang teraudit, dan akun admin uji jarang ikut
 * membuat data. Begitu aksi warga ikut diaudit, setiap spec yang mengirim
 * pengaduan atau jawaban survei langsung terganjal di teardown-nya sendiri --
 * dengan pesan foreign key, bukan pesan yang menjelaskan sebabnya.
 *
 * Disaring lewat `ssoSubject` yang sama dengan `user.deleteMany` di spec
 * pemanggil, supaya satu daftar akun tak perlu ditulis dua kali dengan cara
 * yang bisa berbeda.
 */
export async function bersihkanAuditAkunUji(
  prisma: PrismaService,
  ssoSubjects: string[],
): Promise<void> {
  const akun = await prisma.user.findMany({
    where: { ssoSubject: { in: ssoSubjects } },
    select: { id: true },
  });
  if (akun.length === 0) return;
  await prisma.auditLog.deleteMany({ where: { actorId: { in: akun.map((a) => a.id) } } });
}
