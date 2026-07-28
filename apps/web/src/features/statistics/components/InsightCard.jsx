import React from 'react';
import { Sparkles } from 'lucide-react';

export default function InsightCard({ text }) {
  return (
    <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 transform transition-transform group-hover:scale-110 group-hover:rotate-12">
        <Sparkles size={120} />
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
          <Sparkles size={32} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary-fixed mb-2">
            Insight & Kesimpulan
          </h3>
          <p className="text-lg md:text-xl font-medium leading-relaxed">
            &quot;{text}&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
