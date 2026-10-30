import fs from "node:fs";
import { getArt } from "@/lib/gallery";
import { artFile, MIME_BY_EXT, type Size } from "@/lib/images";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const SIZES: Size[] = ["thumb", "display", "original"];

/** Serves an image file to people in the kid's family. */
export async function GET(request: Request, { params }: { params: Promise<{ artId: string; size: string }> }) {
  const { artId, size } = await params;
  if (!SIZES.includes(size as Size)) return new Response("Not found", { status: 404 });
  const user = await currentUser();
  const found = user && getArt(Number(artId), user.id);
  if (!found) return new Response("Not found", { status: 404 });

  const { art } = found;
  const file = artFile(art.kidId, art.id, size as Size, art.originalExt);
  let data: Buffer;
  try {
    data = fs.readFileSync(file);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const headers: Record<string, string> = {
    "Content-Type": size === "original" ? (MIME_BY_EXT[art.originalExt] ?? "application/octet-stream") : "image/webp",
    // Files never change once uploaded, but they're private to the family.
    "Cache-Control": "private, max-age=31536000, immutable",
  };
  if (new URL(request.url).searchParams.has("download")) {
    const name = art.originalName ?? `art-${art.id}.${art.originalExt}`;
    headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
  }
  return new Response(new Uint8Array(data), { headers });
}
