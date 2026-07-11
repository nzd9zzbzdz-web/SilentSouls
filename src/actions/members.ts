"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp, adminAuth, adminDb, orgRef } from "@/lib/firebase/admin";
import { requireOrgRole } from "@/lib/auth/session";
import { syncUserClaims } from "@/lib/auth/claims";
import { checkMilestones } from "@/lib/milestones";
import {
  createMemberSchema,
  inviteMemberSchema,
  officerNoteSchema,
  updateMemberSchema,
  type CreateMemberInput,
  type InviteMemberInput,
  type OfficerNoteInput,
  type UpdateMemberInput,
} from "@/lib/schemas/member";
import type { ActionResult } from "./activities";

/** Org-admin: create a member record (unlinked until they accept an invite). */
export async function createMember(
  raw: CreateMemberInput,
): Promise<ActionResult<{ memberId: string }>> {
  const parsed = createMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  try {
    const access = await requireOrgRole(input.orgId, "admin");
    const org = orgRef(input.orgId);

    const memberId = await adminDb.runTransaction(async (tx) => {
      const orgSnap = await tx.get(org);
      const orgData = orgSnap.data() ?? {};
      const memberCount = (orgData.memberCount ?? 0) as number;
      // Member numbers come from a monotonic counter, NOT the head-count, so
      // exiled/removed members never cause a number to be reused.
      const lastMemberNumber = (orgData.lastMemberNumber ?? memberCount) as number;
      const nextNumber = lastMemberNumber + 1;
      const ref = org.collection("members").doc();
      tx.set(ref, {
        uid: null,
        displayName: input.displayName,
        roadName: input.roadName,
        rankId: input.rankId,
        status: input.status,
        joinDate: Timestamp.fromDate(input.joinDate),
        ...(input.sponsorMemberId ? { sponsorMemberId: input.sponsorMemberId } : {}),
        memberNumber: nextNumber,
        stats: {},
        patchCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(org, {
        memberCount: FieldValue.increment(1),
        lastMemberNumber: nextNumber,
      });
      tx.set(org.collection("auditLogs").doc(), {
        actorUid: access.user.uid,
        action: "member.create",
        targetPath: ref.path,
        detail: `${input.roadName} (${input.displayName})`,
        at: FieldValue.serverTimestamp(),
      });
      return ref.id;
    });

    try {
      await checkMilestones(input.orgId, "member_added");
    } catch (err) {
      console.error("checkMilestones (member_added) failed post-commit:", err);
    }
    revalidatePath(`/[orgSlug]/portal/brotherhood`, "page");
    return { ok: true, data: { memberId } };
  } catch (e) {
    return failure(e);
  }
}

/** Org-admin: update member fields (rank change, status change, ...). */
export async function updateMember(raw: UpdateMemberInput): Promise<ActionResult> {
  const parsed = updateMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { orgId, memberId, ...fields } = parsed.data;

  try {
    const access = await requireOrgRole(orgId, "admin");
    const ref = orgRef(orgId).collection("members").doc(memberId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Member not found" };
    const current = snap.data();

    const update: Record<string, unknown> = {};
    if (fields.displayName) update.displayName = fields.displayName;
    if (fields.roadName) update.roadName = fields.roadName;
    if (fields.rankId) update.rankId = fields.rankId;
    if (fields.status) update.status = fields.status;
    if (fields.joinDate) update.joinDate = Timestamp.fromDate(fields.joinDate);
    if (fields.sponsorMemberId !== undefined) update.sponsorMemberId = fields.sponsorMemberId;
    if (!Object.keys(update).length) return { ok: false, error: "Nothing to update" };

    // De-provisioning: exile/retire strips portal access. Firestore and Auth
    // can't share a single transaction, so revoke access FIRST — if it throws
    // we bail before flipping status, leaving the member consistent. If the
    // status write later fails, access is already gone, which is the safe
    // failure direction: a stale status can be re-applied on retry, but a
    // member marked exiled with a live session cannot be allowed to happen.
    const linkedUid = current?.uid as string | null | undefined;
    const isDeprovision =
      !!linkedUid &&
      (fields.status === "exiled" || fields.status === "retired") &&
      fields.status !== current?.status;

    if (isDeprovision) {
      await adminDb
        .collection("users")
        .doc(linkedUid!)
        .set(
          { memberships: { [orgId]: FieldValue.delete() } },
          { merge: true },
        );
      await syncUserClaims(linkedUid!);
    }

    await ref.update(update);

    // Rank changes land in the service record.
    if (fields.rankId && fields.rankId !== current?.rankId) {
      const rankSnap = await orgRef(orgId).collection("ranks").doc(fields.rankId).get();
      await ref.collection("serviceRecord").add({
        kind: "promotion",
        title: `Rank changed to ${rankSnap.data()?.name ?? fields.rankId}`,
        detail: "",
        at: FieldValue.serverTimestamp(),
        byUid: access.user.uid,
      });
    }

    if (isDeprovision) {
      await ref.collection("serviceRecord").add({
        kind: "removal",
        title: fields.status === "exiled" ? "Exiled from the club" : "Retired",
        detail: "Portal access revoked.",
        at: FieldValue.serverTimestamp(),
        byUid: access.user.uid,
      });
    }

    await orgRef(orgId).collection("auditLogs").add({
      actorUid: access.user.uid,
      action: "member.update",
      targetPath: ref.path,
      detail: Object.keys(update).join(", "),
      at: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/[orgSlug]/portal/brotherhood`, "page");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Officer+: add an officer-only note to a member. */
export async function addOfficerNote(raw: OfficerNoteInput): Promise<ActionResult> {
  const parsed = officerNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { orgId, memberId, body } = parsed.data;

  try {
    const access = await requireOrgRole(orgId, "officer");
    await orgRef(orgId)
      .collection("members")
      .doc(memberId)
      .collection("notes")
      .add({ body, authorUid: access.user.uid, at: FieldValue.serverTimestamp() });
    revalidatePath(`/[orgSlug]/portal/brotherhood/${memberId}`, "page");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

/** Org-admin: generate an invite for an unlinked member record. */
export async function inviteMember(
  raw: InviteMemberInput,
): Promise<ActionResult<{ inviteUrl: string }>> {
  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { orgId, memberId, email, role } = parsed.data;

  try {
    const access = await requireOrgRole(orgId, "admin");
    const org = orgRef(orgId);
    const memberSnap = await org.collection("members").doc(memberId).get();
    if (!memberSnap.exists) return { ok: false, error: "Member not found" };
    if (memberSnap.data()?.uid) return { ok: false, error: "Member already has an account" };

    const token = randomBytes(24).toString("base64url");
    await org.collection("invites").add({
      email,
      memberId,
      role,
      token,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    });

    const orgSnap = await org.get();
    const slug = orgSnap.data()?.slug ?? orgId;
    await org.collection("auditLogs").add({
      actorUid: access.user.uid,
      action: "member.invite",
      targetPath: memberSnap.ref.path,
      detail: email,
      at: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      data: { inviteUrl: `/${slug}/volunteer-resources?invite=${token}` },
    };
  } catch (e) {
    return failure(e);
  }
}

class InviteError extends Error {}

/**
 * New user accepts an invite: link member.uid, write membership, sync claims.
 * Called right after client-side signup, passing a FRESH Firebase ID token.
 *
 * Security: the caller's identity is derived ONLY from the verified ID token —
 * never from client-supplied uid/email (which would let anyone with the token
 * bind an admin-role member record to their own account). The authenticated
 * email must match the invited email, and the used/expiry check runs inside the
 * transaction so a token can't be redeemed twice under a race.
 */
export async function acceptInvite(raw: {
  orgId: string;
  token: string;
  idToken: string;
}): Promise<ActionResult> {
  const { orgId, token, idToken } = raw;
  if (!orgId || !token || !idToken) return { ok: false, error: "Invalid invite" };

  try {
    // Authenticate the caller from a fresh, non-revoked ID token.
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;
    const email = decoded.email;
    if (!email) return { ok: false, error: "Your account has no email address" };
    const displayName = decoded.name ?? email;

    const org = orgRef(orgId);
    const inviteQuery = await org
      .collection("invites")
      .where("token", "==", token)
      .limit(1)
      .get();
    if (inviteQuery.empty) return { ok: false, error: "Invite not found" };
    const inviteRef = inviteQuery.docs[0].ref;

    await adminDb.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);
      const data = inviteSnap.data();
      if (!data) throw new InviteError("Invite not found");
      if (data.usedAt) throw new InviteError("This invite has already been used");
      if (data.expiresAt.toDate() < new Date()) throw new InviteError("This invite has expired");
      // Identity binding: only the invited email may redeem the invite.
      if (String(data.email).toLowerCase() !== email.toLowerCase()) {
        throw new InviteError("This invite was issued to a different email address");
      }

      // The member must still be unlinked. Multiple invites can be issued for
      // one member before any is accepted; without this check a second redeemer
      // would overwrite member.uid and bind two accounts to the same member.
      const memberRef = org.collection("members").doc(data.memberId);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) throw new InviteError("Member record no longer exists");
      if (memberSnap.data()?.uid) {
        throw new InviteError("This member is already linked to an account");
      }

      tx.update(memberRef, { uid });
      tx.set(
        adminDb.collection("users").doc(uid),
        {
          email,
          displayName,
          memberships: { [orgId]: { memberId: data.memberId, role: data.role } },
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.update(inviteRef, { usedAt: FieldValue.serverTimestamp() });
    });

    await syncUserClaims(uid);
    return { ok: true };
  } catch (e) {
    if (e instanceof InviteError) return { ok: false, error: e.message };
    return failure(e);
  }
}

function failure(e: unknown): { ok: false; error: string } {
  if (e instanceof Error && e.name === "AuthError") {
    return { ok: false, error: e.message === "unauthenticated" ? "Sign in required" : "Not permitted" };
  }
  console.error(e);
  return { ok: false, error: "Something went wrong" };
}
