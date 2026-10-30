import type { Metadata } from "next";
import { sharedArt, sharedPiece } from "@/lib/shared-view";
import { ExpiredShare, SharedPiece } from "../../shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedArtPage({ params }: { params: Promise<{ token: string; artId: string }> }) {
  const { token, artId } = await params;
  const found = sharedPiece(token, Number(artId));
  if (!found) return <ExpiredShare />;
  const list = sharedArt(found.link);
  const i = list.findIndex((a) => a.id === found.art.id);
  return <SharedPiece token={token} link={found.link} art={found.art} prev={list[i - 1]?.id ?? null} next={list[i + 1]?.id ?? null} />;
}
