import Link from "next/link";
import {
  type ButtonVariant,
  type ButtonSize,
  variantClasses,
  sizeClasses,
  BASE,
} from "./button-utils";

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export default function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`${BASE} ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ""}`}
    >
      {icon}
      {children}
    </Link>
  );
}
