"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/auth-actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Log in to your ClientHub workspace.
        </p>

        <form action={action} className="mt-6 space-y-4">
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
