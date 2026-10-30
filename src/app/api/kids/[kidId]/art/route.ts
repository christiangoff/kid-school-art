import { FamilyError } from "@/lib/families";
import { addArt } from "@/lib/gallery";
import { ImageError, processImage } from "@/lib/images";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Uploads one piece of art. The uploader sends files one at a time so each shows its own progress. */
export async function POST(request: Request, { params }: { params: Promise<{ kidId: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const { kidId } = await params;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file was sent." }, { status: 400 });
  const collectionId = Number(form.get("collectionId")) || null;
  const madeOn = typeof form.get("madeOn") === "string" ? (form.get("madeOn") as string) || null : null;

  try {
    const image = await processImage(Buffer.from(await file.arrayBuffer()));
    const id = addArt(Number(kidId), user.id, image, { collectionId, originalName: file.name, madeOn });
    return Response.json({ id });
  } catch (e) {
    if (e instanceof ImageError || e instanceof FamilyError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
