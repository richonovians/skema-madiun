import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { ConsentService } from './consent.service';

const cu = (actingRole: Role, userId = 5): CurrentUser => ({
  userId,
  roles: [actingRole],
  actingRole,
  opdId: null,
});

function buat() {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ConsentService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, prisma, audit };
}

describe('ConsentService.isRequired', () => {
  /**
   * Hanya `responden` yang dimintai persetujuan. Admin bertindak dalam kapasitas
   * jabatan atas data warga, bukan sebagai subjek data atas dirinya sendiri —
   * memblokir mereka berarti menghentikan pekerjaan untuk persetujuan yang tak
   * relevan bagi mereka.
   */
  it.each([
    [Role.responden, null, true],
    [Role.responden, new Date(), false],
    [Role.kabupaten, null, false],
    [Role.opd, null, false],
    [Role.superuser, null, false],
  ])('%s dengan consentAt=%s -> %s', (role, consentAt, harapan) => {
    expect(ConsentService.isRequired(role, consentAt as Date | null)).toBe(harapan);
  });
});

describe('ConsentService.assertConsented', () => {
  it('responden yang SUDAH menyetujui -> lolos', async () => {
    const { service, prisma } = buat();
    prisma.user.findUnique.mockResolvedValue({ consentAt: new Date() });

    await expect(service.assertConsented(cu(Role.responden))).resolves.toBeUndefined();
  });

  it('responden yang BELUM menyetujui -> Forbidden berpesan jelas', async () => {
    const { service, prisma } = buat();
    prisma.user.findUnique.mockResolvedValue({ consentAt: null });

    await expect(service.assertConsented(cu(Role.responden))).rejects.toThrow(ForbiddenException);
    await expect(service.assertConsented(cu(Role.responden))).rejects.toThrow(/persetujuan/i);
  });

  /**
   * Peran non-responden tak pernah dimintai persetujuan, jadi tak perlu pula
   * membebani setiap permintaan mereka dengan satu kueri tambahan.
   */
  it.each([Role.kabupaten, Role.opd, Role.superuser])(
    '%s lolos TANPA menyentuh basis data',
    async (role) => {
      const { service, prisma } = buat();

      await expect(service.assertConsented(cu(role))).resolves.toBeUndefined();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    },
  );

  /**
   * Permintaan pengguna 14 September 2026: kalimat "Buka halaman Persetujuan
   * terlebih dahulu" jadi TOMBOL di layar. Frontend mengenalinya lewat KODE,
   * bukan bunyi pesan -- alasannya sudah tertulis di api.js untuk kasus
   * ROLE_SELECTION_REQUIRED: "pesan bisa diubah kapan saja tanpa ada yang
   * memerah".
   */
  it('penolakannya membawa kode CONSENT_REQUIRED, bukan sekadar pesan', async () => {
    const { service, prisma } = buat();
    prisma.user.findUnique.mockResolvedValue({ consentAt: null });

    const galat = await service.assertConsented(cu(Role.responden)).catch((e) => e);

    expect(galat).toBeInstanceOf(ForbiddenException);
    expect((galat.getResponse() as { code?: string }).code).toBe('CONSENT_REQUIRED');
  });

  /**
   * Kalimat perintahnya DIBUANG dari pesan: tombol di layar yang melakukannya,
   * dan menyisakan keduanya berarti menyuruh hal yang sama dua kali.
   */
  it('pesannya tak lagi menyuruh membuka halaman sendiri', async () => {
    const { service, prisma } = buat();
    prisma.user.findUnique.mockResolvedValue({ consentAt: null });

    const galat = await service.assertConsented(cu(Role.responden)).catch((e) => e);

    expect(galat.message).toMatch(/persetujuan/i);
    expect(galat.message).not.toMatch(/buka halaman/i);
  });

  it('pengguna hilang dari DB -> Forbidden, bukan lolos diam-diam', async () => {
    const { service, prisma } = buat();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.assertConsented(cu(Role.responden))).rejects.toThrow(ForbiddenException);
  });
});

describe('ConsentService.record', () => {
  it('mengisi consentAt dan mencatatnya ke audit log', async () => {
    const { service, prisma, audit } = buat();
    prisma.user.findUnique.mockResolvedValue({ consentAt: null });
    prisma.user.update.mockResolvedValue({ consentAt: new Date('2026-08-27T00:00:00Z') });

    const hasil = await service.record(cu(Role.responden, 9));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { consentAt: expect.any(Date) },
      select: { consentAt: true },
    });
    // Persetujuan adalah catatan hukum (UU PDP) -- harus punya jejak waktu &
    // pelaku, bukan hanya satu kolom yang bisa tertimpa tanpa bekas.
    expect(audit.record).toHaveBeenCalledWith(9, 'consent', 'auth', {});
    expect(hasil).toBeInstanceOf(Date);
  });

  /**
   * Idempoten: memanggil ulang TIDAK menggeser waktu persetujuan. Menimpanya
   * berarti kehilangan kapan persetujuan sebenarnya diberikan — justru satu-satunya
   * hal yang perlu dibuktikan bila kelak ditanyakan.
   */
  it('sudah menyetujui -> tanggal ASLI dipertahankan, tak ada tulis ulang', async () => {
    const { service, prisma, audit } = buat();
    const asli = new Date('2026-08-01T10:00:00Z');
    prisma.user.findUnique.mockResolvedValue({ consentAt: asli });

    const hasil = await service.record(cu(Role.responden, 9));

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(hasil).toEqual(asli);
  });
});
