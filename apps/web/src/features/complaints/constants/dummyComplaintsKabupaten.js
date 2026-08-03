export const dummyComplaintsKabupaten = [
  {
    id: "CMP-2026-0089",
    reporter: { name: "Rina Kirana", initials: "RK" },
    title: "Keterlambatan Pelayanan Farmasi Puskesmas",
    dateStr: "18 Juli 2026",
    createdAt: "2026-07-18T08:30:00Z",
    status: "Diproses",
    progress: 50,
    opd: { id: 1, name: "Dinas Kesehatan", pic: "Bapak Agus (Admin OPD)" },
    category: "Pelayanan Kesehatan",
    priority: "Tinggi",
    kecamatan: "Mejayan",
    description: "Saya sudah antre 2 jam di Puskesmas Mejayan, namun obat belum juga selesai diracik. Petugas farmasi terlihat hanya 1 orang. Mohon segera ditindaklanjuti karena banyak lansia yang menunggu dan kelelahan.",
    chronology: "08:00 Daftar poli.\n08:30 Periksa selesai.\n08:35 Menyerahkan resep ke farmasi.\n10:30 Obat belum selesai.",
    sla: { isOverdue: true, remainingHours: -12, slaDeadline: "2026-07-20T08:30:00Z", totalDuration: 48, elapsed: 60 },
    ageDays: 3,
    stats: {
      timeToVerify: "5 Menit",
      timeToFirstResponse: "2 Jam 15 Menit",
      totalDuration: "Sedang Berjalan",
      estimatedCompletion: "20 Juli 2026"
    },
    attachments: [
      { id: 1, name: "Foto_Antrean_Puskesmas.jpg", type: "image", size: "1.2 MB", url: "https://placehold.co/600x400/png?text=Foto+Antrean" },
      { id: 2, name: "Resep_Dokter.pdf", type: "document", size: "450 KB", url: "#" }
    ],
    responseHistory: [
      { id: 1, sender: 'Rina Kirana', role: 'Pelapor', text: 'Tolong dipercepat pak, bapak saya sudah mulai lemas menunggu.', timestamp: '2026-07-18T10:35:00Z' },
      { id: 2, sender: 'Bapak Agus (Admin OPD)', role: 'Admin OPD', text: 'Mohon maaf yang sebesar-besarnya atas ketidaknyamanan ini, Ibu Rina. Kami sedang berkoordinasi dengan Kepala Puskesmas untuk menambah petugas dispensing di depan.', timestamp: '2026-07-18T10:45:00Z' }
    ],
    timeline: [
      { id: 1, title: "Pengaduan Dibuat", date: "2026-07-18T08:30:00Z", completed: true },
      { id: 2, title: "Verifikasi Sistem", date: "2026-07-18T08:35:00Z", completed: true },
      { id: 3, title: "Diteruskan ke OPD", date: "2026-07-18T08:40:00Z", completed: true },
      { id: 4, title: "Sedang Diproses", date: "2026-07-18T10:45:00Z", completed: true },
      { id: 5, title: "Selesai", date: null, completed: false }
    ]
  },
  {
    id: "CMP-2026-0092",
    reporter: { name: "Budi Santoso", initials: "BS" },
    title: "Jalan Rusak di Desa Sukamaju",
    dateStr: "19 Juli 2026",
    createdAt: "2026-07-19T10:15:00Z",
    status: "Selesai",
    progress: 100,
    opd: { id: 2, name: "Dinas PUPR", pic: "Ibu Ratna (Admin OPD)" },
    category: "Infrastruktur",
    priority: "Sedang",
    kecamatan: "Saradan",
    description: "Terdapat lubang besar di tengah jalan raya desa Sukamaju. Sangat membahayakan pengendara roda dua terutama saat malam hari karena minim penerangan.",
    chronology: "Sudah terjadi kecelakaan 2 kali minggu ini.",
    sla: { isOverdue: false, remainingHours: 0, slaDeadline: "2026-07-22T10:15:00Z", totalDuration: 72, elapsed: 48 },
    ageDays: 5,
    stats: {
      timeToVerify: "10 Menit",
      timeToFirstResponse: "1 Hari",
      totalDuration: "2 Hari 5 Jam",
      estimatedCompletion: "-"
    },
    attachments: [
      { id: 1, name: "Lubang_Jalan.jpg", type: "image", size: "2.1 MB", url: "https://placehold.co/600x400/png?text=Foto+Lubang" }
    ],
    responseHistory: [
      { id: 1, sender: 'Ibu Ratna (Admin OPD)', role: 'Admin OPD', text: 'Terima kasih laporannya. Tim survei akan meluncur ke lokasi besok pagi.', timestamp: '2026-07-20T09:00:00Z' },
      { id: 2, sender: 'Ibu Ratna (Admin OPD)', role: 'Admin OPD', text: 'Perbaikan jalan telah selesai dilakukan dengan sistem penambalan (patching). Laporan ditutup.', timestamp: '2026-07-21T15:00:00Z' }
    ],
    timeline: [
      { id: 1, title: "Pengaduan Dibuat", date: "2026-07-19T10:15:00Z", completed: true },
      { id: 2, title: "Verifikasi Sistem", date: "2026-07-19T10:25:00Z", completed: true },
      { id: 3, title: "Diteruskan ke OPD", date: "2026-07-19T10:30:00Z", completed: true },
      { id: 4, title: "Sedang Diproses", date: "2026-07-20T09:00:00Z", completed: true },
      { id: 5, title: "Selesai", date: "2026-07-21T15:00:00Z", completed: true }
    ]
  },
  // Untuk data sisanya diberikan struktur minimal agar tidak error
  {
    id: "CMP-2026-0095",
    reporter: { name: "Siti Aminah", initials: "SA" },
    title: "Antrean Pendaftaran Terlalu Lama",
    dateStr: "20 Juli 2026",
    createdAt: "2026-07-20T09:00:00Z",
    status: "Ditolak",
    progress: 100,
    opd: { id: 3, name: "Dinas Dukcapil" },
    category: "Administrasi Kependudukan",
    priority: "Rendah",
    kecamatan: "Wonoasri",
    sla: { isOverdue: false, remainingHours: 24, slaDeadline: "2026-07-23T09:00:00Z" },
    ageDays: 1,
    attachments: [],
    responseHistory: [],
    timeline: []
  },
  {
    id: "CMP-2026-0096",
    reporter: { name: "Andi Saputra", initials: "AS" },
    title: "Lampu Penerangan Jalan Padam",
    dateStr: "21 Juli 2026",
    createdAt: "2026-07-21T18:45:00Z",
    status: "Diterima",
    progress: 25,
    opd: { id: 4, name: "Dinas Perhubungan" },
    category: "Fasilitas Umum",
    priority: "Sedang",
    kecamatan: "Balerejo",
    sla: { isOverdue: false, remainingHours: 48, slaDeadline: "2026-07-24T18:45:00Z" },
    ageDays: 1,
    attachments: [],
    responseHistory: [],
    timeline: []
  },
  {
    id: "CMP-2026-0097",
    reporter: { name: "Lestari Wulandari", initials: "LW" },
    title: "Pelayanan Perizinan UMKM Berbelit",
    dateStr: "21 Juli 2026",
    createdAt: "2026-07-21T11:20:00Z",
    status: "Diproses",
    progress: 75,
    opd: { id: 5, name: "DPMPTSP" },
    category: "Perizinan",
    priority: "Sedang",
    kecamatan: "Jiwan",
    sla: { isOverdue: false, remainingHours: 12, slaDeadline: "2026-07-24T11:20:00Z" },
    ageDays: 2,
    attachments: [],
    responseHistory: [],
    timeline: []
  },
  {
    id: "CMP-2026-0098",
    reporter: { name: "Dimas Anggara", initials: "DA" },
    title: "Tumpukan Sampah Tidak Diambil",
    dateStr: "22 Juli 2026",
    createdAt: "2026-07-22T07:10:00Z",
    status: "Diterima",
    progress: 10,
    opd: { id: 6, name: "Dinas Lingkungan Hidup" },
    category: "Kebersihan",
    priority: "Tinggi",
    kecamatan: "Dolopo",
    sla: { isOverdue: true, remainingHours: -5, slaDeadline: "2026-07-23T07:10:00Z" },
    ageDays: 2,
    attachments: [],
    responseHistory: [],
    timeline: []
  }
];
