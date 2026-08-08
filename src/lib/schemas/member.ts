import { z } from "zod";

export const memberStatusSchema = z.enum([
  "hangaround",
  "prospect",
  "patched",
  "retired",
  "exiled",
]);

export const createMemberSchema = z.object({
  orgId: z.string().min(1),
  displayName: z.string().min(2).max(80),
  roadName: z.string().min(1).max(40),
  rankId: z.string().min(1),
  status: memberStatusSchema,
  joinDate: z.coerce.date(),
  sponsorMemberId: z.string().optional(),
  /** Public-site blurb. Empty string clears it. */
  bio: z.string().max(600).optional(),
  /**
   * Caption on the public Brotherhood card. Empty string clears it and the
   * computed tenure takes over. Short by design — it sits on one line under a
   * portrait, and the card is deliberately anonymous.
   */
  publicLabel: z.string().max(40).optional(),
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = createMemberSchema.partial().extend({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  /** Portal permissions, separate from club rank. Linked accounts only. */
  role: z.enum(["admin", "officer", "member"]).optional(),
});
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

/**
 * Self-service bio. Same 600-char ceiling as the admin form — it writes the
 * same field, and a member shouldn't get more room on the public site than an
 * officer would give them. Empty clears it.
 */
export const saveMemberBioSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  bio: z.string().max(600, "Keep it under 600 characters"),
});
export type SaveMemberBioInput = z.infer<typeof saveMemberBioSchema>;

export const deleteMemberSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  /** Typed by the admin and matched against the member's road name. */
  confirmRoadName: z.string().min(1, "Type the road name to confirm"),
});
export type DeleteMemberInput = z.infer<typeof deleteMemberSchema>;

export const officerNoteSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  body: z.string().min(1).max(4000),
});
export type OfficerNoteInput = z.infer<typeof officerNoteSchema>;

export const inviteMemberSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "officer", "member"]),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
