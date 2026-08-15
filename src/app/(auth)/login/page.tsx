"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/auth-actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="w-full max-w-md">
      <div className="card p-8 shadow-raised">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log in to your ClientHub workspace.
        </p>

        <form action={action} className="mt-6 space-y-4">
          {state?.error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@agency.com"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="input"
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
            {pending ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/register" className="font-bold text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
