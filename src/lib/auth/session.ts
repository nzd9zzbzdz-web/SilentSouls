import "server-only";
import { cookies } from "next/headers";
import { adminAuth, orgRef } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import type { SessionClaims, SystemRole } from "@/lib/types";

export interface SessionUser {
  uid: string;
  email?: string;
  claims: SessionClaims;
}

/** Verify the session cookie (revocation-aware). Returns null when absent/invalid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      claims: {
        superAdmin: (decoded as Record<string, unknown>).superAdmin === true,
        orgs: (decoded as Record<string, unknown>).orgs as SessionClaims["orgs"],
      },
    };
  } catch {
    return null;
  }
}

const ROLE_LEVEL: Record<SystemRole, number> = {
  member: 1,
  officer: 2,
  admin: 3,
};

export interface OrgAccess {
  user: SessionUser;
  role: SystemRole;
  memberId: string | null; // null for super admins without a member record
  isSuper: boolean;
}

/**
 * The authz backbone: every server action and portal layout calls this.
 * Throws when the caller lacks `minRole` in `orgId`.
 */
export async function requireOrgRole(
  orgId: string,
  minRole: SystemRole = "member",
  { allowSuspended = false }: { allowSuspended?: boolean } = {},
): Promise<OrgAccess> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("unauthenticated");

  // A suspended org is frozen for everyone except super admins doing recovery.
  if (!allowSuspended && !user.claims.superAdmin) {
    const orgSnap = await orgRef(orgId).get();
    if (orgSnap.data()?.status === "suspended") throw new AuthError("suspended");
  }

  if (user.claims.superAdmin) {
    const entry = user.claims.orgs?.[orgId];
    return {
      user,
      role: "admin",
      memberId: entry?.m ?? null,
      isSuper: true,
    };
  }

  const entry = user.claims.orgs?.[orgId];
  if (!entry) throw new AuthError("forbidden");
  if (ROLE_LEVEL[entry.r] < ROLE_LEVEL[minRole]) throw new AuthError("forbidden");

  return { user, role: entry.r, memberId: entry.m, isSuper: false };
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("unauthenticated");
  if (!user.claims.superAdmin) throw new AuthError("forbidden");
  return user;
}

export class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden" | "suspended") {
    super(code);
    this.name = "AuthError";
  }
}
