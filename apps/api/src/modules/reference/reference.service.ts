import { Injectable } from '@nestjs/common';
import { ComplaintCategoryEntity } from './entities/complaint-category.entity';
import { UnsurEntity } from './entities/unsur.entity';
import { TingkatPengaduan } from '@prisma/client';
import { COMPLAINT_CATEGORIES, kategoriPengaduan, SKM_UNSUR } from './reference.constants';

@Injectable()
export class ReferenceService {
  /** Kembalikan 9 unsur baku SKM sebagai entity response. */
  getUnsur(): UnsurEntity[] {
    return SKM_UNSUR.map((unsur) => new UnsurEntity(unsur));
  }

  /**
   * Kategori baku pengaduan — seluruhnya, atau satu tingkat saja bila diminta.
   *
   * Urutan daftarnya DIPERTAHANKAN apa adanya (kecamatan dulu, lalu kabupaten,
   * masing-masing dengan "Lainnya" di posisi terakhir). Dropdown memakainya
   * langsung; mengurutkan alfabetis di sini akan menenggelamkan "Lainnya" ke
   * tengah daftar.
   */
  getComplaintCategories(tingkat?: TingkatPengaduan): ComplaintCategoryEntity[] {
    const daftar = tingkat ? kategoriPengaduan(tingkat) : COMPLAINT_CATEGORIES;
    return daftar.map((category) => new ComplaintCategoryEntity(category));
  }
}
