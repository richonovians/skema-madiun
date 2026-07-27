import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav className={`flex flex-wrap items-center gap-2 text-sm font-medium text-text-secondary ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {isLast ? (
              <span className="text-primary font-semibold">{item.label}</span>
            ) : (
              <>
                <Link href={item.href || '#'} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
                <ChevronRight size={16} />
              </>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
