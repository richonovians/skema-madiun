import React from 'react';
import { aboutContent } from '../constants/aboutContent';

export default function CoreValues() {
  const { coreValues } = aboutContent;

  return (
    <section className="py-20 bg-background">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary mb-6">
            Nilai-Nilai Pelayanan
          </h2>
          <div className="w-24 h-1.5 bg-primary mx-auto rounded-full mb-6"></div>
          <p className="font-body text-body-lg text-text-secondary max-w-4xl mx-auto px-4">
            Prinsip yang menjadi landasan kami dalam mengembangkan platform dan memberikan layanan kepada masyarakat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coreValues.map((value, index) => {
            const Icon = value.icon;
            return (
              <div 
                key={value.id} 
                className="bg-surface p-8 rounded-3xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-h3 text-h3 text-text-primary mb-3">
                  {value.title}
                </h3>
                <p className="font-body text-body text-text-secondary">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
