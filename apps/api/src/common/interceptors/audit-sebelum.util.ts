import type { PembacaSebelum } from '../decorators/audit.decorator';

/**
 * Pembaca nilai lama untuk ketiga rute `update_status` (BUG-064, 3 November
 * 2026). Tanpanya baris audit hanya memuat nilai baru dari permintaan, sehingga
 * draf -> aktif dan ditutup -> aktif (pembukaan kembali survei yang hasil
 * IKM-nya sudah terbit) tercatat sama persis.
 *
 * Masing-masing hanya memilih kolom status. Jangan memperluas `select`: hasilnya
 * masuk `audit_logs.detail`, yang dibaca Admin Kabupaten.
 */
export const statusSurveiSebelum: PembacaSebelum = (prisma, id) =>
  prisma.survey.findUnique({ where: { id }, select: { status: true } });

export const statusPenggunaSebelum: PembacaSebelum = (prisma, id) =>
  prisma.user.findUnique({ where: { id }, select: { isActive: true } });

export const statusPengaduanSebelum: PembacaSebelum = (prisma, id) =>
  prisma.complaint.findUnique({ where: { id }, select: { status: true } });
