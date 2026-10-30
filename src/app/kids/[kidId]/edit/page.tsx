import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { KidFields } from "@/components/KidFields";
import { Card, PageHeader } from "@/components/ui";
import { deleteKidAction, updateKidAction } from "@/app/actions";
import { can, getKid } from "@/lib/families";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditKid({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const user = await requireUser(`/kids/${kidId}/edit`);
  const found = getKid(Number(kidId), user.id);
  if (!found || !can(found.role, "edit")) notFound();
  const { kid, role } = found;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader title={`Edit ${kid.name}`} back={{ href: `/kids/${kid.id}`, label: kid.name }} />
      <Card>
        <ActionForm action={updateKidAction}>
          <input type="hidden" name="kidId" value={kid.id} />
          <KidFields name={kid.name} birthdate={kid.birthdate} />
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>
      {can(role, "manage") && (
        <Card>
          <h2 className="font-bold">Remove {kid.name}</h2>
          <p className="mb-3 mt-1 text-sm text-muted">This deletes their page and everything on it. It can't be undone.</p>
          <ActionForm action={deleteKidAction}>
            <input type="hidden" name="kidId" value={kid.id} />
            <input type="hidden" name="familyId" value={kid.familyId} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" required /> Yes, remove {kid.name} and their art
            </label>
            <SubmitButton variant="danger">Remove {kid.name}</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
