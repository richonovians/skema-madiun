import {
  adaptBuilderQuestion,
  adaptBuilderQuestions,
  adaptSurvey,
  toCreateSurveyPayload,
  toChangeJenisPayload,
  toUpdateSurveyPayload,
} from '../survey.adapter';

/**
 * JENIS SURVEI DAN KERANGKA UNSUR (8 Oktober 2026). `jenis` datang dari backend
 * (`skm_permenpanrb` atau `custom`) dan diteruskan APA ADANYA: adapter tidak
 * menebaknya dari isi pertanyaan. Pertanyaan unsur membawa `namaUnsur` resmi
 * terpisah dari `teks`, yang kini berisi kalimat pertanyaan buatan OPD.
 */
describe('adaptSurvey — jenis', () => {
  const entity = (over = {}) => ({
    id: 7,
    opdId: 1,
    judul: 'Survei Uji',
    periode: '2026-Q2',
    status: 'draft',
    ...over,
  });

  it('meneruskan jenis apa adanya', () => {
    expect(adaptSurvey(entity({ jenis: 'skm_permenpanrb' })).jenis).toBe('skm_permenpanrb');
    expect(adaptSurvey(entity({ jenis: 'custom' })).jenis).toBe('custom');
  });

  it('tidak mengarang jenis bila backend belum mengirimnya', () => {
    expect(adaptSurvey(entity()).jenis).toBeUndefined();
  });
});

describe('toCreateSurveyPayload — jenis', () => {
  it('mengirim jenis ke CreateSurveyDto', () => {
    const payload = toCreateSurveyPayload({
      title: 'Survei SKM',
      period: '2026-Q1',
      jenis: 'skm_permenpanrb',
    });

    expect(payload.jenis).toBe('skm_permenpanrb');
    expect(payload.judul).toBe('Survei SKM');
  });
});

describe('adaptBuilderQuestion — unsur baku', () => {
  const unsur = (over = {}) => ({
    id: 11,
    teks: 'Seberapa mudah persyaratan layanan kami?',
    tipe: 'skala',
    isIkmUnsur: true,
    kodeUnsur: 'U2',
    namaUnsur: 'Sistem, Mekanisme, dan Prosedur',
    options: [],
    ...over,
  });

  it('judul kartu memuat kode dan NAMA RESMI unsur, kalimat OPD ada di text', () => {
    const q = adaptBuilderQuestion(unsur(), 0);

    expect(q.isBaku).toBe(true);
    expect(q.kode).toBe('U2');
    expect(q.namaUnsur).toBe('Sistem, Mekanisme, dan Prosedur');
    expect(q.title).toBe('U2 · Sistem, Mekanisme, dan Prosedur');
    expect(q.text).toBe('Seberapa mudah persyaratan layanan kami?');
  });

  it('tanpa namaUnsur (backend lama) judul memakai kode dan teks, tidak "undefined"', () => {
    const q = adaptBuilderQuestion(unsur({ namaUnsur: undefined, teks: 'Persyaratan' }), 0);

    expect(q.title).toBe('U2 · Persyaratan');
    expect(q.namaUnsur).toBeNull();
  });

  it('pertanyaan tambahan: bukan baku, tanpa kode, judul bernomor', () => {
    const q = adaptBuilderQuestion(
      unsur({ isIkmUnsur: false, kodeUnsur: null, namaUnsur: null, teks: 'Saran Anda?' }),
      3,
    );

    expect(q.isBaku).toBe(false);
    expect(q.kode).toBeNull();
    expect(q.title).toBe('Pertanyaan Kustom #3');
  });

  it('penomoran pertanyaan tambahan tidak menghitung unsur baku', () => {
    const daftar = adaptBuilderQuestions([
      unsur({ id: 1, kodeUnsur: 'U1', namaUnsur: 'Persyaratan' }),
      unsur({ id: 2, isIkmUnsur: false, kodeUnsur: null, namaUnsur: null }),
      unsur({ id: 3, isIkmUnsur: false, kodeUnsur: null, namaUnsur: null }),
    ]);

    expect(daftar.map((q) => q.title)).toEqual([
      'U1 · Persyaratan',
      'Pertanyaan Kustom #1',
      'Pertanyaan Kustom #2',
    ]);
  });
});

