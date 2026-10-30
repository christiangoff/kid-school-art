import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { BookFields } from "@/components/BookFields";
import { Card, PageHeader } from "@/components/ui";
import { createBookAction } from "@/app/actions";
import { can, getKid } from "@/lib/families";
import { collectionsFor, schoolYearFor } from "@/lib/gallery";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewBook({ params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const user = await requireUser(`/kids/${kidId}/books/new`);
  const found = getKid(Number(kidId), user.id);
  if (!found || !can(found.role, "edit")) notFound();
  const { kid } = found;
  const collections = collectionsFor(kid.id);
  const year = schoolYearFor();
  // Start with this school year's collections, or all of them if none are tagged with it.
  const thisYear = collections.filter((c) => c.schoolYear === year).map((c) => c.id);
  const chosen = thisYear.length ? thisYear : collections.map((c) => c.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Make a year-end book" subtitle="Pick the collections to include. You can change everything after." back={{ href: `/kids/${kid.id}`, label: kid.name }} />
      <Card>
        <ActionForm action={createBookAction}>
          <input type="hidden" name="kidId" value={kid.id} />
          <BookFields collections={collections} chosen={chosen} defaults={{ title: `${kid.name}'s Art`, subtitle: year }} />
          <SubmitButton>Make the book</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
