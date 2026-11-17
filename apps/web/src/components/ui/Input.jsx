import React from 'react';
import PesanGalatMedan, { gabungDescribedBy, idGalatMedan } from './PesanGalatMedan';

/**
 * `error` opsional (17 November 2026, BUG-083): bila diisi, pesannya tampil
 * di bawah medan, medannya ditandai `aria-invalid`, dan pesannya ikut
 * dibacakan lewat `aria-describedby`. Pemanggil yang tidak mengirimnya
 * mendapat tampilan yang sama seperti sebelumnya.
 */
export default function Input({
  label,
  id,
  className = '',
  leftIcon,
  error,
  'aria-describedby': describedBy,
  ...props
}) {
  const idGalat = error ? idGalatMedan(id) : undefined;
  return (
    <div className={`space-y-xs ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={`w-full min-h-[44px] p-md border ${error ? 'border-error' : 'border-outline-variant'} rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md ${
            leftIcon ? 'pl-10' : ''
          }`}
          aria-invalid={error ? true : undefined}
          aria-describedby={gabungDescribedBy(describedBy, idGalat)}
          {...props}
        />
      </div>
      {error && <PesanGalatMedan id={idGalat}>{error}</PesanGalatMedan>}
    </div>
  );
}
