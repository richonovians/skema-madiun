import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Detail Survei',
};

/**
 * Rute ini SEBELUMNYA 404 (laporan bug 2026-08-19): folder `[id]/` hanya berisi
 * `responses/`, tanpa `page.jsx` sendiri -- jadi memangkas '/responses' dari URL,
 * atau menebak pola URL dari area lain, mendarat di halaman 404 Next.
 *
 * Admin OPD tidak punya halaman detail survei tersendiri (hasil IKM-nya ada di
 * /admin-opd/analytics, pertanyaannya di builder), dan SELURUH tautan yang ada di
 * aplikasi memang mengarah ke daftar responsnya. Jadi yang benar di sini adalah
 * mengalihkan, bukan membuat halaman baru yang tak pernah ditautkan.
 *
 * Server component: pengalihan terjadi sebelum HTML dikirim, tanpa JS di klien.
 */
export default async function AdminOpdSurveyPage({ params }) {
  const { id } = await params;
  redirect(`/admin-opd/surveys/${id}/responses`);
}
