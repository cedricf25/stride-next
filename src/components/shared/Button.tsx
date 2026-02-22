"use client";

import { Loader2 } from "lucide-react";
import {
  type ButtonVariant,
  type ButtonSize,
  variantClasses,
  sizeClasses,
  BASE,
} from "./button-utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const resolvedIcon = loading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    icon
  );

  return (
    <button
      className={`${BASE} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      disabled={loading || disabled}
      {...props}
    >
      {resolvedIcon}
      {children}
    </button>
  );
}
