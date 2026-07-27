import React from 'react';
import { aboutContent } from '../constants/aboutContent';

export default function FeatureHighlights() {
  const { features } = aboutContent;

  return (
    <section className="py-20 bg-background">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary mb-6">
            Mengapa Menggunakan Platform Ini?
          </h2>
          <div className="w-24 h-1.5 bg-primary mx-auto rounded-full mb-6"></div>
          <p className="font-body text-body-lg text-text-secondary max-w-4xl mx-auto px-4">
            Berbagai keunggulan yang kami hadirkan untuk memastikan pengalaman pelayanan publik yang optimal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.id} 
                className="group p-8 bg-surface rounded-3xl border border-border hover:border-primary/50 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-default animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 bg-background group-hover:bg-primary rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 border border-border group-hover:border-primary">
                  <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-h3 text-h3 text-text-primary mb-3 group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="font-body text-body text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
