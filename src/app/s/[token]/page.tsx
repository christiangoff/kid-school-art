import type { Metadata } from "next";
import { ArtGrid } from "@/components/ArtGrid";
import { collectionDetails } from "@/components/CollectionFields";
import { Card, PageHeader } from "@/components/ui";
import { artFor, collectionsFor, getCollectionById } from "@/lib/gallery";
import { kidName, sharedArt } from "@/lib/shared-view";
import { findShareLink, recordShareView } from "@/lib/sharing";
import { ExpiredShare, SharedPiece } from "./shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = findShareLink(token);
  if (!link) return <ExpiredShare />;
  recordShareView(link.id);
  const base = `/s/${token}`;

  if (link.artId) {
    const [art] = sharedArt(link);
    return art ? <SharedPiece token={token} link={link} art={art} /> : <ExpiredShare />;
  }

  if (link.collectionId) {
    const collection = getCollectionById(link.collectionId)!;
    const art = artFor(collection.kidId, collection.id);
    return (
      <>
        <PageHeader title={collection.title} subtitle={`${kidName(collection.kidId)} · ${collectionDetails(collection)}`} />
        {art.length ? <ArtGrid art={art} kidId={collection.kidId} linkBase={`${base}/art`} imageBase={`${base}/img`} /> : <Card className="text-muted">No art here yet.</Card>}
      </>
    );
  }

  const kidId = link.kidId!;
  const collections = collectionsFor(kidId).filter((c) => c.artCount > 0);
  const unsorted = artFor(kidId, "unsorted");
  return (
    <>
      <PageHeader title={`${kidName(kidId)}'s art`} />
      {collections.length === 0 && unsorted.length === 0 && <Card className="text-muted">No art here yet.</Card>}
      {collections.map((c) => (
        <section key={c.id} className="mb-10">
          <h2 className="text-xl font-bold">{c.title}</h2>
          <p className="mb-3 text-sm text-muted">{collectionDetails(c)}</p>
          <ArtGrid art={artFor(kidId, c.id)} kidId={kidId} linkBase={`${base}/art`} imageBase={`${base}/img`} />
        </section>
      ))}
      {unsorted.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold">{collections.length ? "More art" : "Art"}</h2>
          <ArtGrid art={unsorted} kidId={kidId} linkBase={`${base}/art`} imageBase={`${base}/img`} />
        </section>
      )}
    </>
  );
}
