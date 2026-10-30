import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CollectionFields } from "@/components/CollectionFields";
import { Card, PageHeader } from "@/components/ui";
import { deleteCollectionAction, updateCollectionAction } from "@/app/actions";
import { can } from "@/lib/families";
import { collectionSuggestions, getCollection } from "@/lib/gallery";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditCollection({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  const user = await requireUser(`/collections/${collectionId}/edit`);
  const found = getCollection(Number(collectionId), user.id);
  if (!found || !can(found.role, "edit")) notFound();
  const { collection, kid } = found;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Edit collection" back={{ href: `/collections/${collection.id}`, label: collection.title }} />
      <Card>
        <ActionForm action={updateCollectionAction}>
          <input type="hidden" name="collectionId" value={collection.id} />
          <CollectionFields collection={collection} {...collectionSuggestions(kid.id)} />
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="font-bold">Delete this collection</h2>
        <p className="mb-3 mt-1 text-sm text-muted">The art in it isn’t deleted. It moves to {kid.name}’s unsorted pile.</p>
        <ActionForm action={deleteCollectionAction}>
          <input type="hidden" name="collectionId" value={collection.id} />
          <SubmitButton variant="danger">Delete collection</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
