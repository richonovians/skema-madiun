import React from 'react';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      {icon && (
        <div className="text-outline-variant mb-4 opacity-80">
          {icon}
        </div>
      )}
      <h3 className="text-headline-md font-headline-md text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-body-md font-body-md text-text-secondary mb-6 max-w-[400px] w-full">
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}
