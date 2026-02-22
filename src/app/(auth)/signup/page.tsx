"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Check, X } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
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
  const [googleLoading, setGoogleLoading] = useState(false);

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

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");
    await signIn.social({ provider: "google", callbackURL: "/" });
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

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border-default)]" />
        <span className="text-xs text-[var(--text-muted)]">ou</span>
        <div className="h-px flex-1 bg-[var(--border-default)]" />
      </div>

      <Button
        variant="secondary"
        fullWidth
        size="lg"
        loading={googleLoading}
        onClick={handleGoogleLogin}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        }
      >
        Continuer avec Google
      </Button>

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
