import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, Input } from "@/components/ui";
import { openSignupAllowed } from "@/lib/accounts";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-3xl font-bold">Welcome back</h1>
      <Card>
        <ActionForm action={loginAction}>
          <input type="hidden" name="next" value={next ?? "/"} />
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton>Sign in</SubmitButton>
        </ActionForm>
      </Card>
      {openSignupAllowed() && (
        <p className="mt-4 text-center text-sm text-muted">
          New here? <Link href="/signup" className="font-semibold text-brand">Create an account</Link>
        </p>
      )}
    </div>
  );
}
