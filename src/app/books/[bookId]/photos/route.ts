import { getBook } from "@/lib/books";
import { photoPack } from "@/lib/photo-pack";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The book's art as a zip of numbered photos, for editors like Shutterfly and Mixbook. */
export async function GET(_: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const user = await currentUser();
  const found = user && getBook(Number(bookId), user.id);
  if (!found) return new Response("Not found", { status: 404 });
  const zip = await photoPack(found.book, found.kid.birthdate);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${found.book.title} photos.zip`)}`,
    },
  });
}
