import { notFound } from "next/navigation";
import { CharacterArtUploader } from "@/components/portal/CharacterArtUploader";
import { type StagePatch } from "@/components/portal/CharacterStage";
import { CharacterPoseEditor } from "@/components/portal/CharacterPoseEditor";
import { EmblemLadders } from "@/components/portal/EmblemLadders";
import { Leaderboard } from "@/components/portal/Leaderboard";
import { ServiceRecord } from "@/components/portal/ServiceRecord";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { composeLadders, patchArtUrl } from "@/lib/patch-ladders";
import { loadLeaderboard } from "@/lib/leaderboard-data";
import { composeServiceRecord } from "@/lib/service-record";
import { requireOrgRole } from "@/lib/auth/session";
import { orgRef } from "@/lib/firebase/admin";
import { getBranding, getOrgBySlug } from "@/lib/tenant";
import {
  getMember,
  listMemberAwards,
  listPatchArtVersions,
  listPatches,
  listRanks,
  listServiceRecord,
} from "@/lib/queries";
import {
  CHARACTER_SILHOUETTE,
  CRIMINAL_RECORD_ROWS,
  DEFAULT_CHARACTER_STAGE,
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
  // Character art and placement are admin-only — officers can review activities
  // but don't get to restyle anyone's character screen.
  const canManageArt = access.role === "admin";

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

  // Standings ride along in the same batch: loadLeaderboard reads members and
  // awards the profile doesn't otherwise need, and awaiting it after this
  // Promise.all would cost a serial round-trip for nothing.
  const [ranks, awards, patches, branding, career, sponsor, patchArt, leaderboard] =
    await Promise.all([
      listRanks(org.id),
      listMemberAwards(org.id, memberId),
      listPatches(org.id),
      getBranding(org.id, "portal"),
      listServiceRecord(org.id, memberId),
      member.sponsorMemberId
        ? getMember(org.id, member.sponsorMemberId)
        : Promise.resolve(null),
      listPatchArtVersions(org.id),
      loadLeaderboard(org.id),
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
        // URL only — the bytes stream from the art route, so four patches don't
        // cost four data URLs in this page's HTML.
        artUrl: patchArtUrl(org.id, patch.id, patchArt),
      };
    });

  // Every profile gets a Criminal Record, built from the stats that approved
  // activity logs move. New members start clean at zero rather than blank.
  // Plain counts stay numeric so the panel counts them up on load; formatted
  // rows (jail time, dirty money) render as their display string.
  const panelStats = CRIMINAL_RECORD_ROWS.map((row) => {
    const value = member.stats?.[row.statKey] ?? 0;
    return {
      label: row.label,
      value: row.format ? row.format(value) : value,
      danger: row.danger,
    };
  });

  const careerItems = composeServiceRecord({
    memberNumber: member.memberNumber,
    joinDate: member.joinDate,
    awards,
    patchById,
    career,
    artUrlFor: (patchId) => patchArtUrl(org.id, patchId, patchArt),
  });

  // Emblem progression: the criminal record grouped into a five-rung ladder per
  // stat, so the tab reads as levels climbed rather than a flat list of names.
  // Emblems never reach the cut — this tab is the only place they live.
  const ladders = composeLadders({ patches, awards, stats: member.stats });

  return (
    <div className="mx-auto max-w-6xl">
      <CharacterPoseEditor
        orgId={org.id}
        memberId={memberId}
        canEdit={canManageArt}
        initialPose={member.characterPose}
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
      {canManageArt && (
        <div className="mt-3">
          <CharacterArtUploader
            orgId={org.id}
            memberId={memberId}
            hasCustomArt={Boolean(uploadedArt)}
          />
        </div>
      )}

      <Tabs defaultValue="service" className="mt-8 gap-4">
        <TabsList>
          <TabsTrigger value="service">Service Record</TabsTrigger>
          <TabsTrigger value="emblems">
            Emblems
            <span className="font-stat ml-1.5 text-xs text-muted-foreground">
              {ladders.reduce((n, l) => n + l.earnedCount, 0)}
            </span>
          </TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>

        <TabsContent value="service">
          <ServiceRecord
            items={careerItems}
            roadName={member.roadName}
            sponsor={
              sponsor
                ? {
                    roadName: sponsor.roadName,
                    href: `/${orgSlug}/portal/brotherhood/${sponsor.id}`,
                  }
                : null
            }
          />
        </TabsContent>

        <TabsContent value="emblems">
          <EmblemLadders
            ladders={ladders}
            roadName={member.roadName}
            isSelf={access.memberId === memberId}
            orgId={org.id}
            artVersions={patchArt}
          />
        </TabsContent>

        <TabsContent value="standings">
          <Leaderboard
            categories={leaderboard}
            orgSlug={orgSlug}
            subjectMemberId={memberId}
            viewerMemberId={access.memberId ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
