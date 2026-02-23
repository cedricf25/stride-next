"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Card, Input, FormField, Button, AlertBanner } from "@/components/shared";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signIn.email({ email, password });
    if (error) {
      setError(error.message ?? "Erreur de connexion");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <Card>
      <h1 className="mb-6 text-center text-xl font-bold text-[var(--text-primary)]">
        Connexion
      </h1>

      {error && (
        <AlertBanner className="mb-4">
          <p className="text-sm">{error}</p>
        </AlertBanner>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
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
        </FormField>

        <Button type="submit" loading={loading} fullWidth size="lg">
          Se connecter
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-tertiary)]">
        Pas encore de compte ?{" "}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Créer un compte
        </Link>
      </p>
    </Card>
  );
}
