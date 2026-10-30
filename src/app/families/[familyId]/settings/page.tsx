import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, Input, PageHeader, Select } from "@/components/ui";
import {
  createInviteAction,
  baseUrl,
  removeMemberAction,
  renameFamilyAction,
  revokeInviteAction,
  updateMemberAction,
} from "@/app/actions";
import { can, getFamily, membersOf, pendingInvites, ROLE_HELP, ROLE_LABELS, ROLES, type Role } from "@/lib/families";
import { requireUser } from "@/lib/session";
import { shareLinks } from "@/lib/sharing";
import { ShareLinkList } from "@/components/ShareLinkList";

export const dynamic = "force-dynamic";

function RoleOptions() {
  return ROLES.map((r) => (
    <option key={r} value={r}>
      {ROLE_LABELS[r]}
    </option>
  ));
}

export default async function FamilySettings({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const user = await requireUser(`/families/${familyId}/settings`);
  const family = getFamily(Number(familyId), user.id);
  if (!family) notFound();
  const manage = can(family.role, "manage");
  const members = membersOf(family.id);
  const invites = manage ? pendingInvites(family.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={manage ? "Manage family" : "Family members"}
        back={{ href: `/families/${family.id}`, label: family.name }}
      />

      {manage && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">Family name</h2>
          <ActionForm action={renameFamilyAction} className="flex flex-wrap items-start gap-2">
            <input type="hidden" name="familyId" value={family.id} />
            <div className="min-w-0 flex-1">
              <Input name="name" defaultValue={family.name} required />
            </div>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-bold">People</h2>
        <ul className="mt-2 divide-y divide-line">
          {members.map((m) => (
            <li key={m.userId} className="py-3">
              {manage ? (
                <ActionForm action={updateMemberAction} className="grid gap-2 sm:grid-cols-[1fr_10rem_9rem_auto] sm:items-center">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <div>
                    <p className="font-semibold">
                      {m.name} {m.userId === user.id && <span className="text-muted">(you)</span>}
                    </p>
                    <p className="text-sm text-muted">{m.email}</p>
                  </div>
                  <Input name="relationship" defaultValue={m.relationship ?? ""} placeholder="Relationship" aria-label="Relationship" />
                  <Select name="role" defaultValue={m.role} aria-label="Role">
                    <RoleOptions />
                  </Select>
                  <SubmitButton variant="secondary">Save</SubmitButton>
                </ActionForm>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-sm text-muted">{m.relationship ?? m.email}</p>
                  </div>
                  <span className="text-sm text-muted">{ROLE_LABELS[m.role]}</span>
                </div>
              )}
              {manage && m.userId !== user.id && (
                <ActionForm action={removeMemberAction} className="mt-1">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <button className="text-xs font-semibold text-red-700 hover:underline">Remove {m.name}</button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-1 rounded-xl bg-paper p-3 text-sm sm:grid-cols-3">
          {ROLES.map((r: Role) => (
            <div key={r}>
              <dt className="font-semibold">{ROLE_LABELS[r]}</dt>
              <dd className="text-muted">{ROLE_HELP[r]}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {manage && (
        <Card>
          <h2 className="text-lg font-bold">Invite someone</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            You'll get a link to text or email them. They make an account and join this family.
          </p>
          <ActionForm action={createInviteAction}>
            <input type="hidden" name="familyId" value={family.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Their email" hint="Optional, fills in their sign-up form.">
                <Input name="email" type="email" />
              </Field>
              <Field label="Relationship" hint={'Like "Grandma" or "Uncle Joe".'}>
                <Input name="relationship" />
              </Field>
              <Field label="Role">
                <Select name="role" defaultValue="viewer">
                  <RoleOptions />
                </Select>
              </Field>
            </div>
            <SubmitButton>Create invite link</SubmitButton>
          </ActionForm>

          {invites.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Waiting to join</h3>
              <ul className="mt-2 divide-y divide-line">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {i.relationship ?? i.email ?? "Invite link"}
                      <span className="text-muted">
                        {" "}· {ROLE_LABELS[i.role]} · expires {i.expiresAt.slice(0, 10)}
                      </span>
                    </span>
                    <ActionForm action={revokeInviteAction} className="">
                      <input type="hidden" name="familyId" value={family.id} />
                      <input type="hidden" name="inviteId" value={i.id} />
                      <button className="text-xs font-semibold text-red-700 hover:underline">Cancel invite</button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {can(family.role, "edit") && (
        <Card>
          <h2 className="text-lg font-bold">Share links</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Read-only links for people without an account. Make one from the Share button on a kid, collection, or piece.
          </p>
          <ShareLinkList links={shareLinks(family.id)} baseUrl={await baseUrl()} showTarget />
        </Card>
      )}

      <Card>
        <h2 className="font-bold">Leave {family.name}</h2>
        <p className="mb-3 mt-1 text-sm text-muted">You'll stop seeing this family's art until someone invites you again.</p>
        <ActionForm action={removeMemberAction}>
          <input type="hidden" name="familyId" value={family.id} />
          <input type="hidden" name="userId" value={user.id} />
          <SubmitButton variant="danger">Leave family</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
