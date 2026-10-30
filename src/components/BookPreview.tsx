import type { BookPlan, Page } from "@/lib/book-plan";

/** Small pictures of each page, laid out the same way as the PDF. */
export function BookPreview({ plan, color, coverArtId }: { plan: BookPlan; color: string; coverArtId: number | null }) {
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const label = (i: number) => (i === 0 ? "Cover" : `Page ${i}`);

  function body(p: Page) {
    if (p.kind === "cover") {
      return (
        <div className="flex h-full flex-col items-center p-[6%] text-center text-white" style={{ background: color }}>
          <p className="text-[0.7rem] font-bold leading-tight">{p.title}</p>
          {p.subtitle && <p className="text-[0.5rem] opacity-90">{p.subtitle}</p>}
          {coverArtId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/art-files/${coverArtId}/thumb`} alt="" className="mt-[6%] min-h-0 flex-1 border-[3px] border-white object-contain" />
          )}
        </div>
      );
    }
    if (p.kind === "dedication") {
      return <div className="flex h-full items-center justify-center bg-paper p-[10%] text-center text-[0.5rem] italic">{p.text}</div>;
    }
    if (p.kind === "section") {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-paper p-[8%] text-center">
          <span className="mb-1 h-0.5 w-6" style={{ background: color }} />
          <p className="text-[0.6rem] font-bold leading-tight">{p.collection.title}</p>
          <p className="text-[0.45rem] text-muted">{p.count} pieces</p>
        </div>
      );
    }
    if (p.kind === "art") {
      return (
        <div className="relative h-full bg-white">
          {p.slots.map((s) => {
            const hasCaption = s.caption.title || s.caption.note || s.caption.meta;
            return (
              <div
                key={s.art.id}
                className="absolute flex flex-col items-center"
                style={{ left: pct(s.x, plan.width), top: pct(s.y, plan.height), width: pct(s.w, plan.width), height: pct(s.h, plan.height) }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/art-files/${s.art.id}/thumb`} alt="" className="min-h-0 w-full flex-1 object-contain" />
                {hasCaption && <span className="mt-[3%] h-[3px] w-1/2 rounded bg-line" aria-hidden />}
              </div>
            );
          })}
        </div>
      );
    }
    return <div className="h-full bg-white" />;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {plan.pages.map((p, i) => (
        <figure key={i}>
          <div className="overflow-hidden rounded border border-line shadow-sm" style={{ aspectRatio: `${plan.width} / ${plan.height}` }}>
            {body(p)}
          </div>
          <figcaption className="mt-1 text-center text-xs text-muted">{label(i)}</figcaption>
        </figure>
      ))}
    </div>
  );
}
