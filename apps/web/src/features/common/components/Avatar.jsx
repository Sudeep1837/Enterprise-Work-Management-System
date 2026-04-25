import { useState } from "react";

function getInitials(name) {
  return String(name || "User")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const sizeClasses = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-24 w-24 text-3xl",
};

export default function Avatar({ name, src, size = "md", className = "", alt = "" }) {
  const [failed, setFailed] = useState(false);
  const base = "shrink-0 rounded-full ring-1 ring-slate-200 dark:ring-slate-800";
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (src && !failed) {
    return (
      <img
        className={`${base} ${sizeClass} bg-slate-100 object-cover dark:bg-slate-800 ${className}`}
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${base} ${sizeClass} flex items-center justify-center bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 ${className}`}
      aria-label={alt || name || "User avatar"}
    >
      {getInitials(name)}
    </div>
  );
}
