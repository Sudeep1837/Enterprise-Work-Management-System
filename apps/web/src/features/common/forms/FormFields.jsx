import React, { forwardRef } from "react";

export const TextInput = forwardRef(function TextInput({ label, error, ...props }, ref) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input 
        ref={ref}
        {...props} 
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400 dark:text-slate-100 placeholder:text-slate-400" 
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
    </label>
  );
});

export const SelectInput = forwardRef(function SelectInput({ label, options, error, ...props }, ref) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select 
        ref={ref}
        {...props} 
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400 dark:text-slate-100"
      >
        {options.map((item) => (
          <option key={item.value || item.label || item} value={item.value || item}>
            {item.label || item}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
    </label>
  );
});
