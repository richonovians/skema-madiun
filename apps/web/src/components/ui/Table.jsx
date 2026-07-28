import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-left font-body ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children, className = '', ...props }) {
  return (
    <thead className={`bg-surface-container-low border-b border-border ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function Tbody({ children, className = '', ...props }) {
  return (
    <tbody className={`divide-y divide-border ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function Tr({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-surface-container-lowest transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function Th({ children, className = '', ...props }) {
  return (
    <th className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-bold text-text-primary uppercase tracking-wider ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', ...props }) {
  return (
    <td className={`px-4 sm:px-6 py-3 sm:py-4 ${className}`} {...props}>
      {children}
    </td>
  );
}
