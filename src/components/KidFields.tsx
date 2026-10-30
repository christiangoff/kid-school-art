import { Field, Input } from "./ui";

export function KidFields({ name, birthdate }: { name?: string; birthdate?: string | null }) {
  return (
    <>
      <Field label="Name">
        <Input name="name" defaultValue={name} required autoFocus />
      </Field>
      <Field label="Birthday" hint="Optional. Used to show their age on each piece of art.">
        <Input name="birthdate" type="date" defaultValue={birthdate ?? ""} />
      </Field>
    </>
  );
}
