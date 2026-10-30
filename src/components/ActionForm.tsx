"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/app/actions";
import { Button } from "./ui";

type Action = (prev: ActionResult, data: FormData) => Promise<ActionResult>;

/** A form for a server action, showing its error or success message. */
export function ActionForm({ action, children, className = "space-y-4" }: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-tint px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.message && <p className="rounded-xl bg-ok-tint px-3 py-2 text-sm text-ok">{state.message}</p>}
      {state.link && <CopyLink link={state.link} note={state.linkNote} />}
    </form>
  );
}

export function SubmitButton({ children, variant }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
}

export function CopyLink({ link, note, title = "Send this link to them" }: { link: string; note?: string; title?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={link} className="min-w-0 flex-1 rounded-lg border border-edge bg-white px-2 py-1 text-sm" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="secondary" onClick={() => navigator.clipboard?.writeText(link)}>
          Copy
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">{note ?? "The link works once and expires in 14 days."}</p>
    </div>
  );
}
