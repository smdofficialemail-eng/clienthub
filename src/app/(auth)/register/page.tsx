"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/auth-actions";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, undefined);

  return (
    <div className="w-full max-w-md">
      <div className="card p-8 shadow-raised">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Start your free workspace
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          One account for leads, proposals, clients, and invoices.
        </p>

        <form action={action} className="mt-6 space-y-4">
          {state?.error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {state.error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="label">
                Your name
              </label>
              <input id="name" name="name" type="text" required autoComplete="name" className="input" />
            </div>
            <div>
              <label htmlFor="workspace" className="label">
                Workspace name
              </label>
              <input
                id="workspace"
                name="workspace"
                type="text"
                required
                placeholder="Northwind Studio"
                className="input"
              />
            </div>
          </div>
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
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="input"
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
            {pending ? "Creating workspace…" : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
