import React from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Search } from 'lucide-react';

export default function SurveyFilter({ 
  searchTerm, 
  onSearchChange, 
  activeCategory, 
  onCategoryChange,
  categories = [] 
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6 mb-10 md:items-center justify-between items-stretch">
      <div className="w-full md:w-96">
        <Input 
          id="search-survey"
          type="text" 
          placeholder="Cari Instansi/OPD..." 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          leftIcon={<Search size={20} />}
        />
      </div>
      
      <div className="flex overflow-x-auto md:flex-wrap gap-3 justify-start md:justify-end flex-1 w-full py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button 
          className={`min-h-[44px] py-2 px-6 rounded-lg text-base font-bold whitespace-nowrap transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] border ${activeCategory === 'Semua' ? 'bg-primary text-white border-primary shadow-md hover:shadow-lg hover:shadow-primary/30' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow-md'}`}
          onClick={() => onCategoryChange('Semua')}
        >
          Semua
        </button>
        {categories.map((cat) => (
          <button 
            key={cat}
            className={`min-h-[44px] py-2 px-6 rounded-lg text-base font-bold whitespace-nowrap transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] border ${activeCategory === cat ? 'bg-primary text-white border-primary shadow-md hover:shadow-lg hover:shadow-primary/30' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow-md'}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
