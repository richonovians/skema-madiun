/**
 * Kontrak envelope respons API yang konsisten untuk SELURUH endpoint & klien
 * (web, Android, iOS). Sukses dan error memakai bentuk yang seragam agar mudah
 * diproses semua klien.
 */
export interface ApiResponseMeta {
  timestamp: string;
  path: string;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: {
    code: string;
    details: unknown;
  };
  meta: ApiResponseMeta;
}
