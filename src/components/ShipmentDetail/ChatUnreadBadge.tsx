import React from 'react';

export function ChatUnreadBadge({ count }: { count?: number }) {
  const value = count ?? 0;
  if (value <= 0) return null;

  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold leading-4 text-center pointer-events-none z-10">
      {value > 99 ? '99+' : value}
    </span>
  );
}
