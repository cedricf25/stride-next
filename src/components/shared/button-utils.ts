export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "ghost-primary"
  | "ghost-danger"
  | "ai";

export type ButtonSize = "sm" | "md" | "lg";

export const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  "ghost-primary": "bg-blue-50 text-blue-600 hover:bg-blue-100",
  "ghost-danger": "bg-red-50 text-red-600 hover:bg-red-100",
  ai: "bg-purple-600 text-white hover:bg-purple-700",
};

export const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-3 text-sm",
};

export const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50";