describe('tujuan, metode nilai, dan nilaiSurvei (8 Oktober 2026)', () => {
  const entity = (over = {}) => ({
    id: 7,
    opdId: 1,
    judul: 'Survei Uji',
    periode: '2026-Q2',
    status: 'draft',
    jenis: 'custom',
    ...over,
  });
  const nilaiSurvei = {
    judul: 'Indeks Kepuasan',
    nilai: 85,
    tampilan: '85%',
    kategori: 'Sangat Puas',
  };

  it('adaptSurvey meneruskan tujuan, metodeNilai, dan nilaiSurvei apa adanya', () => {
    const s = adaptSurvey(
      entity({ tujuan: 'kepuasan', metodeNilai: 'indeks_persen', nilaiSurvei }),
    );

    expect(s.tujuan).toBe('kepuasan');
    expect(s.metodeNilai).toBe('indeks_persen');
    expect(s.nilaiSurvei).toEqual(nilaiSurvei);
  });

  it('nilaiSurvei null tetap null; backend lama tanpa kuncinya juga null, bukan karangan', () => {
    expect(adaptSurvey(entity({ nilaiSurvei: null })).nilaiSurvei).toBeNull();
    expect(adaptSurvey(entity()).nilaiSurvei).toBeNull();
    expect(adaptSurvey(entity()).tujuan).toBeUndefined();
  });

  it('toCreateSurveyPayload custom memuat tujuan dan metodeNilai', () => {
    const payload = toCreateSurveyPayload({
      title: 'S',
      period: '2026-Q1',
      jenis: 'custom',
      tujuan: 'evaluasi',
      metodeNilai: 'rata_rata',
    });

    expect(payload.tujuan).toBe('evaluasi');
    expect(payload.metodeNilai).toBe('rata_rata');
  });

  it('toCreateSurveyPayload SKM tidak mengirim kunci tujuan/metodeNilai setelah diserialisasi', () => {
    const payload = JSON.parse(
      JSON.stringify(toCreateSurveyPayload({ title: 'S', period: '2026-Q1', jenis: 'skm_permenpanrb' })),
    );

    expect('tujuan' in payload).toBe(false);
    expect('metodeNilai' in payload).toBe(false);
  });

  it('toUpdateSurveyPayload meneruskan tujuan dan metodeNilai bila diberikan', () => {
    const payload = toUpdateSurveyPayload({
      title: 'S',
      period: '2026-Q1',
      tujuan: 'penilaian',
      metodeNilai: 'indeks_persen',
    });

    expect(payload.tujuan).toBe('penilaian');
    expect(payload.metodeNilai).toBe('indeks_persen');
  });

  it('toUpdateSurveyPayload tanpa tujuan/metode tidak mengirim kuncinya (SKM)', () => {
    const payload = JSON.parse(
      JSON.stringify(toUpdateSurveyPayload({ title: 'S', period: '2026-Q1' })),
    );

    expect('tujuan' in payload).toBe(false);
    expect('metodeNilai' in payload).toBe(false);
  });
});

describe('toChangeJenisPayload (8 Oktober 2026)', () => {
  it('meneruskan jenis, tujuan, dan metodeNilai ke ChangeSurveyJenisDto', () => {
    expect(
      toChangeJenisPayload({ jenis: 'custom', tujuan: 'evaluasi', metodeNilai: 'rata_rata' }),
    ).toEqual({ jenis: 'custom', tujuan: 'evaluasi', metodeNilai: 'rata_rata' });
  });
});
