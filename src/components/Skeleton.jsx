import React from "react";

export default function Skeleton({ className }) {
  return (
    <div className={`skeleton-box animate-skeleton ${className}`}></div>
  );
}

// A specific loader for your Dashboard Cards
export const CardSkeleton = () => (
  <div className="bg-[#0f1424] border border-[#1a2540] rounded-xl p-4 h-32 flex flex-col justify-between">
    <Skeleton className="w-8 h-8 rounded-full" />
    <div className="space-y-2">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-2 w-1/3" />
    </div>
  </div>
);