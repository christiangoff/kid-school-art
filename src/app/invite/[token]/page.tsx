import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ButtonLink, Card } from "@/components/ui";
import { acceptInviteAction } from "@/app/actions";
import { findInvite, ROLE_HELP, ROLE_LABELS } from "@/lib/families";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = findInvite(token);
  const user = await currentUser();

  if (!invite) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">This invite has expired</h1>
        <p className="mt-2 text-muted">It may have been used already. Ask the person who sent it for a new link.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>💌</p>
        <h1 className="mt-2 text-2xl font-bold">You're invited to {invite.familyName}</h1>
        <p className="mt-2 text-muted">
          {invite.inviterName ? `${invite.inviterName} invited you` : "You've been invited"} to join as a{" "}
          <strong>{ROLE_LABELS[invite.role].toLowerCase()}</strong>. {ROLE_HELP[invite.role]}
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          {user ? (
            <ActionForm action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton>Join as {user.name}</SubmitButton>
            </ActionForm>
          ) : (
            <>
              <ButtonLink href={`/signup?invite=${token}`}>Create an account to join</ButtonLink>
              <ButtonLink href={`/login?next=/invite/${token}`} variant="secondary">
                I already have an account
              </ButtonLink>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
