"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Неверный email или пароль");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
        Вход в админку
      </h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm"
          />
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
