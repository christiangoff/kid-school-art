import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, Input, inputClass, Select } from "@/components/ui";
import { deleteArtAction, setCoverAction, updateArtAction } from "@/app/actions";
import { can } from "@/lib/families";
import { ageLabel } from "@/lib/format";
import { collectionsFor, getArt, getCollection, neighbors } from "@/lib/gallery";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function ArtPage({ params }: { params: Promise<{ artId: string }> }) {
  const { artId } = await params;
  const user = await requireUser(`/art/${artId}`);
  const found = getArt(Number(artId), user.id);
  if (!found) notFound();
  const { art, kid, role } = found;
  const edit = can(role, "edit");
  const collection = art.collectionId ? getCollection(art.collectionId, user.id)?.collection : null;
  const collections = collectionsFor(kid.id);
  const { prev, next, index, total } = neighbors(art);
  const back = collection
    ? { href: `/collections/${collection.id}`, label: collection.title }
    : { href: `/kids/${kid.id}`, label: `${kid.name}'s unsorted art` };
  // How old they were when they made it (or when it was uploaded, if we don't know).
  const ageThen = kid.birthdate ? ageLabel(kid.birthdate, new Date(`${art.madeOn ?? art.createdAt.slice(0, 10)}T00:00:00`)) : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-3 flex items-center justify-between text-sm">
          <Link href={back.href} className="text-muted hover:text-ink">← {back.label}</Link>
          <span className="flex items-center gap-3 text-muted">
            {prev ? <Link href={`/art/${prev}`} className="font-semibold text-ink">‹ Newer</Link> : <span>‹ Newer</span>}
            <span>{index + 1} of {total}</span>
            {next ? <Link href={`/art/${next}`} className="font-semibold text-ink">Older ›</Link> : <span>Older ›</span>}
          </span>
        </div>
        <div className="flex items-center justify-center rounded-2xl border border-line bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/art-files/${art.id}/display`}
            width={art.width}
            height={art.height}
            alt={art.title ?? `Art by ${kid.name}`}
            className="h-auto max-h-[75vh] w-auto max-w-full rounded-lg"
          />
        </div>
      </div>

      <aside className="space-y-4">
        <Card>
          <h1 className="text-2xl font-bold">{art.title ?? "Untitled"}</h1>
          <p className="mt-1 text-sm text-muted">
            By {kid.name}
            {art.madeOn && ` · ${formatDate(art.madeOn)}`}
            {ageThen && ` · ${ageThen}`}
          </p>
          {art.note && <blockquote className="mt-3 border-l-4 border-brand/40 pl-3 italic">“{art.note}”</blockquote>}
          <a href={`/art-files/${art.id}/original?download`} className="mt-4 inline-block text-sm font-semibold text-brand">
            Download original
          </a>
        </Card>

        {edit && (
          <Card>
            <h2 className="mb-3 font-bold">Details</h2>
            <ActionForm action={updateArtAction} key={art.id}>
              <input type="hidden" name="artId" value={art.id} />
              <Field label="Title">
                <Input name="title" defaultValue={art.title ?? ""} placeholder="Rainbow house" />
              </Field>
              <Field label={`In ${kid.name}'s words`} hint="What they said about it, if anything.">
                <textarea name="note" rows={3} className={inputClass} defaultValue={art.note ?? ""} />
              </Field>
              <Field label="Date made">
                <Input name="madeOn" type="date" defaultValue={art.madeOn ?? ""} />
              </Field>
              <Field label="Collection">
                <Select name="collectionId" defaultValue={art.collectionId ?? ""}>
                  <option value="">Unsorted</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </Select>
              </Field>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </Card>
        )}

        {edit && (
          <Card className="space-y-3">
            {collection && collection.coverArtId !== art.id && (
              <ActionForm action={setCoverAction}>
                <input type="hidden" name="artId" value={art.id} />
                <input type="hidden" name="collectionId" value={collection.id} />
                <SubmitButton variant="secondary">Use as collection cover</SubmitButton>
              </ActionForm>
            )}
            <ActionForm action={deleteArtAction}>
              <input type="hidden" name="artId" value={art.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" required /> Yes, delete this piece
              </label>
              <SubmitButton variant="danger">Delete</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </aside>
    </div>
  );
}
