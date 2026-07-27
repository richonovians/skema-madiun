import React from 'react';

export default function ServiceFlow() {
  const steps = [
    {
      id: 1,
      title: "Buat Akun",
      description: "Masuk dengan mudah menggunakan SSO Helpdesk."
    },
    {
      id: 2,
      title: "Pilih Instansi",
      description: "Tentukan OPD atau instansi yang relevan dengan pengaduan Anda."
    },
    {
      id: 3,
      title: "Kirim Pengaduan",
      description: "Isi formulir pengaduan dengan detail yang jelas dan lampirkan bukti jika ada."
    },
    {
      id: 4,
      title: "Pengaduan Diproses",
      description: "Instansi terkait akan meninjau dan menindaklanjuti laporan Anda."
    },
    {
      id: 5,
      title: "Isi Survei Kepuasan",
      description: "Berikan penilaian Anda terhadap pelayanan dan penanganan yang diberikan."
    },
    {
      id: 6,
      title: "Data Menjadi Evaluasi",
      description: "Masukan Anda menjadi dasar untuk perbaikan layanan publik di masa depan."
    }
  ];

  return (
    <section id="panduan-penggunaan" className="py-20 bg-surface scroll-mt-20">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary mb-6">
            Panduan Penggunaan
          </h2>
          <div className="w-24 h-1.5 bg-primary mx-auto rounded-full mb-6"></div>
          <p className="font-body text-body-lg text-text-secondary max-w-4xl mx-auto px-4">
            Langkah-langkah sederhana untuk berpartisipasi aktif dalam pengawasan pelayanan publik.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className="relative group bg-background border border-border p-8 rounded-3xl shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden animate-fade-in-up hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Angka Watermark Besar di Background */}
              <div className="absolute -bottom-6 -right-2 text-[8rem] font-black text-primary/5 group-hover:text-primary/10 transition-colors duration-300 pointer-events-none select-none leading-none">
                {step.id}
              </div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold text-2xl mb-6 shadow-sm border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {step.id}
                </div>
                <h3 className="font-h3 text-h3 text-text-primary mb-3">
                  {step.title}
                </h3>
                <p className="font-body text-body-md text-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
