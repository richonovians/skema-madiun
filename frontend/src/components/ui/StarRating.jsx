import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ score, max = 5, size = 12 }) {
  return (
    <div className="flex gap-1">
      {[...Array(max)].map((_, index) => {
        const isFilled = index < score;
        return (
          <Star 
            key={index}
            size={size}
            className={isFilled ? "text-primary fill-primary" : "text-outline-variant"}
          />
        );
      })}
    </div>
  );
}
