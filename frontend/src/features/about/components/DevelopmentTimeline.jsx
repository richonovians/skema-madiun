import React from 'react';
import { aboutContent } from '../constants/aboutContent';

export default function DevelopmentTimeline() {
  const { timeline } = aboutContent;

  return (
    <section className="py-20 bg-background overflow-hidden">
      <div className="max-w-[1000px] mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary mb-6">
            Perjalanan Platform
          </h2>
          <div className="w-24 h-1.5 bg-primary mx-auto rounded-full mb-6"></div>
          <p className="font-body text-body-lg text-text-secondary max-w-2xl mx-auto">
            Tahapan pengembangan sistem sejak awal dirancang hingga digunakan oleh masyarakat secara luas.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-border -translate-x-1/2 rounded-full"></div>

          <div className="space-y-12">
            {timeline.map((item, index) => {
              const isEven = index % 2 === 0;
              return (
                <div 
                  key={item.id} 
                  className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row-reverse' : ''} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20 -translate-x-1/2 mt-6 md:mt-0 z-10"></div>
                  
                  {/* Content Box */}
                  <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 text-left'}`}>
                    <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-primary font-bold text-lg mb-2">Tahap {item.id}</div>
                      <h3 className="font-h3 text-h3 text-text-primary mb-3">
                        {item.title}
                      </h3>
                      <p className="font-body text-body text-text-secondary">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
