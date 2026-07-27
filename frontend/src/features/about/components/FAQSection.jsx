'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { aboutContent } from '../constants/aboutContent';

export default function FAQSection() {
  const { faq } = aboutContent;
  const [openId, setOpenId] = useState(null);

  const toggleAccordion = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-[800px] mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-h2 text-h2-sm md:text-h2 text-text-primary mb-6">
            Pertanyaan yang Sering Diajukan
          </h2>
          <div className="w-24 h-1.5 bg-primary mx-auto rounded-full mb-6"></div>
        </div>

        <div className="space-y-4">
          {faq.map((item, index) => {
            const isOpen = openId === item.id;
            return (
              <div 
                key={item.id} 
                className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  onClick={() => toggleAccordion(item.id)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-surface-hover transition-colors"
                >
                  <h3 className="font-h4 text-h4 text-text-primary pr-8">
                    {item.question}
                  </h3>
                  <div className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-6 h-6 text-text-secondary" />
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="p-6 pt-0 font-body text-body text-text-secondary">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
