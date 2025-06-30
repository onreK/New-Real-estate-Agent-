import React, { useState } from 'react';

export function Select({ children, value, onValueChange, ...props }) {
  return (
    <div className="relative">
      {React.Children.map(children, child => 
        React.cloneElement(child, { value, onValueChange, ...props })
      )}
    </div>
  );
}

export function SelectTrigger({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-300 
        bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none 
        focus:ring-2 focus:ring-blue-500 focus:border-transparent 
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder, value }) {
  return (
    <span>{value || placeholder}</span>
  );
}

export function SelectContent({ children, className = '', ...props }) {
  return (
    <div
      className={`
        absolute top-full z-50 w-full rounded-md border border-gray-300 bg-white shadow-lg
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectItem({ children, value, onValueChange, className = '', ...props }) {
  return (
    <div
      className={`
        cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100
        ${className}
      `}
      onClick={() => onValueChange && onValueChange(value)}
      {...props}
    >
      {children}
    </div>
  );
}
