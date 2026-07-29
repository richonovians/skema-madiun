import React from 'react';
import { Target, CheckCircle2, Rocket } from 'lucide-react';
import { aboutContent } from '../constants/aboutContent';

export default function VisionMission() {
  const { vision, missions } = aboutContent;

  return (
    <section className="py-16 sm:py-20 bg-surface">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16">
          {/* Vision */}
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary">
                Visi
              </h2>
            </div>
            <div className="p-6 sm:p-8 bg-gradient-to-br from-primary to-primary-hover rounded-3xl text-white shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <p className="font-h3 text-h3 font-medium leading-relaxed">
                &quot;{vision}&quot;
              </p>
            </div>
          </div>

          {/* Mission */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Rocket className="w-6 h-6" />
              </div>
              <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary">
                Misi
              </h2>
            </div>
            <div className="space-y-4 sm:space-y-6">
              {missions.map((mission) => (
                <div key={mission.id} className="flex gap-3 sm:gap-4 p-4 sm:p-6 bg-background rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-h4 text-h4 text-text-primary mb-2">
                      {mission.title}
                    </h3>
                    <p className="font-body text-body text-text-secondary">
                      {mission.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
