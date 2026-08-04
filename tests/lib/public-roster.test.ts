/**
 * The public/private gate for the club roster. Pure — no emulator needed.
 *
 * This decides whose face and road name leave the members-only side of the
 * product, and the render route asks the same function, so a mistake here
 * leaks a member's art to the open internet. Worth pinning every branch.
 */
import { describe, expect, it } from "vitest";
import {
  byStanding,
  isPubliclyVisible,
  type PublicRosterMember,
} from "@/lib/public-roster";
import type { MemberStatus, Rank } from "@/lib/types";

const officer = { isOfficer: true } as Rank;
const notOfficer = { isOfficer: false } as Rank;

const visible = (status: MemberStatus, rank?: Rank) =>
  isPubliclyVisible({ status }, rank);

describe("isPubliclyVisible", () => {
  it("shows officers and patched members", () => {
    expect(visible("patched", officer)).toBe(true);
    expect(visible("patched", notOfficer)).toBe(true);
  });

  it("hides prospects and hangarounds", () => {
    expect(visible("prospect", notOfficer)).toBe(false);
    expect(visible("hangaround", notOfficer)).toBe(false);
  });

  it("drops anyone who left, whatever rank they held", () => {
    // An exiled President must not keep a public card.
    expect(visible("retired", officer)).toBe(false);
    expect(visible("exiled", officer)).toBe(false);
    expect(visible("retired", notOfficer)).toBe(false);
    expect(visible("exiled", notOfficer)).toBe(false);
  });

  it("hides a member whose rank is missing rather than assuming the best", () => {
    // A dangling rankId shouldn't quietly publish someone.
    expect(visible("prospect", undefined)).toBe(false);
    expect(visible("hangaround", undefined)).toBe(false);
    // Patched still stands on its own — the status is the claim, not the rank.
    expect(visible("patched", undefined)).toBe(true);
  });
});

describe("byStanding", () => {
  it("orders by rank, then by patch number", () => {
    const m = (rankOrder: number, memberNumber: number): PublicRosterMember =>
      ({ rankOrder, memberNumber }) as PublicRosterMember;
    const sorted = [m(8, 2), m(1, 9), m(8, 1), m(3, 4)].sort(byStanding);
    expect(sorted.map((x) => [x.rankOrder, x.memberNumber])).toEqual([
      [1, 9],
      [3, 4],
      [8, 1],
      [8, 2],
    ]);
  });
});
