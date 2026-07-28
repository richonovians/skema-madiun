import React from 'react';
import { Building2, Users, FileText, CheckCircle2 } from 'lucide-react';
import { aboutContent } from '../constants/aboutContent';

export default function AboutStatistics() {
  const { statistics } = aboutContent;

  const statItems = [
    {
      label: "Total OPD Terintegrasi",
      value: statistics.totalOPD,
      suffix: "+",
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-100"
    },
    {
      label: "Total Responden",
      value: (statistics.totalResponden / 1000).toFixed(1).replace('.0', ''),
      suffix: "rb+",
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-100"
    },
    {
      label: "Total Pengaduan",
      value: (statistics.totalPengaduan / 1000).toFixed(1).replace('.0', ''),
      suffix: "rb+",
      icon: FileText,
      color: "text-orange-600",
      bg: "bg-orange-100"
    },
    {
      label: "Tingkat Penyelesaian",
      value: statistics.tingkatPenyelesaian,
      suffix: "%",
      icon: CheckCircle2,
      color: "text-primary",
      bg: "bg-primary/10"
    }
  ];

  return (
    <section className="py-16 sm:py-20 bg-surface">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-br from-primary to-primary-hover rounded-[2rem] p-6 sm:p-8 md:p-12 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
            {statItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index} 
                  className="flex flex-col items-center text-center animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h4 className="font-h2 text-h2 text-white mb-2 flex items-baseline justify-center">
                    {item.value}
                    <span className="text-xl ml-1 font-medium text-white/80">{item.suffix}</span>
                  </h4>
                  <p className="font-body text-body-sm md:text-body text-white/80 font-medium">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
