import { Injectable } from '@nestjs/common';
import { ComplaintCategoryEntity } from './entities/complaint-category.entity';
import { UnsurEntity } from './entities/unsur.entity';
import { COMPLAINT_CATEGORIES, SKM_UNSUR } from './reference.constants';

@Injectable()
export class ReferenceService {
  /** Kembalikan 9 unsur baku SKM sebagai entity response. */
  getUnsur(): UnsurEntity[] {
    return SKM_UNSUR.map((unsur) => new UnsurEntity(unsur));
  }

  /** Kembalikan daftar kategori baku pengaduan (aduan/lapor/lainnya). */
  getComplaintCategories(): ComplaintCategoryEntity[] {
    return COMPLAINT_CATEGORIES.map((category) => new ComplaintCategoryEntity(category));
  }
}
