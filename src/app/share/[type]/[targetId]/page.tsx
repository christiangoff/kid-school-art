import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ShareLinkList } from "@/components/ShareLinkList";
import { Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { baseUrl, createShareLinkAction } from "@/app/actions";
import { can, getKid } from "@/lib/families";
import { getArt, getCollection } from "@/lib/gallery";
import { requireUser } from "@/lib/session";
import { EXPIRY_OPTIONS, shareLinks, type ShareTarget } from "@/lib/sharing";

export const dynamic = "force-dynamic";

function resolve(type: string, id: number, userId: number) {
  if (type === "kid") {
    const f = getKid(id, userId);
    return f && { target: { kidId: id } as ShareTarget, name: `${f.kid.name}’s page`, what: `all of ${f.kid.name}’s collections`, back: `/kids/${id}`, backLabel: f.kid.name, ...f };
  }
  if (type === "collection") {
    const f = getCollection(id, userId);
    return f && { target: { collectionId: id } as ShareTarget, name: f.collection.title, what: "this collection", back: `/collections/${id}`, backLabel: f.collection.title, ...f };
  }
  if (type === "art") {
    const f = getArt(id, userId);
    const name = f?.art.title ?? "This piece";
    return f && { target: { artId: id } as ShareTarget, name, what: "this piece", back: `/art/${id}`, backLabel: name, ...f };
  }
  return null;
}

export default async function SharePage({ params }: { params: Promise<{ type: string; targetId: string }> }) {
  const { type, targetId } = await params;
  const user = await requireUser(`/share/${type}/${targetId}`);
  const found = resolve(type, Number(targetId), user.id);
  if (!found || !can(found.role, "edit")) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={`Share ${found.name}`}
        subtitle="Make a read-only link for people who don’t have an account, like a teacher or a friend. To share with family, invite them instead."
        back={{ href: found.back, label: found.backLabel }}
      />
      <Card>
        <h2 className="mb-3 text-lg font-bold">New link</h2>
        <ActionForm action={createShareLinkAction}>
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="targetId" value={targetId} />
          <p className="text-sm text-muted">People with the link can see {found.what}, but can’t change anything.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Who it’s for" hint="Just a note for you, like “Aunt Kim”.">
              <Input name="label" />
            </Field>
            <Field label="Link stops working">
              <Select name="expires" defaultValue="30">
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowDownload" className="accent-brand" /> Let them download the original files
          </label>
          <SubmitButton>Create link</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-bold">Active links</h2>
        <ShareLinkList links={shareLinks(found.kid.familyId, found.target)} baseUrl={await baseUrl()} />
      </Card>
    </div>
  );
}
