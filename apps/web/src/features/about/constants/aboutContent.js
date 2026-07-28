import {
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Users,
  Eye,
  CheckCircle,
  Clock,
  HeartHandshake
} from 'lucide-react';

export const aboutContent = {
  hero: {
    title: "Membangun Pelayanan Publik yang Lebih Transparan, Cepat, dan Responsif",
    description: "SKEMA Madiun merupakan Sistem Keluhan, Evaluasi, dan Manajemen Aspirasi yang dirancang untuk memperkuat sinergi antara masyarakat dan Pemerintah Kabupaten Madiun dalam menciptakan pelayanan publik yang prima.",
    illustration: "/placeholder-hero.svg" // Replace with actual asset when available
  },
  platform: {
    title: "Tentang Platform",
    background: "Seiring dengan perkembangan teknologi dan kebutuhan masyarakat akan layanan yang serba cepat, Pemerintah Kabupaten Madiun menghadirkan sebuah platform digital yang terintegrasi. Platform ini dirancang khusus untuk mempermudah masyarakat dalam menyampaikan aspirasi, pengaduan, dan penilaian terhadap kinerja instansi pemerintah.",
    purpose: "Melalui SKEMA, digitalisasi pelayanan publik tidak lagi sekadar wacana. Sistem ini dirancang untuk memastikan setiap keluhan ditangani dengan cepat, setiap aspirasi didengar, dan setiap evaluasi menjadi data berharga bagi perbaikan OPD (Organisasi Perangkat Daerah)."
  },
  vision: "Menjadi platform pelayanan publik terdepan yang responsif, inklusif, dan berbasis data untuk mewujudkan tata kelola pemerintahan Kabupaten Madiun yang bersih dan melayani.",
  missions: [
    {
      id: 1,
      title: "Mempermudah Akses Masyarakat",
      description: "Menyediakan layanan pengaduan dan survei yang dapat diakses kapan saja dan di mana saja."
    },
    {
      id: 2,
      title: "Meningkatkan Transparansi",
      description: "Memberikan informasi yang terbuka mengenai status penanganan pengaduan dan hasil evaluasi pelayanan."
    },
    {
      id: 3,
      title: "Merespons dengan Cepat",
      description: "Mendorong setiap instansi untuk memberikan tanggapan dan penyelesaian masalah secara efisien."
    },
    {
      id: 4,
      title: "Evaluasi Berbasis Data",
      description: "Menggunakan data pengaduan dan kepuasan masyarakat sebagai landasan perbaikan kebijakan."
    }
  ],
  coreValues: [
    {
      id: 1,
      title: "Transparan",
      description: "Setiap proses dapat dipantau secara terbuka.",
      icon: Eye
    },
    {
      id: 2,
      title: "Akuntabel",
      description: "Setiap tindakan dan keputusan dapat dipertanggungjawabkan.",
      icon: ShieldCheck
    },
    {
      id: 3,
      title: "Responsif",
      description: "Tanggap terhadap setiap keluhan dan masukan.",
      icon: MessageSquare
    },
    {
      id: 4,
      title: "Cepat",
      description: "Penanganan masalah dilakukan dengan efisien.",
      icon: Clock
    },
    {
      id: 5,
      title: "Inklusif",
      description: "Melayani seluruh lapisan masyarakat tanpa diskriminasi.",
      icon: Users
    },
    {
      id: 6,
      title: "Berorientasi Pelayanan",
      description: "Kepuasan masyarakat adalah prioritas utama.",
      icon: HeartHandshake
    }
  ],
  statistics: {
    totalOPD: 45,
    totalResponden: 12500,
    totalPengaduan: 8430,
    tingkatPenyelesaian: 98 // percentage
  },
  timeline: [
    {
      id: 1,
      title: "Perencanaan Sistem",
      description: "Tahap awal analisis kebutuhan dan perancangan arsitektur platform."
    },
    {
      id: 2,
      title: "Pengembangan Platform",
      description: "Proses pengkodean dan pembuatan fitur utama."
    },
    {
      id: 3,
      title: "Implementasi OPD",
      description: "Sosialisasi dan pelatihan penggunaan sistem bagi admin instansi."
    },
    {
      id: 4,
      title: "Digunakan Masyarakat",
      description: "Peluncuran resmi platform untuk diakses secara publik."
    },
    {
      id: 5,
      title: "Evaluasi Berkelanjutan",
      description: "Pengembangan fitur lanjutan berdasarkan masukan dari pengguna."
    }
  ],
  features: [
    {
      id: 1,
      title: "Transparan",
      description: "Masyarakat dapat memantau status pengaduan mereka secara langsung melalui platform.",
      icon: Eye
    },
    {
      id: 2,
      title: "Mudah Digunakan",
      description: "Antarmuka yang ramah pengguna memudahkan semua kalangan untuk berpartisipasi.",
      icon: Users
    },
    {
      id: 3,
      title: "Terintegrasi",
      description: "Sistem pengaduan dan survei terhubung untuk evaluasi yang lebih komprehensif.",
      icon: TrendingUp
    },
    {
      id: 4,
      title: "Aman",
      description: "Data privasi pengguna dienkripsi dan dijaga kerahasiaannya dengan sistem keamanan terkini.",
      icon: ShieldCheck
    },
    {
      id: 5,
      title: "Responsif",
      description: "Notifikasi real-time untuk setiap update penanganan laporan.",
      icon: MessageSquare
    },
    {
      id: 6,
      title: "Berbasis Data",
      description: "Laporan analitik membantu pemerintah mengambil keputusan yang lebih tepat sasaran.",
      icon: CheckCircle
    }
  ],
  commitment: {
    title: "Komitmen Kami",
    description: "Kami berkomitmen untuk terus meningkatkan kualitas pelayanan publik di Kabupaten Madiun melalui:",
    points: [
      "Menjamin kerahasiaan data pelapor (opsi anonim).",
      "Menjaga transparansi proses penyelesaian masalah.",
      "Menindaklanjuti setiap pengaduan sesuai dengan standar operasional prosedur.",
      "Melakukan evaluasi berkelanjutan berdasarkan hasil survei kepuasan masyarakat."
    ]
  },
  faq: [
    {
      id: 1,
      question: "Apakah pengaduan saya aman?",
      answer: "Ya, kami menggunakan sistem keamanan yang dienkripsi. Anda juga dapat memilih opsi anonim saat membuat pengaduan untuk melindungi identitas Anda."
    },
    {
      id: 2,
      question: "Apakah saya harus login?",
      answer: "Untuk membuat pengaduan atau mengisi survei, Anda diwajibkan untuk login guna memastikan keabsahan data. Namun, Anda dapat melihat statistik secara publik tanpa login."
    },
    {
      id: 3,
      question: "Bagaimana proses tindak lanjut pengaduan?",
      answer: "Setelah pengaduan dikirim, sistem akan meneruskannya ke OPD terkait. Anda dapat melacak statusnya (Menunggu, Diproses, Selesai) melalui dashboard Anda."
    },
    {
      id: 4,
      question: "Apakah survei wajib diisi?",
      answer: "Survei sangat direkomendasikan untuk diisi setelah pengaduan Anda diselesaikan, atau setelah Anda menerima layanan di instansi, untuk membantu kami mengevaluasi kinerja layanan."
    }
  ],
  cta: {
    title: "Suara Anda Membantu Kami Memberikan Pelayanan yang Lebih Baik",
    description: "Mari berpartisipasi aktif dalam membangun platform yang lebih baik."
  }
};
