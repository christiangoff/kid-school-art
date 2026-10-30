import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, Input } from "@/components/ui";
import { openSignupAllowed, userCount } from "@/lib/accounts";
import { findInvite } from "@/lib/families";
import { signupAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Signup({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite: token } = await searchParams;
  const invite = token ? findInvite(token) : null;
  const first = userCount() === 0;

  if (!invite && !openSignupAllowed()) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-2xl font-bold">You’ll need an invite</h1>
        <p className="mt-2 text-muted">
          Ask a family owner to send you an invite link. Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-center text-3xl font-bold">{invite ? `Join ${invite.familyName}` : "Create your account"}</h1>
      <p className="mb-6 mt-2 text-center text-muted">
        {invite
          ? "Make an account to see the kids' art."
          : first
            ? "You’re the first one here, so you’ll set things up."
            : "Make an account to get started."}
      </p>
      <Card>
        <ActionForm action={signupAction}>
          {token && <input type="hidden" name="invite" value={token} />}
          <Field label="Your name">
            <Input name="name" autoComplete="name" required />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" defaultValue={invite?.email ?? ""} required />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <SubmitButton>Create account</SubmitButton>
        </ActionForm>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={token ? `/login?next=/invite/${token}` : "/login"} className="font-semibold text-brand">
          Sign in
        </Link>
      </p>
    </div>
  );
}
