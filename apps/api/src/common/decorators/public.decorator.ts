import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Menandai handler/controller sebagai publik (melewati RolesGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
