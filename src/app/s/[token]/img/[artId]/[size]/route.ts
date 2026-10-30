import fs from "node:fs";
import { artFile, MIME_BY_EXT, type Size } from "@/lib/images";
import { sharedPiece } from "@/lib/shared-view";

export const dynamic = "force-dynamic";

/** Serves images to people with a share link. Originals only when the link allows downloads. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string; artId: string; size: string }> }) {
  const { token, artId, size } = await params;
  const found = sharedPiece(token, Number(artId));
  if (!found) return new Response("Not found", { status: 404 });
  const { art, link } = found;
  if (!["thumb", "display", "original"].includes(size) || (size === "original" && !link.allowDownload)) {
    return new Response("Not found", { status: 404 });
  }
  let data: Buffer;
  try {
    data = fs.readFileSync(artFile(art.kidId, art.id, size as Size, art.originalExt));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const headers: Record<string, string> = {
    "Content-Type": size === "original" ? (MIME_BY_EXT[art.originalExt] ?? "application/octet-stream") : "image/webp",
    // Short cache, so turning a link off takes effect quickly.
    "Cache-Control": "private, max-age=300",
    "X-Robots-Tag": "noindex",
  };
  if (new URL(request.url).searchParams.has("download")) {
    const name = art.originalName ?? `art-${art.id}.${art.originalExt}`;
    headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
  }
  return new Response(new Uint8Array(data), { headers });
}
