"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 1000);
  }

  return (
    <button
      onClick={handleRefresh}
      className="rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50"
      title="Actualiser"
    >
      <RefreshCw
        className={`h-5 w-5 text-gray-600 ${spinning ? "animate-spin" : ""}`}
      />
    </button>
  );
}
