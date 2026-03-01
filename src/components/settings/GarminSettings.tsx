"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, Eye, EyeOff } from "lucide-react";
import { saveGarminCredentials, removeGarminCredentials } from "@/actions/settings";

interface GarminSettingsProps {
  initialUsername: string | null;
  isConfigured: boolean;
}

export default function GarminSettings({ initialUsername, isConfigured }: GarminSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(!isConfigured);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [configured, setConfigured] = useState(isConfigured);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await saveGarminCredentials(username, password);
      if (result.success) {
        setSuccess(true);
        setConfigured(true);
        setShowForm(false);
        setPassword("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeGarminCredentials();
      if (result.success) {
        setConfigured(false);
        setUsername("");
        setPassword("");
        setShowForm(true);
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  };

  if (configured && !showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Compte connecté
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {username}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600">Connecté</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
          >
            Modifier
          </button>
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
          Connexion Garmin Connect
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mb-4">
          Entrez vos identifiants Garmin Connect pour synchroniser vos activités et données de santé.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="garmin-username"
            className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
          >
            Email ou nom d&apos;utilisateur
          </label>
          <input
            type="text"
            id="garmin-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--bg-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="votre@email.com"
            autoComplete="username"
          />
        </div>

        <div>
          <label
            htmlFor="garmin-password"
            className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
          >
            Mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="garmin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--bg-default)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <X className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <Check className="h-4 w-4 flex-shrink-0" />
          <span>Connexion réussie !</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !username || !password}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Connexion..." : "Connecter"}
        </button>
        {configured && (
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setPassword("");
              setError(null);
            }}
            className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
