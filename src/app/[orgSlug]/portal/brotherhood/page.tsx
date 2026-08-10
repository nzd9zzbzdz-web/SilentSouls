import { notFound } from "next/navigation";
import { PAGE_W } from "@/lib/page-width";
import type { Timestamp } from "firebase-admin/firestore";
import { BrotherhoodRoster } from "@/components/portal/roster/BrotherhoodRoster";
import { ChainOfCommand } from "@/components/portal/roster/ChainOfCommand";
import type { RosterMember, TierKey } from "@/components/portal/roster/types";
import { requireOrgRole } from "@/lib/auth/session";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import {
  listAwardsByMember,
  listMembers,
  listMembersWithRender,
  listPatchArtVersions,
  listPatches,
  listRanks,
} from "@/lib/queries";
import { patchArtUrl } from "@/lib/patch-ladders";
import { CHARACTER_SILHOUETTE } from "@/lib/constants";
import { resolveBranding } from "@/lib/branding-resolve";
import type { Member, Rank, Rarity } from "@/lib/types";

const RARITY_WEIGHT: Record<Rarity, number> = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

function fmtJoined(d?: Date): string {
  return d ? d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "N/A";
}

function tierOf(member: Member, rank?: Rank): TierKey {
  if (rank?.isOfficer) return "officers";
  if (member.status === "prospect") return "prospects";
  if (member.status === "hangaround") return "hangarounds";
  return "patched";
}

export default async function BrotherhoodPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const access = await requireOrgRole(org.id, "member");
  // Only admins can upload character art, so only they get the nudge.
  const viewerCanManageArt = access.role === "admin";

  const [members, ranks, patches, awardsByMember, artVersions, branding] = await Promise.all([
    listMembers(org.id),
    listRanks(org.id),
    listPatches(org.id),
    listAwardsByMember(org.id),
    // Ids and timestamps only — the artwork itself streams from the art route.
    listPatchArtVersions(org.id),
    getBranding(org.id, "portal"),
  ]);
  // Existence only — the stored renders are served by the render route.
  const withRender = await listMembersWithRender(
    org.id,
    members.map((m) => m.id),
  );

  const rankById = new Map(ranks.map((r) => [r.id, r]));
  const patchById = new Map(patches.map((p) => [p.id, p]));
  const brand = resolveBranding(branding, "portal");

  const toRosterMember = (member: Member): RosterMember => {
    const rank = rankById.get(member.rankId);
    const uploaded = withRender.has(member.id);
    // The seeder writes the shared silhouette into photoPath when a member has
    // no art file, so a set photoPath alone doesn't mean they have a render.
    const ownArt =
      member.photoPath && member.photoPath !== CHARACTER_SILHOUETTE
        ? member.photoPath
        : undefined;
    const topPatches = (awardsByMember.get(member.id) ?? [])
      .map((award) => patchById.get(award.patchId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .sort(
        (a, b) =>
          RARITY_WEIGHT[b.rarity ?? "common"] - RARITY_WEIGHT[a.rarity ?? "common"] ||
          b.tier - a.tier,
      )
      .slice(0, 3)
      .map((p) => ({
        name: p.name,
        category: p.category,
        artUrl: patchArtUrl(org.id, p.id, artVersions),
      }));

    const joined = (member.joinDate as Timestamp)?.toDate?.();

    return {
      id: member.id,
      roadName: member.roadName,
      displayName: member.displayName,
      memberNumber: member.memberNumber,
      rankName: rank?.name ?? "Unranked",
      rankOrder: rank?.order ?? 99,
      isOfficer: Boolean(rank?.isOfficer),
      isPresident: rank?.order === 1,
      status: member.status,
      rapStatus: member.rapStatus,
      patchCount: member.patchCount,
      joinedLabel: fmtJoined(joined),
      joinedAtMs: joined?.getTime() ?? 0,
      imageUrl: uploaded
        ? `/api/orgs/${org.id}/members/${member.id}/render`
        // The sentinel above answers "does this member have art"; what to draw
        // when they don't is the club's own default figure.
        : (ownArt ?? brand.assets.defaultAvatar),
      hasRender: uploaded || Boolean(ownArt),
      topPatches,
      tier: tierOf(member, rank),
    };
  };

  const riding = members
    .filter((m) => !["retired", "exiled"].includes(m.status))
    .map(toRosterMember);
  const pastColors = members
    .filter((m) => ["retired", "exiled"].includes(m.status))
    .map(toRosterMember)
    .sort((a, b) => a.rankOrder - b.rankOrder || a.memberNumber - b.memberNumber);

  const officers = riding
    .filter((m) => m.tier === "officers")
    .sort((a, b) => a.rankOrder - b.rankOrder || a.memberNumber - b.memberNumber);

  return (
    <div className={`${PAGE_W.gallery} space-y-8`}>
      {/* The heading rides inside the engraved plate, so it belongs to the
          component rather than the page — see ChainOfCommand.

          The plate is painted art at a fixed 1556×720, laid out at
          width:100% / height:auto with every face and nameplate pinned to
          that art's own pixel grid. Its height is therefore purely a function
          of its width — so on the wide gallery column it would grow by a
          third rather than shrink.

          58rem is measured against what the banner used to be, not against
          the new column: the page was max-w-6xl (72rem), so 58/72 renders the
          plate about 19% shorter than it stands today — the reduction that was
          actually asked for. Sizing it as a fraction of the NEW width would
          have made it taller than before while looking like a cut.

          The inset is deliberate and generous rather than slight, so the plate
          reads as a framed piece over the wall instead of a banner that failed
          to reach the edges. It stays the club's front door; it stops being
          the whole page. (If the art is ever re-cropped shorter, drop this
          wrapper and let it run full width — see PLATE in ChainOfCommand.) */}
      <div className="mx-auto w-full max-w-[58rem]">
        <ChainOfCommand
          orgSlug={orgSlug}
          title="Brotherhood"
          blurb="Every rider under the colors: the whole club, in order of the patch."
          officers={officers}
          counts={{
            riding: riding.length,
            officers: officers.length,
            prospecting: riding.filter((m) => m.tier === "prospects").length,
          }}
        />
      </div>

      <BrotherhoodRoster
        orgSlug={orgSlug}
        members={riding}
        pastColors={pastColors}
        viewerCanManageArt={viewerCanManageArt}
        backdropPath={brand.assets.portalRosterBackdrop}
      />
    </div>
  );
}
