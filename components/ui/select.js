import React, { useState } from 'react';

export function Select({ children, value, onValueChange, ...props }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, { 
            onClick: () => setIsOpen(!isOpen),
            isOpen,
            value,
            onValueChange,
            ...props 
          });
        }
        if (child.type === SelectContent) {
          return isOpen ? React.cloneElement(child, { 
            onSelect: (selectedValue) => {
              onValueChange(selectedValue);
              setIsOpen(false);
            },
            value,
            ...props 
          }) : null;
        }
        return child;
      })}
    </div>
  );
}

export function SelectTrigger({ children, className = '', onClick, isOpen, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
      <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder, value }) {
  return (
    <span className={value ? '' : 'text-gray-500'}>
      {value || placeholder}
    </span>
  );
}

export function SelectContent({ children, className = '', onSelect, ...props }) {
  return (
    <div className={`absolute top-full z-50 w-full mt-1 rounded-md border border-gray-300 bg-white shadow-lg ${className}`} {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { onSelect, ...props })
      )}
    </div>
  );
}

export function SelectItem({ children, value, onSelect, className = '', ...props }) {
  return (
    <div
      className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 ${className}`}
      onClick={() => onSelect && onSelect(value)}
      {...props}
    >
      {children}
    </div>
  );
}
