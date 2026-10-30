import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CollectionFields } from "@/components/CollectionFields";
import { Card, PageHeader } from "@/components/ui";
import { createCollectionAction } from "@/app/actions";
import { can, getKid } from "@/lib/families";
import { collectionSuggestions } from "@/lib/gallery";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewCollection({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const user = await requireUser(`/kids/${kidId}/collections/new`);
  const found = getKid(Number(kidId), user.id);
  if (!found || !can(found.role, "edit")) notFound();
  const { kid } = found;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New collection" subtitle={`A gallery of ${kid.name}’s art.`} back={{ href: `/kids/${kid.id}`, label: kid.name }} />
      <Card>
        <ActionForm action={createCollectionAction}>
          <input type="hidden" name="kidId" value={kid.id} />
          <CollectionFields {...collectionSuggestions(kid.id)} />
          <SubmitButton>Create collection</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
