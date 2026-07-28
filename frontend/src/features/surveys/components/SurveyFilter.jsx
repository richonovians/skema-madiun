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
      
      <div className="flex overflow-x-auto md:flex-wrap gap-sm justify-start md:justify-end flex-1 w-full pb-2 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Button 
          variant={activeCategory === 'Semua' ? 'primary' : 'outline'}
          className={activeCategory === 'Semua' ? 'rounded-lg px-lg shrink-0 whitespace-nowrap' : 'rounded-lg px-lg bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container shrink-0 whitespace-nowrap'}
          onClick={() => onCategoryChange('Semua')}
        >
          Semua
        </Button>
        {categories.map((cat) => (
          <Button 
            key={cat}
            variant={activeCategory === cat ? 'primary' : 'outline'}
            className={activeCategory === cat ? 'rounded-lg px-lg shrink-0 whitespace-nowrap' : 'rounded-lg px-lg bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container shrink-0 whitespace-nowrap'}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>
    </div>
  );
}
