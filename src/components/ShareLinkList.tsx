import { revokeShareLinkAction } from "@/app/actions";
import type { ShareLink } from "@/lib/sharing";
import { ActionForm, CopyLink } from "./ActionForm";

function when(date: string): string {
  return new Date(`${date.replace(" ", "T")}Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Active share links, each with its address, stats, and a way to turn it off. */
export function ShareLinkList({ links, baseUrl, showTarget }: { links: ShareLink[]; baseUrl: string; showTarget?: boolean }) {
  if (links.length === 0) return <p className="text-sm text-muted">No active links.</p>;
  return (
    <ul className="space-y-4">
      {links.map((l) => (
        <li key={l.id} className="rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">
                {l.label ?? "Share link"}
                {showTarget && <span className="block font-normal text-muted">{l.targetName}</span>}
              </p>
              <p className="text-xs text-muted">
                {l.expiresAt ? `Expires ${when(l.expiresAt)}` : "Never expires"}
                {", "}
                {l.allowDownload ? "downloads allowed" : "view only"}
                {", "}
                {l.viewCount === 0 ? "not opened yet" : `opened ${l.viewCount} ${l.viewCount === 1 ? "time" : "times"}, last ${when(l.lastViewedAt!)}`}
              </p>
            </div>
            <ActionForm action={revokeShareLinkAction} className="">
              <input type="hidden" name="linkId" value={l.id} />
              <button className="min-h-8 whitespace-nowrap text-sm font-semibold text-danger hover:underline">Turn off link</button>
            </ActionForm>
          </div>
          <div className="mt-2">
            <CopyLink link={`${baseUrl}/s/${l.token}`} title="Link" note="Anyone with this link can look, without signing in." />
          </div>
        </li>
      ))}
    </ul>
  );
}
