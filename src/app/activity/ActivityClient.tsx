"use client";

import { useEffect, useState } from "react";

/**
 * The embedded client. Boots the Discord SDK, trades the authorization code
 * for a verified profile on our server, then renders the viewer's card.
 *
 * The SDK only works inside Discord's iframe, and Discord always launches the
 * Activity with a `frame_id` query parameter. Checking for it first means
 * opening this URL in an ordinary browser explains itself instead of hanging
 * on a handshake that can never complete, which matters because once the SDK
 * is wired in there is no other way to view the page.
 *
 * The SDK is imported dynamically for the same reason: it reaches for the
 * Discord RPC bridge at module scope, so it must not load during SSR or in a
 * plain tab.
 */

type Phase =
  | { kind: "outside" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; profile: ActivityProfile };

interface ActivityProfile {
  org: { id: string; name: string };
  member: {
    id: string;
    roadName: string;
    displayName: string;
    memberNumber: number;
    status: string;
    rankName: string | null;
    patchCount: number;
    renderUrl: string | null;
  };
  role: string;
  record: { label: string; value: string; danger: boolean }[];
  clubs: { id: string; name: string }[];
}

const MESSAGES: Record<string, string> = {
  unlinked:
    "This Discord account is not linked yet. Open the portal, generate a link code on your dashboard, then run /link in the server.",
  no_membership: "Your portal account has no member record with this club.",
  not_configured: "The Activity is not configured on the server yet.",
  bad_code: "Discord would not confirm that sign-in. Try relaunching.",
  identity_failed: "Discord would not confirm who you are. Try relaunching.",
};

export function ActivityClient({ clientId }: { clientId: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("frame_id")) {
      setPhase({ kind: "outside" });
      return;
    }
    if (!clientId) {
      setPhase({ kind: "error", message: MESSAGES.not_configured });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { DiscordSDK } = await import("@discord/embedded-app-sdk");
        const sdk = new DiscordSDK(clientId);
        await sdk.ready();

        // `identify` alone: the Activity needs to know who is watching and
        // nothing more. The club comes from their linked portal account.
        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify"],
        });

        const res = await fetch("/api/discord/activity/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, guildId: params.get("guild_id") }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (cancelled) return;
          setPhase({
            kind: "error",
            message: MESSAGES[data?.error] ?? "Something went wrong.",
          });
          return;
        }

        // Finishes the SDK's own handshake; without it the Activity stays in
        // Discord's loading state even though our data has arrived.
        await sdk.commands.authenticate({ access_token: data.accessToken });
        if (cancelled) return;
        setPhase({ kind: "ready", profile: data.profile });
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setPhase({ kind: "error", message: "Could not start inside Discord." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (phase.kind === "outside") return <Notice title="Open this from Discord" body="This screen runs inside the club's Discord server, not in a browser tab." />;
  if (phase.kind === "loading") return <Notice title="Checking your colors" body="One moment." />;
  if (phase.kind === "error") return <Notice title="Cannot open your record" body={phase.message} />;

  const { org, member, record, role } = phase.profile;
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-6 text-[color:var(--foreground,#EDE7E9)]">
      <header className="flex items-center gap-4">
        {member.renderUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={member.renderUrl}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">
            &ldquo;{member.roadName}&rdquo; {member.displayName}
          </h1>
          <p className="mt-0.5 text-sm opacity-70">
            {[
              org.name,
              member.rankName,
              `Member #${member.memberNumber}`,
              member.status,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>

      <div className="mt-5 flex gap-3">
        <Tile label="Patches earned" value={String(member.patchCount)} />
        <Tile label="Standing" value={role === "member" ? "Member" : "Officer"} />
      </div>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-60">
          Criminal Record
        </h2>
        <dl className="mt-2 divide-y divide-white/10">
          {record.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between py-2">
              <dt className="text-sm opacity-80">{row.label}</dt>
              <dd
                className={`text-sm font-semibold tabular-nums ${
                  row.danger ? "text-[color:var(--destructive,#E5484D)]" : ""
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-lg border border-white/10 px-4 py-3">
      <p className="text-xs opacity-60">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center text-[color:var(--foreground,#EDE7E9)]">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm opacity-70">{body}</p>
    </main>
  );
}
