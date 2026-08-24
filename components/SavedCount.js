"use client";

import { useBookmarks } from "../lib/useBookmarks";

export default function SavedCount() {
  const { ids, hydrated } = useBookmarks();
  if (!hydrated || ids.length === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-saffron-dark text-white">
      {ids.length}
    </span>
  );
}
