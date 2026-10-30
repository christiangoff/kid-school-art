import { GRADES, schoolYearFor, type Collection } from "@/lib/gallery";
import { Field, Input, inputClass } from "./ui";

/** School years from a few back to next year, newest first. */
function yearOptions(): string[] {
  const now = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => schoolYearFor(new Date(now + 1 - i, 8, 1)));
}

export function CollectionFields({ collection, schools, teachers }: {
  collection?: Collection;
  schools: string[];
  teachers: string[];
}) {
  return (
    <>
      <Field label="Collection name" hint={'For example, "Preschool with Ms. Rivera" or "Fall 2026".'}>
        <Input name="title" defaultValue={collection?.title} required autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="School">
          <Input name="school" list="schools" defaultValue={collection?.school ?? schools[0] ?? ""} />
        </Field>
        <Field label="Teacher">
          <Input name="teacher" list="teachers" defaultValue={collection?.teacher ?? ""} />
        </Field>
        <Field label="Grade">
          <Input name="grade" list="grades" defaultValue={collection?.grade ?? ""} />
        </Field>
        <Field label="School year">
          <Input name="schoolYear" list="years" defaultValue={collection?.schoolYear ?? schoolYearFor()} />
        </Field>
      </div>
      <Field label="Description" hint="Optional.">
        <textarea name="description" rows={3} className={inputClass} defaultValue={collection?.description ?? ""} />
      </Field>
      <datalist id="schools">{schools.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="teachers">{teachers.map((t) => <option key={t} value={t} />)}</datalist>
      <datalist id="grades">{GRADES.map((g) => <option key={g} value={g} />)}</datalist>
      <datalist id="years">{yearOptions().map((y) => <option key={y} value={y} />)}</datalist>
    </>
  );
}

export { collectionDetails } from "@/lib/collection-details";
