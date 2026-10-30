import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtGrid } from "@/components/ArtGrid";
import { collectionDetails } from "@/components/CollectionFields";
import { ButtonLink, Card, KidAvatar, PageHeader } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { can, getFamily, getKid } from "@/lib/families";
import { ageLabel } from "@/lib/format";
import { booksFor, BOOK_SIZES } from "@/lib/books";
import { artFor, collectionsFor } from "@/lib/gallery";
import { requireUser } from "@/lib/session";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

/** Lays out up to four previews: one fills the tile, three put the first on the left. */
function tileClass(count: number, index: number): string {
  if (count === 1) return "col-span-2 row-span-2";
  if (count === 2 || (count === 3 && index === 0)) return "row-span-2";
  return "";
}

export default async function KidPage({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const user = await requireUser(`/kids/${kidId}`);
  const found = getKid(Number(kidId), user.id);
  if (!found) notFound();
  const { kid, role } = found;
  const family = getFamily(kid.familyId, user.id)!;
  const edit = can(role, "edit");
  const collections = collectionsFor(kid.id);
  const unsorted = artFor(kid.id, "unsorted");
  const books = booksFor(kid.id);

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
        actions={
          edit && (
            <>
              <ButtonLink href={`/kids/${kid.id}/collections/new`}>New collection</ButtonLink>
              <ButtonLink href={`/share/kid/${kid.id}`} variant="secondary">Share</ButtonLink>
              <ButtonLink href={`/kids/${kid.id}/edit`} variant="secondary">Edit</ButtonLink>
            </>
          )
        }
      />

      {collections.length === 0 && unsorted.length === 0 ? (
        <Card className="py-10 text-center">
          <Icon name="frame" className="mx-auto size-10 text-muted" />
          <h2 className="mt-2 text-xl font-bold">No art yet</h2>
          <p className="mx-auto mt-1 max-w-md text-muted">
            {edit
              ? `Start a collection for ${kid.name}’s class, like “Preschool with Ms. Rivera”, then add art to it. Or upload below and sort it later.`
              : `Nobody has added ${kid.name}’s art yet.`}
          </p>
          {edit && (
            <ButtonLink href={`/kids/${kid.id}/collections/new`} className="mt-4">
              Start a collection
            </ButtonLink>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className="group">
              <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-2xl border border-line bg-white p-1 transition group-hover:shadow-md">
                {c.previewIds.length === 0 ? (
                  <div className="col-span-2 row-span-2 flex items-center justify-center text-muted" aria-hidden><Icon name="palette" className="size-10" /></div>
                ) : (
                  c.previewIds.map((id, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={id}
                      src={`/art-files/${id}/thumb`}
                      alt=""
                      className={`h-full w-full rounded-xl object-cover ${tileClass(c.previewIds.length, i)}`}
                    />
                  ))
                )}
              </div>
              <h2 className="mt-2 text-lg font-bold">{c.title}</h2>
              <p className="text-sm text-muted">
                {[collectionDetails(c), `${c.artCount} ${c.artCount === 1 ? "piece" : "pieces"}`].filter(Boolean).join(", ")}
              </p>
            </Link>
          ))}
        </div>
      )}

      {(edit || books.length > 0) && collections.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Year-end books</h2>
              <p className="text-sm text-muted">Turn collections into a book to print.</p>
            </div>
            {edit && <ButtonLink href={`/kids/${kid.id}/books/new`} variant="secondary">Make a book</ButtonLink>}
          </div>
          {books.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((b) => (
                <Link key={b.id} href={`/books/${b.id}`}>
                  <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
                    <Icon name="book" className="size-8 shrink-0 text-brand" />
                    <span>
                      <span className="block font-bold">{b.title}</span>
                      <span className="text-sm text-muted">{BOOK_SIZES[b.size].label}, {b.pieceCount} pieces</span>
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {(edit || unsorted.length > 0) && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Unsorted</h2>
          <p className="mb-4 text-sm text-muted">
            {edit
              ? "Art that isn’t in a collection yet. Upload a big batch here, then select pieces to move them."
              : "Art that isn’t in a collection yet."}
          </p>
          {edit && (
            <div className="mb-4">
              <Uploader kidId={kid.id} />
            </div>
          )}
          <ArtGrid art={unsorted} kidId={kid.id} canEdit={edit} collections={collections.map((c) => ({ id: c.id, title: c.title }))} />
        </section>
      )}
    </>
  );
}
