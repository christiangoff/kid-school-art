import { notFound } from "next/navigation";
import { ButtonLink, Card, KidAvatar, PageHeader } from "@/components/ui";
import { can, getFamily, getKid } from "@/lib/families";
import { ageLabel } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function KidPage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const user = await requireUser(`/kids/${kidId}`);
  const found = getKid(Number(kidId), user.id);
  if (!found) notFound();
  const { kid, role } = found;
  const family = getFamily(kid.familyId, user.id)!;

  return (
    <>
      <PageHeader
        back={{ href: `/families/${family.id}`, label: family.name }}
        title={
          <span className="flex items-center gap-4">
            <KidAvatar name={kid.name} color={kid.color} size="lg" />
            {kid.name}
          </span>
        }
        subtitle={kid.birthdate ? ageLabel(kid.birthdate) : undefined}
        actions={can(role, "edit") && <ButtonLink href={`/kids/${kid.id}/edit`} variant="secondary">Edit</ButtonLink>}
      />
      <Card className="py-12 text-center">
        <p className="text-4xl" aria-hidden>🖼️</p>
        <h2 className="mt-2 text-xl font-bold">Collections are coming next</h2>
        <p className="mx-auto mt-1 max-w-md text-muted">
          Soon you'll be able to upload {kid.name}'s art here and group it into collections by school year, teacher, and class.
        </p>
      </Card>
    </>
  );
}
