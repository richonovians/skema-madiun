export const DUMMY_SURVEY_RESPONSES = [
  {
    id: 'resp-1',
    surveyId: '1',
    surveyTitle: 'Kuesioner Evaluasi Layanan Rawat Inap RSUD',
    opd: 'RSUD Daerah',
    respondent: {
      id: 'usr-1',
      name: 'Ahmad Faisal',
      email: 'ahmad.faisal@example.com',
      phone: '081234567890'
    },
    submittedAt: '2026-08-01T10:30:00Z',
    score: 4.5,
    answers: [
      {
        questionId: 'q-1',
        question: 'Bagaimana kesesuaian persyaratan pelayanan dengan jenis pelayanannya?',
        questionType: 'multiple_choice',
        answer: 'Sangat Cepat / Sangat Baik',
        options: [
          'Tidak Cepat / Tidak Baik',
          'Kurang Cepat / Kurang Baik',
          'Cepat / Baik',
          'Sangat Cepat / Sangat Baik'
        ],
        score: 4
      },
      {
        questionId: 'q-2',
        question: 'Apakah persyaratan pelayanan mudah dipahami?',
        questionType: 'multiple_choice',
        answer: 'Sangat Mudah',
        options: [
          'Tidak Mudah',
          'Kurang Mudah',
          'Cukup Mudah',
          'Sangat Mudah'
        ],
        score: 4
      },
      {
        questionId: 'q-3',
        question: 'Bagaimana sikap petugas saat memberikan pelayanan?',
        questionType: 'multiple_choice',
        answer: 'Sangat Ramah',
        options: [
          'Tidak Ramah',
          'Kurang Ramah',
          'Cukup Ramah',
          'Sangat Ramah'
        ],
        score: 4
      }
    ],
    suggestion: 'Pertahankan pelayanan yang sudah baik ini. Kalau bisa, tambah fasilitas ruang tunggu.'
  },
  {
    id: 'resp-2',
    surveyId: '1',
    surveyTitle: 'Kuesioner Evaluasi Layanan Rawat Inap RSUD',
    opd: 'RSUD Daerah',
    respondent: {
      id: 'usr-2',
      name: 'Budi Santoso',
      email: 'budi.santoso@example.com',
      phone: '085678901234'
    },
    submittedAt: '2026-08-02T14:15:00Z',
    score: 3.8,
    answers: [
      {
        questionId: 'q-1',
        question: 'Bagaimana kesesuaian persyaratan pelayanan dengan jenis pelayanannya?',
        questionType: 'multiple_choice',
        answer: 'Cepat / Baik',
        options: [
          'Tidak Cepat / Tidak Baik',
          'Kurang Cepat / Kurang Baik',
          'Cepat / Baik',
          'Sangat Cepat / Sangat Baik'
        ],
        score: 3
      },
      {
        questionId: 'q-2',
        question: 'Apakah persyaratan pelayanan mudah dipahami?',
        questionType: 'multiple_choice',
        answer: 'Cukup Mudah',
        options: [
          'Tidak Mudah',
          'Kurang Mudah',
          'Cukup Mudah',
          'Sangat Mudah'
        ],
        score: 3
      },
      {
        questionId: 'q-3',
        question: 'Bagaimana sikap petugas saat memberikan pelayanan?',
        questionType: 'multiple_choice',
        answer: 'Kurang Ramah',
        options: [
          'Tidak Ramah',
          'Kurang Ramah',
          'Cukup Ramah',
          'Sangat Ramah'
        ],
        score: 2
      }
    ],
    suggestion: 'Perlu ditambah jumlah loket agar antrean tidak terlalu panjang.'
  },
  {
    id: 'resp-3',
    surveyId: '2',
    surveyTitle: 'Survei Kepuasan Layanan Apotek Puskesmas',
    opd: 'Dinas Kesehatan',
    respondent: {
      id: 'usr-3',
      name: 'Citra Dewi',
      email: 'citra.dewi@example.com',
      phone: '081112223333'
    },
    submittedAt: '2026-07-28T09:00:00Z',
    score: 4.8,
    answers: [
      {
        questionId: 'q-1',
        question: 'Bagaimana kebersihan fasilitas puskesmas?',
        questionType: 'multiple_choice',
        answer: 'Sangat Bersih',
        options: [
          'Tidak Bersih',
          'Kurang Bersih',
          'Bersih',
          'Sangat Bersih'
        ],
        score: 4
      },
      {
        questionId: 'q-2',
        question: 'Bagaimana kelengkapan obat di apotek?',
        questionType: 'multiple_choice',
        answer: 'Lengkap',
        options: [
          'Tidak Lengkap',
          'Kurang Lengkap',
          'Lengkap',
          'Sangat Lengkap'
        ],
        score: 3
      },
      {
        questionId: 'q-3',
        question: 'Apakah penjelasan dokter mudah dimengerti?',
        questionType: 'multiple_choice',
        answer: 'Sangat Jelas',
        options: [
          'Tidak Jelas',
          'Kurang Jelas',
          'Jelas',
          'Sangat Jelas'
        ],
        score: 4
      }
    ],
    suggestion: 'Semuanya sudah bagus, tingkatkan terus pelayanannya.'
  }
];
