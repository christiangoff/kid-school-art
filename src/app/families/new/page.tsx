import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { familiesFor } from "@/lib/families";
import { requireUser } from "@/lib/session";
import { createFamilyAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewFamily() {
  const user = await requireUser("/families/new");
  const first = familiesFor(user.id).length === 0;
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title={first ? "Set up your family" : "New family"}
        subtitle="A family holds your kids and the people who can see their art. You can invite others next."
        back={first ? undefined : { href: "/", label: "Your families" }}
      />
      <Card>
        <ActionForm action={createFamilyAction}>
          <Field label="Family name" hint={'For example, "The Goff Family".'}>
            <Input name="name" required autoFocus />
          </Field>
          <SubmitButton>Create family</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
