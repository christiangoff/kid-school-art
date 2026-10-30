import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, PageHeader } from "@/components/ui";
import { KidFields } from "@/components/KidFields";
import { can, getFamily } from "@/lib/families";
import { requireUser } from "@/lib/session";
import { addKidAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewKid({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const user = await requireUser(`/families/${familyId}/kids/new`);
  const family = getFamily(Number(familyId), user.id);
  if (!family || !can(family.role, "edit")) notFound();
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Add a kid" back={{ href: `/families/${family.id}`, label: family.name }} />
      <Card>
        <ActionForm action={addKidAction}>
          <input type="hidden" name="familyId" value={family.id} />
          <KidFields />
          <SubmitButton>Add kid</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
