import "server-only";
import { officerChannelFor } from "@/lib/discord/guilds";

/**
 * Outbound Discord messages: the officer channel's heads-up when a ticket is
 * filed, whichever surface filed it. This is the one place the app SENDS to
 * Discord (the interactions route only answers), so it needs the bot token;
 * with no token or channel configured the whole feature is quietly off, and a
 * delivery failure is logged but NEVER fails the submission it rides behind.
 * The channel is the club's own: its guild binding first, the single-club
 * env fallback second (see officerChannelFor).
 */

export interface TicketNotice {
  activityId: string;
  /** `"Reaper" Marcus Vane` */
  memberLabel: string;
  /** `Drug Sale ×20 · Felony` — describeActivity's line. */
  summary: string;
  description: string;
}

/** The message payload, split out pure so tests can pin the shape. */
export function buildTicketMessage(input: TicketNotice): Record<string, unknown> {
  const description =
    input.description.length > 500
      ? `${input.description.slice(0, 500)}...`
      : input.description;
  return {
    content: [
      `**New ticket** from ${input.memberLabel}`,
      input.summary,
      `> ${description}`,
    ].join("\n"),
    components: [
      {
        type: 1, // action row
        components: [
          {
            type: 2, // button
            style: 3, // success (green)
            label: "Approve",
            custom_id: `review:approve:${input.activityId}`,
          },
          {
            type: 2,
            style: 4, // danger (red)
            label: "Deny",
            custom_id: `review:deny:${input.activityId}`,
          },
        ],
      },
    ],
  };
}

/** Post the ticket to the club's officer channel. Skips silently when the
 *  feature is unconfigured or this club has no channel to receive it. */
export async function notifyTicketSubmitted(
  orgId: string,
  input: TicketNotice,
): Promise<void> {
  // Token first: without one there is nothing to send with, and the channel
  // lookup below is a Firestore read the submission should not pay for.
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return;
  const channel = await officerChannelFor(orgId);
  if (!channel) return;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channel}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildTicketMessage(input)),
      },
    );
    if (!res.ok) {
      console.error(`Discord notify failed: ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.error("Discord notify failed:", e);
  }
}
