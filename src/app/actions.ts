"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountError, createUser, openSignupAllowed, verifyPassword } from "@/lib/accounts";
import {
  acceptInvite,
  addKid,
  createFamily,
  createInvite,
  deleteKid,
  FamilyError,
  findInvite,
  removeMember,
  renameFamily,
  revokeInvite,
  ROLES,
  updateKid,
  updateMember,
  type Role,
} from "@/lib/families";
import {
  createCollection,
  deleteArt,
  deleteCollection,
  moveArt,
  setCover,
  updateArt,
  updateCollection,
  type CollectionInput,
} from "@/lib/gallery";
import { requireUser, safeNext, signIn, signOut } from "@/lib/session";

export type ActionResult = { error?: string; message?: string; link?: string };

function text(data: FormData, key: string): string {
  const v = data.get(key);
  return typeof v === "string" ? v : "";
}

function id(data: FormData, key: string): number {
  return Number(text(data, key));
}

function role(data: FormData): Role {
  const r = text(data, "role") as Role;
  if (!ROLES.includes(r)) throw new FamilyError("Please pick a role.");
  return r;
}

/** Turns expected errors into a message for the form; anything else is a real bug. */
async function attempt(fn: () => void | Promise<void>): Promise<ActionResult | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof AccountError || e instanceof FamilyError) return { error: e.message };
    throw e;
  }
}

async function baseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// Accounts

export async function signupAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const invite = text(data, "invite");
  if (!openSignupAllowed() && !(invite && findInvite(invite))) {
    return { error: "New accounts need an invite from a family owner." };
  }
  let userId = 0;
  const failed = await attempt(() => {
    userId = createUser({ email: text(data, "email"), name: text(data, "name"), password: text(data, "password") }).id;
  });
  if (failed) return failed;
  await signIn(userId);
  if (invite) {
    const joined = await attempt(() => {
      acceptInvite(invite, userId);
    });
    if (joined) return joined;
  }
  redirect("/");
}

export async function loginAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = verifyPassword(text(data, "email"), text(data, "password"));
  if (!user) return { error: "That email and password don't match." };
  await signIn(user.id);
  redirect(safeNext(data.get("next")));
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

// Families

export async function createFamilyAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let familyId = 0;
  const failed = await attempt(() => {
    familyId = createFamily(text(data, "name"), user.id);
  });
  if (failed) return failed;
  redirect(`/families/${familyId}`);
}

export async function renameFamilyAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const familyId = id(data, "familyId");
  const failed = await attempt(() => renameFamily(familyId, user.id, text(data, "name")));
  if (failed) return failed;
  revalidatePath(`/families/${familyId}`, "layout");
  return { message: "Saved." };
}

// Kids

export async function addKidAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let kidId = 0;
  const failed = await attempt(() => {
    kidId = addKid(id(data, "familyId"), user.id, { name: text(data, "name"), birthdate: text(data, "birthdate") || null });
  });
  if (failed) return failed;
  redirect(`/kids/${kidId}`);
}

export async function updateKidAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const kidId = id(data, "kidId");
  const failed = await attempt(() =>
    updateKid(kidId, user.id, { name: text(data, "name"), birthdate: text(data, "birthdate") || null }),
  );
  if (failed) return failed;
  redirect(`/kids/${kidId}`);
}

export async function deleteKidAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const failed = await attempt(() => deleteKid(id(data, "kidId"), user.id));
  if (failed) return failed;
  redirect(`/families/${id(data, "familyId")}`);
}

// Members and invites

export async function createInviteAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const familyId = id(data, "familyId");
  let token = "";
  const failed = await attempt(() => {
    token = createInvite(familyId, user.id, {
      email: text(data, "email") || null,
      role: role(data),
      relationship: text(data, "relationship") || null,
    });
  });
  if (failed) return failed;
  revalidatePath(`/families/${familyId}/settings`);
  return { link: `${await baseUrl()}/invite/${token}` };
}

export async function revokeInviteAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const familyId = id(data, "familyId");
  const failed = await attempt(() => revokeInvite(familyId, user.id, id(data, "inviteId")));
  if (failed) return failed;
  revalidatePath(`/families/${familyId}/settings`);
  return {};
}

export async function updateMemberAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const familyId = id(data, "familyId");
  const failed = await attempt(() =>
    updateMember(familyId, user.id, id(data, "userId"), {
      role: role(data),
      relationship: text(data, "relationship") || null,
    }),
  );
  if (failed) return failed;
  revalidatePath(`/families/${familyId}`, "layout");
  return { message: "Saved." };
}

export async function removeMemberAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const familyId = id(data, "familyId");
  const memberId = id(data, "userId");
  const failed = await attempt(() => removeMember(familyId, user.id, memberId));
  if (failed) return failed;
  if (memberId === user.id) redirect("/");
  revalidatePath(`/families/${familyId}`, "layout");
  return {};
}

export async function acceptInviteAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let familyId = 0;
  const failed = await attempt(() => {
    familyId = acceptInvite(text(data, "token"), user.id);
  });
  if (failed) return failed;
  redirect(`/families/${familyId}`);
}

// Collections and art

function collectionInput(data: FormData): CollectionInput {
  return {
    title: text(data, "title"),
    school: text(data, "school"),
    teacher: text(data, "teacher"),
    grade: text(data, "grade"),
    schoolYear: text(data, "schoolYear"),
    description: text(data, "description"),
  };
}

export async function createCollectionAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let collectionId = 0;
  const failed = await attempt(() => {
    collectionId = createCollection(id(data, "kidId"), user.id, collectionInput(data));
  });
  if (failed) return failed;
  redirect(`/collections/${collectionId}`);
}

export async function updateCollectionAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const collectionId = id(data, "collectionId");
  const failed = await attempt(() => updateCollection(collectionId, user.id, collectionInput(data)));
  if (failed) return failed;
  redirect(`/collections/${collectionId}`);
}

export async function deleteCollectionAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let kidId = 0;
  const failed = await attempt(() => {
    kidId = deleteCollection(id(data, "collectionId"), user.id);
  });
  if (failed) return failed;
  redirect(`/kids/${kidId}`);
}

export async function updateArtAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const artId = id(data, "artId");
  const failed = await attempt(() =>
    updateArt(artId, user.id, {
      title: text(data, "title"),
      note: text(data, "note"),
      madeOn: text(data, "madeOn") || null,
      collectionId: id(data, "collectionId") || null,
    }),
  );
  if (failed) return failed;
  revalidatePath(`/art/${artId}`);
  return { message: "Saved." };
}

export async function deleteArtAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  let back = "/";
  const failed = await attempt(() => {
    const art = deleteArt(id(data, "artId"), user.id);
    back = art.collectionId ? `/collections/${art.collectionId}` : `/kids/${art.kidId}`;
  });
  if (failed) return failed;
  redirect(back);
}

export async function setCoverAction(_: ActionResult, data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const failed = await attempt(() => setCover(id(data, "collectionId"), user.id, id(data, "artId")));
  if (failed) return failed;
  revalidatePath(`/art/${id(data, "artId")}`);
  return { message: "This is now the collection's cover." };
}

export async function moveArtAction(kidId: number, artIds: number[], collectionId: number | null): Promise<ActionResult> {
  const user = await requireUser();
  const failed = await attempt(() => moveArt(kidId, user.id, artIds, collectionId));
  if (failed) return failed;
  revalidatePath(`/kids/${kidId}`);
  if (collectionId) revalidatePath(`/collections/${collectionId}`);
  return {};
}
