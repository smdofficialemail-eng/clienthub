import { requireWorkspace } from "@/lib/app";
import { createClient } from "../actions";
import { ClientForm } from "../client-form";

export const metadata = { title: "New client — ClientHub" };

export default async function NewClientPage() {
  await requireWorkspace();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">New client</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a client with their full details — documents you send them will be linked here.
        </p>
      </div>
      <ClientForm
        defaults={{ name: "", company: null, email: null, phone: null, website: null, address: null, industry: null, notes: null }}
        action={createClient}
        submitLabel="Create client"
      />
    </div>
  );
}
