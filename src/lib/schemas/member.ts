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
});
export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = createMemberSchema.partial().extend({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
});
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

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
