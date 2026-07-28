'use client';

import React, { useState } from 'react';
import SurveyListHeader from '@/features/surveys/components/SurveyListHeader';
import SurveyFilter from '@/features/surveys/components/SurveyFilter';
import SurveyGrid from '@/features/surveys/components/SurveyGrid';

const dummySurveys = [
  {
    id: 1,
    opd: 'Dinas Perhubungan',
    deadline: '31 Des 2026',
    title: 'Survei Kualitas Pelayanan Pengujian Kendaraan Bermotor Q3',
    questionsCount: 9,
    category: 'Infrastruktur',
    status: 'active'
  },
  {
    id: 2,
    opd: 'DPMPTSP',
    deadline: '15 Jan 2027',
    title: 'Survei Kepuasan Layanan Perizinan Terpadu Berusaha',
    questionsCount: 9,
    category: 'Administrasi',
    status: 'active'
  },
  {
    id: 3,
    opd: 'Dinas Kesehatan',
    deadline: '30 Des 2026',
    title: 'Evaluasi Mutu Pelayanan Rawat Jalan RSUD Caruban',
    questionsCount: 12,
    category: 'Layanan Kesehatan',
    status: 'active'
  },
  {
    id: 4,
    opd: 'Dinas Dukcapil',
    deadline: '20 Feb 2027',
    title: 'Survei Pelayanan Administrasi Kependudukan Drive-Thru',
    questionsCount: 9,
    category: 'Administrasi',
    status: 'active'
  },
  {
    id: 5,
    opd: 'Dinas Lingkungan Hidup',
    deadline: '31 Mar 2027',
    title: 'Survei Kepuasan Layanan Pengelolaan Persampahan Domestik',
    questionsCount: 10,
    category: 'Infrastruktur',
    status: 'active'
  },
  {
    id: 6,
    opd: 'BPKAD',
    deadline: '10 Apr 2027',
    title: 'Survei Pelayanan Pembayaran PBB-P2 Online Kabupaten Madiun',
    questionsCount: 9,
    category: 'Administrasi',
    status: 'active'
  }
];

const categories = ['Layanan Kesehatan', 'Administrasi', 'Infrastruktur'];

export default function SurveysPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');

  // Filtering Logic
  const filteredSurveys = dummySurveys.filter((survey) => {
    const matchesSearch = 
      survey.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      survey.opd.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === 'Semua' || survey.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <main className="max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <SurveyListHeader />
      
      <SurveyFilter 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categories={categories}
      />
      
      <SurveyGrid surveys={filteredSurveys} />
    </main>
  );
}
