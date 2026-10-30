import { notFound } from "next/navigation";
import { ArtGrid } from "@/components/ArtGrid";
import { collectionDetails } from "@/components/CollectionFields";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { can } from "@/lib/families";
import { artFor, collectionsFor, getCollection } from "@/lib/gallery";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CollectionPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  const user = await requireUser(`/collections/${collectionId}`);
  const found = getCollection(Number(collectionId), user.id);
  if (!found) notFound();
  const { collection, kid, role } = found;
  const edit = can(role, "edit");
  const art = artFor(kid.id, collection.id);
  const others = collectionsFor(kid.id).filter((c) => c.id !== collection.id).map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <PageHeader
        back={{ href: `/kids/${kid.id}`, label: kid.name }}
        title={collection.title}
        subtitle={
          <>
            {collectionDetails(collection)}
            {collection.description && <span className="mt-1 block text-ink">{collection.description}</span>}
          </>
        }
        actions={edit && <ButtonLink href={`/collections/${collection.id}/edit`} variant="secondary">Edit</ButtonLink>}
      />
      {edit && (
        <div className="mb-6">
          <Uploader kidId={kid.id} collectionId={collection.id} />
        </div>
      )}
      {art.length === 0 ? (
        !edit && (
          <Card className="py-10 text-center text-muted">There's no art in this collection yet.</Card>
        )
      ) : (
        <ArtGrid art={art} kidId={kid.id} canEdit={edit} collections={others} />
      )}
    </>
  );
}
