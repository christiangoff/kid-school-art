import { BOOK_LAYOUTS, BOOK_SIZES, type Book } from "@/lib/books";
import type { Collection } from "@/lib/gallery";
import { collectionDetails } from "@/lib/collection-details";
import { Field, Input, inputClass, Select } from "./ui";

/** Settings shared by the new-book form and the book builder. */
export function BookFields({ book, collections, chosen, defaults }: {
  book?: Book;
  collections: (Collection & { artCount: number })[];
  chosen: number[];
  defaults: { title: string; subtitle: string };
}) {
  const check = (name: string, label: string, on: boolean) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={on} className="accent-brand" /> {label}
    </label>
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input name="title" defaultValue={book?.title ?? defaults.title} required />
        </Field>
        <Field label="Subtitle" hint="Optional, like the school year.">
          <Input name="subtitle" defaultValue={book?.subtitle ?? defaults.subtitle} />
        </Field>
        <Field label="Size">
          <Select name="size" defaultValue={book?.size ?? "square8"}>
            {Object.entries(BOOK_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Layout">
          <Select name="layout" defaultValue={book?.layout ?? "one"}>
            {Object.entries(BOOK_LAYOUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Collections in the book</legend>
        {collections.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Make a collection first, then add it to a book.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {collections.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="collectionId" value={c.id} defaultChecked={chosen.includes(c.id)} className="mt-1 accent-brand" />
                <span>
                  <span className="font-semibold">{c.title}</span>
                  <span className="block text-muted">{[collectionDetails(c), `${c.artCount} pieces`].filter(Boolean).join(", ")}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Under each piece, show</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {check("showTitle", "Title", book?.showTitle ?? true)}
          {check("showNote", "What they said", book?.showNote ?? true)}
          {check("showDate", "Date and age", book?.showDate ?? true)}
        </div>
      </fieldset>

      <Field label="Dedication page" hint={'Optional, like "For Grandma and Grandpa, with love."'}>
        <textarea name="dedication" rows={2} className={inputClass} defaultValue={book?.dedication ?? ""} />
      </Field>

      {check("bleed", "Add bleed for a print service (⅛\" past the edge, trimmed off when printed). Turn off for home printing.", book?.bleed ?? true)}
    </>
  );
}
