import React from 'react';
import PesanGalatMedan, { gabungDescribedBy, idGalatMedan } from './PesanGalatMedan';

/**
 * `error` opsional (17 November 2026, BUG-083), perilakunya sama dengan
 * `Input`: pesan di bawah medan, `aria-invalid`, dan `aria-describedby`.
 */
export default function Textarea({
  label,
  id,
  className = '',
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
      <textarea
        id={id}
        className={`w-full p-md border ${error ? 'border-error' : 'border-border'} rounded-lg bg-surface focus:ring-2 focus:ring-primary outline-none resize-none transition-all`}
        aria-invalid={error ? true : undefined}
        aria-describedby={gabungDescribedBy(describedBy, idGalat)}
        {...props}
      />
      {error && <PesanGalatMedan id={idGalat}>{error}</PesanGalatMedan>}
    </div>
  );
}
