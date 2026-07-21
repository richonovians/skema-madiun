/**
 * Basis entity response. Menyediakan constructor yang menyalin objek parsial
 * (mis. baris Prisma) ke instance, sehingga subclass cukup mendeklarasikan field.
 *
 * Pola serialisasi (dipakai ClassSerializerInterceptor global):
 * - Field publik ter-*expose* secara default (strategi expose-all).
 * - Field internal ditandai `@Exclude()` agar tak keluar di response, DAN
 *   `@ApiHideProperty()` agar tak muncul di skema Swagger.
 *
 * Contoh:
 *   export class OpdEntity extends BaseEntity<OpdEntity> {
 *     id: number;
 *     nama: string;
 *   }
 *   return new OpdEntity(prismaRow);
 */
export abstract class BaseEntity<T> {
  constructor(partial: Partial<T>) {
    Object.assign(this, partial);
  }
}
