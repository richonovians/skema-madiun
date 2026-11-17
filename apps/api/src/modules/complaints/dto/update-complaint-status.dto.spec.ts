import { ComplaintStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateComplaintStatusDto } from './update-complaint-status.dto';

const dto = (over: Record<string, unknown> = {}) =>
  plainToInstance(UpdateComplaintStatusDto, {
    status: ComplaintStatus.ditolak,
    catatan: 'Bukan kewenangan OPD ini.',
    ...over,
  });

const medanGalat = async (over: Record<string, unknown> = {}) =>
  (await validate(dto(over))).map((e) => e.property);

describe('UpdateComplaintStatusDto', () => {
  it('menerima badan yang sah', async () => {
    expect(await medanGalat()).toHaveLength(0);
  });

  it('menerima badan tanpa catatan', async () => {
    // Catatan opsional di DTO; kewajibannya per status ditegakkan service
    // lewat `STATUS_WAJIB_CATATAN`.
    expect(await medanGalat({ catatan: undefined })).toHaveLength(0);
  });

  it('memangkas catatan berisi spasi saja menjadi string kosong (BUG-082)', () => {
    // Tanpa pemangkasan, `'   '` bernilai truthy dan lolos pemeriksaan
    // `!dto.catatan` di service, sehingga status wajib-catatan diterima
    // tanpa alasan apa pun bagi pelapor.
    expect(dto({ catatan: '   ' }).catatan).toBe('');
  });

  it('memangkas spasi di tepi catatan', () => {
    expect(dto({ catatan: '  Berkas belum lengkap.  ' }).catatan).toBe('Berkas belum lengkap.');
  });

  it('menolak catatan yang melampaui 1000 aksara', async () => {
    // Batas yang SAMA dengan `AlihkanComplaintDto.catatan`: keduanya menulis
    // ke kolom `complaint_status_history.catatan` yang sama.
    expect(await medanGalat({ catatan: 'a'.repeat(1001) })).toContain('catatan');
  });

  it('menolak catatan bukan string', async () => {
    expect(await medanGalat({ catatan: 123 })).toContain('catatan');
  });
});
