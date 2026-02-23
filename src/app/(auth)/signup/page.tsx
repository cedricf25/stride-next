"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Check, X } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { Card, Input, FormField, Button, AlertBanner } from "@/components/shared";

const PASSWORD_RULES = [
  { label: "8 caractères minimum", test: (p: string) => p.length >= 8 },
  { label: "Une majuscule", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Une minuscule", test: (p: string) => /[a-z]/.test(p) },
  { label: "Un chiffre", test: (p: string) => /\d/.test(p) },
  {
    label: "Un caractère spécial",
    test: (p: string) => /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/~`]/.test(p),
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const allRulesPass = PASSWORD_RULES.every((rule) => rule.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";
  const canSubmit =
    name && email && allRulesPass && passwordsMatch && !loading;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    const { error } = await signUp.email({ email, password, name });
    if (error) {
      setError(error.message ?? "Erreur lors de l'inscription");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <Card>
      <h1 className="mb-6 text-center text-xl font-bold text-[var(--text-primary)]">
        Créer un compte
      </h1>

      {error && (
        <AlertBanner className="mb-4">
          <p className="text-sm">{error}</p>
        </AlertBanner>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <FormField label="Nom" htmlFor="name">
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              id="name"
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </FormField>

        <FormField label="Email" htmlFor="email">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </FormField>

        <FormField label="Mot de passe" htmlFor="password">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10"
            />
          </div>
          {password && (
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const passes = rule.test(password);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      passes
                        ? "text-green-600"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {passes ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
        </FormField>

        <FormField label="Confirmer le mot de passe" htmlFor="confirmPassword">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="pl-10"
            />
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-500">
              Les mots de passe ne correspondent pas
            </p>
          )}
        </FormField>

        <Button
          type="submit"
          loading={loading}
          fullWidth
          size="lg"
          disabled={!canSubmit}
        >
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-tertiary)]">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Se connecter
        </Link>
      </p>
    </Card>
  );
}
