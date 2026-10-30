import { tagAction, untagAction } from "@/app/actions";
import { can, type Role } from "@/lib/families";
import { taggableMembers, tagsOn, type TagTarget } from "@/lib/sharing";
import { ActionForm, SubmitButton } from "./ActionForm";
import { Card, Input } from "./ui";

/** Tag family members on a piece or collection so it shows up on their For you page. */
export function TagPanel({ target, familyId, userId, role }: {
  target: TagTarget;
  familyId: number;
  userId: number;
  role: Role;
}) {
  const tagged = tagsOn(target);
  const untagged = taggableMembers(familyId, userId).filter((m) => !tagged.some((t) => t.userId === m.userId));
  const hidden = "artId" in target
    ? <input type="hidden" name="artId" value={target.artId} />
    : <input type="hidden" name="collectionId" value={target.collectionId} />;

  return (
    <Card>
      <h2 className="font-bold">Tag family</h2>
      {tagged.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {tagged.map((t) => (
            <li key={t.userId} className="flex items-center gap-1 rounded-full bg-paper px-3 py-1 text-sm">
              {t.name}
              {(can(role, "edit") || t.userId === userId) && (
                <ActionForm action={untagAction} className="inline">
                  {hidden}
                  <input type="hidden" name="userId" value={t.userId} />
                  <button className="-my-1 -mr-2 grid size-8 place-items-center rounded-full text-muted hover:bg-white hover:text-danger" aria-label={`Untag ${t.name}`}>×</button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      )}
      {untagged.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          {tagged.length ? "Everyone in the family is tagged." : "Invite family members to tag them here."}
        </p>
      ) : (
        <ActionForm action={tagAction} className="mt-3 space-y-3">
          {hidden}
          <div className="flex flex-wrap gap-2">
            {untagged.map((m) => (
              <label key={m.userId} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
                <input type="checkbox" name="userId" value={m.userId} className="accent-brand" />
                {m.name}
                {m.relationship && <span className="text-muted">({m.relationship})</span>}
              </label>
            ))}
          </div>
          <Input name="message" placeholder="Add a note (optional)" aria-label="Note" />
          <SubmitButton variant="secondary">Tag</SubmitButton>
        </ActionForm>
      )}
    </Card>
  );
}
