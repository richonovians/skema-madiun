import { Injectable } from '@nestjs/common';
import { ComplaintCategoryEntity } from './entities/complaint-category.entity';
import { ComplaintSubCategoryEntity } from './entities/complaint-sub-category.entity';
import { UnsurEntity } from './entities/unsur.entity';
import { COMPLAINT_CATEGORIES, COMPLAINT_SUB_CATEGORIES, SKM_UNSUR } from './reference.constants';

@Injectable()
export class ReferenceService {
  /** Kembalikan 9 unsur baku SKM sebagai entity response. */
  getUnsur(): UnsurEntity[] {
    return SKM_UNSUR.map((unsur) => new UnsurEntity(unsur));
  }

  /** Kembalikan daftar kategori baku pengaduan. */
  getComplaintCategories(): ComplaintCategoryEntity[] {
    return COMPLAINT_CATEGORIES.map((category) => new ComplaintCategoryEntity(category));
  }

  /** Kembalikan daftar sub-kategori pengaduan (INT-42), opsional difilter per kategori induk. */
  getComplaintSubCategories(kategoriKode?: string): ComplaintSubCategoryEntity[] {
    const source = kategoriKode
      ? COMPLAINT_SUB_CATEGORIES.filter((sub) => sub.kategoriKode === kategoriKode)
      : COMPLAINT_SUB_CATEGORIES;
    return source.map((sub) => new ComplaintSubCategoryEntity(sub));
  }
}
