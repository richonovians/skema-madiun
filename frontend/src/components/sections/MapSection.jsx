import React from 'react';

export default function MapSection() {
  return (
    <section className="w-full h-[400px] relative bg-surface-container-highest">
      <iframe
        title="Peta Pemerintah Kabupaten Madiun"
        className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-500"
        src="https://maps.google.com/maps?q=Pemerintah+Kabupaten+Madiun&t=&z=15&ie=UTF8&iwloc=&output=embed"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    </section>
  );
}
