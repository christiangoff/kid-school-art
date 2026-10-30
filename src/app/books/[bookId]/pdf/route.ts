import { planBook } from "@/lib/book-plan";
import { renderBookPdf } from "@/lib/book-pdf";
import { artById } from "@/lib/gallery";
import { bookArt, bookSections, getBook } from "@/lib/books";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function fileName(title: string, ext: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(`${title}.${ext}`)}`;
}

/** The print-ready PDF. ?pad adds blank pages up to the usual photo book minimum. */
export async function GET(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const user = await currentUser();
  const found = user && getBook(Number(bookId), user.id);
  if (!found) return new Response("Not found", { status: 404 });
  const { book, kid } = found;
  const pad = new URL(request.url).searchParams.has("pad");
  const plan = planBook(book, bookSections(book), kid.birthdate, pad);
  const coverArt = book.coverArtId ? artById(book.coverArtId) : (bookArt(book)[0] ?? null);
  const pdf = await renderBookPdf(plan, { kidName: kid.name, color: kid.color, coverArt, title: book.title });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": fileName(book.title, "pdf") },
  });
}
