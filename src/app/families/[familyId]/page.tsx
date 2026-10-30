import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Card, KidAvatar, PageHeader } from "@/components/ui";
import { can, getFamily, kidsOf, membersOf, ROLE_LABELS } from "@/lib/families";
import { requireUser } from "@/lib/session";
import { ageLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FamilyPage({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const user = await requireUser(`/families/${familyId}`);
  const family = getFamily(Number(familyId), user.id);
  if (!family) notFound();
  const kids = kidsOf(family.id);
  const members = membersOf(family.id);

  return (
    <>
      <PageHeader
        title={family.name}
        subtitle={`${kids.length} ${kids.length === 1 ? "kid" : "kids"} · ${members.length} ${members.length === 1 ? "person" : "people"}`}
        actions={
          <>
            {can(family.role, "edit") && <ButtonLink href={`/families/${family.id}/kids/new`}>Add a kid</ButtonLink>}
            <ButtonLink href={`/families/${family.id}/settings`} variant="secondary">
              {can(family.role, "manage") ? "Manage family" : "Family members"}
            </ButtonLink>
          </>
        }
      />

      {kids.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-4xl" aria-hidden>🎨</p>
          <h2 className="mt-2 text-xl font-bold">No kids yet</h2>
          <p className="mt-1 text-muted">
            {can(family.role, "edit")
              ? "Add each kid to give them their own page for art."
              : "A parent in this family hasn't added any kids yet."}
          </p>
          {can(family.role, "edit") && (
            <ButtonLink href={`/families/${family.id}/kids/new`} className="mt-4">
              Add your first kid
            </ButtonLink>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kids.map((kid) => (
            <Link key={kid.id} href={`/kids/${kid.id}`}>
              <Card className="flex items-center gap-4 transition hover:shadow-md">
                <KidAvatar name={kid.name} color={kid.color} size="lg" />
                <div>
                  <h2 className="text-xl font-bold">{kid.name}</h2>
                  {kid.birthdate && <p className="text-sm text-muted">{ageLabel(kid.birthdate)}</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Family</h2>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span key={m.userId} className="rounded-full border border-line bg-white px-3 py-1 text-sm">
              {m.name}
              <span className="text-muted"> · {m.relationship ?? ROLE_LABELS[m.role]}</span>
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
