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
  secondary: "border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]",
  "ghost-primary": "bg-blue-50 text-blue-600 hover:bg-blue-100",
  "ghost-danger": "bg-red-50 text-red-600 hover:bg-red-100",
  ai: "bg-purple-600 text-white hover:bg-purple-700",
};

export const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2.5 text-sm min-h-[44px]",
  md: "px-4 py-2.5 text-sm min-h-[44px]",
  lg: "px-4 py-3 text-base min-h-[48px]",
};

export const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50";
