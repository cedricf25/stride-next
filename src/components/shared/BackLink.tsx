import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  label?: string;
  className?: string;
}

export default function BackLink({
  href,
  label = "Retour",
  className,
}: BackLinkProps) {
  return (
    <Link
      href={href}
      className={`mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ${className ?? ""}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
