import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { BookFields } from "@/components/BookFields";
import { BookPreview } from "@/components/BookPreview";
import { Card, PageHeader } from "@/components/ui";
import { bookArtAction, deleteBookAction, moveBookCollectionAction, updateBookAction } from "@/app/actions";
import { MIN_PRINT_PAGES, planBook } from "@/lib/book-plan";
import { bookArt, bookCollections, bookSections, BOOK_SIZES, getBook } from "@/lib/books";
import { can } from "@/lib/families";
import { collectionsFor } from "@/lib/gallery";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const PRINT_TIPS = [
  { name: "Blurb", how: "Upload the PDF with “PDF to Book”. Leave bleed on, and pick a size Blurb offers, like 12\" × 12\" or 10\" × 8\"." },
  { name: "Lulu", how: "Upload the PDF as a photo book interior. Leave bleed on, and pick 8.5\" × 11\", 11\" × 8.5\", or 8.5\" × 8.5\"." },
  { name: "A local print shop", how: "Bring the PDF with bleed on. Office stores can print and spiral-bind it." },
  { name: "Home printer", how: "Turn bleed off and choose 8.5\" × 11\" so each page fits on letter paper." },
  { name: "Shutterfly, Mixbook, or Artifact Uprising", how: "They only take photos into their own editor. Download the photo pack and drag it in. The files are numbered in book order, and captions.txt has the words to type in." },
];

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const user = await requireUser(`/books/${bookId}`);
  const found = getBook(Number(bookId), user.id);
  if (!found) notFound();
  const { book, kid, role } = found;
  const edit = can(role, "edit");
  const sections = bookSections(book);
  const plan = planBook(book, sections, kid.birthdate);
  const coverArtId = book.coverArtId ?? bookArt(book)[0]?.id ?? null;
  const ordered = bookCollections(book.id);
  const hidden = <input type="hidden" name="bookId" value={book.id} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={book.title}
        subtitle={`${BOOK_SIZES[book.size].label} · ${plan.pieceCount} pieces · ${plan.pages.length} pages`}
        back={{ href: `/kids/${kid.id}`, label: kid.name }}
      />

      <section>
        <h2 className="mb-3 text-xl font-bold">Preview</h2>
        <BookPreview plan={plan} color={kid.color} coverArtId={coverArtId} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {edit && (
            <Card>
              <h2 className="mb-1 text-lg font-bold">Pieces</h2>
              <p className="mb-4 text-sm text-muted">Click a piece to leave it out or put it back. Pieces run oldest to newest within each collection.</p>
              {sections.map((s) => {
                const i = ordered.findIndex((c) => c.id === s.collection.id);
                const all = [...s.art, ...s.excluded].sort((a, b) => (a.madeOn ?? a.createdAt).localeCompare(b.madeOn ?? b.createdAt) || a.id - b.id);
                return (
                  <div key={s.collection.id} className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">{s.collection.title}</h3>
                      <div className="flex gap-1">
                        {(["up", "down"] as const).map((dir) => (
                          <ActionForm key={dir} action={moveBookCollectionAction} className="">
                            {hidden}
                            <input type="hidden" name="collectionId" value={s.collection.id} />
                            <input type="hidden" name="direction" value={dir} />
                            <button
                              className="rounded-full border border-line px-2 text-sm disabled:opacity-30"
                              disabled={dir === "up" ? i === 0 : i === ordered.length - 1}
                              aria-label={`Move ${s.collection.title} ${dir}`}
                            >
                              {dir === "up" ? "↑" : "↓"}
                            </button>
                          </ActionForm>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {all.map((a) => {
                        const out = s.excluded.includes(a);
                        return (
                          <div key={a.id} className="relative">
                            <ActionForm action={bookArtAction} className="">
                              {hidden}
                              <input type="hidden" name="artId" value={a.id} />
                              <input type="hidden" name="op" value={out ? "include" : "exclude"} />
                              <button className="block w-full" title={out ? "Put back in the book" : "Leave out of the book"}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/art-files/${a.id}/thumb`} alt={a.title ?? ""} className={`aspect-square w-full rounded-lg object-cover ${out ? "opacity-30 grayscale" : ""} ${coverArtId === a.id ? "ring-4 ring-brand" : ""}`} />
                                {out && <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">Left out</span>}
                              </button>
                            </ActionForm>
                            {!out && coverArtId !== a.id && (
                              <ActionForm action={bookArtAction} className="">
                                {hidden}
                                <input type="hidden" name="artId" value={a.id} />
                                <input type="hidden" name="op" value="cover" />
                                <button className="mt-0.5 w-full text-center text-[0.7rem] text-muted hover:text-brand">Use as cover</button>
                              </ActionForm>
                            )}
                            {coverArtId === a.id && <p className="mt-0.5 text-center text-[0.7rem] font-semibold text-brand">Cover</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {edit && (
            <Card>
              <h2 className="mb-3 text-lg font-bold">Book settings</h2>
              <ActionForm action={updateBookAction}>
                {hidden}
                <BookFields book={book} collections={collectionsFor(kid.id)} chosen={ordered.map((c) => c.id)} defaults={{ title: "", subtitle: "" }} />
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold">Download</h2>
            <div className="mt-3 flex flex-col gap-2">
              <a href={`/books/${book.id}/pdf`} className="rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-dark">
                Print-ready PDF
              </a>
              {plan.pages.length < MIN_PRINT_PAGES && (
                <a href={`/books/${book.id}/pdf?pad`} className="rounded-full border border-line bg-white px-4 py-2 text-center text-sm font-semibold hover:bg-paper">
                  PDF padded to {MIN_PRINT_PAGES} pages
                </a>
              )}
              <a href={`/books/${book.id}/photos`} className="rounded-full border border-line bg-white px-4 py-2 text-center text-sm font-semibold hover:bg-paper">
                Photo pack (.zip)
              </a>
            </div>
            <p className="mt-3 text-xs text-muted">
              {book.bleed ? "Pages include ⅛\" bleed for a print service." : "No bleed, for home printing."} Big books can take a minute to make.
              {plan.pages.length < MIN_PRINT_PAGES && ` Most photo book printers need at least ${MIN_PRINT_PAGES} pages, so the padded PDF adds blank pages at the end.`}
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-bold">Where to print</h2>
            <ul className="mt-2 space-y-3 text-sm">
              {PRINT_TIPS.map((t) => (
                <li key={t.name}>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-muted">{t.how}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Sizes and page minimums change, so check the service's current options before ordering.</p>
          </Card>
          {edit && (
            <Card>
              <ActionForm action={deleteBookAction}>
                {hidden}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" required /> Yes, delete this book (the art stays)
                </label>
                <SubmitButton variant="danger">Delete book</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
