import { Injectable } from '@nestjs/common';
import { UnsurEntity } from './entities/unsur.entity';
import { SKM_UNSUR } from './reference.constants';

@Injectable()
export class ReferenceService {
  /** Kembalikan 9 unsur baku SKM sebagai entity response. */
  getUnsur(): UnsurEntity[] {
    return SKM_UNSUR.map((unsur) => new UnsurEntity(unsur));
  }
}
