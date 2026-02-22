"use client";

type ChipColor = "blue" | "green" | "purple" | "red";

interface FilterChipProps {
  active: boolean;
  activeColor?: ChipColor;
  icon?: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}

const activeClasses: Record<ChipColor, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-50 text-red-600",
};

const BASE =
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors";
const INACTIVE = "bg-gray-100 text-gray-600 hover:bg-gray-200";

export default function FilterChip({
  active,
  activeColor = "blue",
  icon,
  onClick,
  children,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BASE} ${active ? activeClasses[activeColor] : INACTIVE}`}
    >
      {icon}
      {children}
    </button>
  );
}
