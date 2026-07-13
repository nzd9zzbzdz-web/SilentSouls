import { notFound } from "next/navigation";
import { CharacterArtUploader } from "@/components/portal/CharacterArtUploader";
import { CharacterStage, type StagePatch } from "@/components/portal/CharacterStage";
import { requireOrgRole } from "@/lib/auth/session";
import { orgRef } from "@/lib/firebase/admin";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import {
  getMember,
  listMemberAwards,
  listPatches,
  listRanks,
} from "@/lib/queries";
import {
  CHARACTER_SILHOUETTE,
  DEFAULT_CHARACTER_STAGE,
  DEFAULT_RAP_SHEET,
} from "@/lib/constants";
import type { Timestamp } from "firebase-admin/firestore";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; memberId: string }>;
}) {
  const { orgSlug, memberId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();
  const access = await requireOrgRole(org.id, "member");
  const isOfficer = access.role === "officer" || access.role === "admin";

  const member = await getMember(org.id, memberId);
  if (!member) notFound();

  // Website-uploaded render (data URL in a subdoc) wins over seeded art.
  const assetSnap = await orgRef(org.id)
    .collection("members")
    .doc(memberId)
    .collection("assets")
    .doc("character")
    .get();
  const uploadedArt = assetSnap.exists
    ? (assetSnap.data()?.dataUrl as string | undefined)
    : undefined;

  const [ranks, awards, patches, branding] = await Promise.all([
    listRanks(org.id),
    listMemberAwards(org.id, memberId),
    listPatches(org.id),
    getBranding(org.id, "portal"),
  ]);
  const rank = ranks.find((r) => r.id === member.rankId);
  const patchById = new Map(patches.map((p) => [p.id, p]));

  // Top patches for the stage's diamond slots — rarest first, then tier.
  const rarityWeight = { legendary: 4, epic: 3, rare: 2, common: 1 } as const;
  const stagePatches: StagePatch[] = awards
    .map((award) => ({ award, patch: patchById.get(award.patchId) }))
    .filter((x): x is { award: (typeof awards)[number]; patch: NonNullable<ReturnType<typeof patchById.get>> } => Boolean(x.patch))
    .sort(
      (a, b) =>
        rarityWeight[b.patch.rarity ?? "common"] -
          rarityWeight[a.patch.rarity ?? "common"] ||
        b.patch.tier - a.patch.tier,
    )
    .slice(0, 4)
    .map(({ award, patch }) => {
      const awardedAt = (award.awardedAt as Timestamp)?.toDate?.();
      return {
        name: patch.name,
        description: patch.description,
        category: patch.category,
        awardedLabel: awardedAt
          ? `Earned ${awardedAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
          : "Earned",
      };
    });

  // Every profile gets a Criminal Record — the member's own rap sheet when
  // they have one, the zeroed default otherwise (new members start clean).
  const rapSheet = member.rapSheet?.length ? member.rapSheet : DEFAULT_RAP_SHEET;
  const panelStats = rapSheet.map((e) => ({
    label: e.label,
    value: /^\d+$/.test(e.value) ? Number(e.value) : e.value,
    danger: e.danger,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <CharacterStage
        orgName={branding?.orgDisplayName ?? org.name}
        tagline={branding?.tagline}
        roadName={member.roadName}
        displayName={member.displayName}
        memberNumber={member.memberNumber}
        rankName={rank?.name ?? "Unranked"}
        statusLabel={member.rapStatus ?? member.status}
        panelTitle="Criminal Record"
        stats={panelStats}
        patches={stagePatches}
        stagePath={branding?.characterStagePath ?? DEFAULT_CHARACTER_STAGE}
        characterPath={uploadedArt ?? member.photoPath ?? CHARACTER_SILHOUETTE}
      />
      {isOfficer && (
        <div className="mt-3">
          <CharacterArtUploader
            orgId={org.id}
            memberId={memberId}
            hasCustomArt={Boolean(uploadedArt)}
          />
        </div>
      )}
    </div>
  );
}
