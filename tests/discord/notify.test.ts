/**
 * The officer-channel notification: payload shape (pure) and the send gating
 * (fetch stubbed; nothing leaves the process). No emulator needed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTicketMessage, notifyTicketSubmitted } from "@/lib/discord/notify";

const NOTICE = {
  activityId: "a1",
  memberLabel: '"Reaper" Marcus Vane',
  summary: "Drug Sale ×20",
  description: "moved product across the docks",
};

describe("buildTicketMessage", () => {
  it("carries the summary and both review buttons", () => {
    const msg = buildTicketMessage(NOTICE) as {
      content: string;
      components: { components: { custom_id: string; label: string }[] }[];
    };
    expect(msg.content).toContain('"Reaper" Marcus Vane');
    expect(msg.content).toContain("Drug Sale ×20");
    expect(msg.content).toContain("> moved product across the docks");

    const buttons = msg.components[0].components;
    expect(buttons.map((b) => b.label)).toEqual(["Approve", "Deny"]);
    expect(buttons.map((b) => b.custom_id)).toEqual([
      "review:approve:a1",
      "review:deny:a1",
    ]);
  });

  it("truncates a run-on description", () => {
    const msg = buildTicketMessage({
      ...NOTICE,
      description: "x".repeat(600),
    }) as { content: string };
    expect(msg.content).toContain(`${"x".repeat(500)}...`);
    expect(msg.content).not.toContain("x".repeat(501));
  });
});

describe("notifyTicketSubmitted", () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  const savedEnv = { ...process.env };

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    process.env.DISCORD_BOT_TOKEN = "token";
    process.env.DISCORD_OFFICER_CHANNEL_ID = "chan-1";
    process.env.DISCORD_ORG_ID = "org-1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.DISCORD_BOT_TOKEN = savedEnv.DISCORD_BOT_TOKEN;
    process.env.DISCORD_OFFICER_CHANNEL_ID = savedEnv.DISCORD_OFFICER_CHANNEL_ID;
    process.env.DISCORD_ORG_ID = savedEnv.DISCORD_ORG_ID;
  });

  it("posts to the configured channel with bot auth", async () => {
    await notifyTicketSubmitted("org-1", NOTICE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://discord.com/api/v10/channels/chan-1/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bot token");
    expect(JSON.parse(init.body as string).content).toContain("Drug Sale ×20");
  });

  it("skips a club this bot does not serve", async () => {
    await notifyTicketSubmitted("some-other-org", NOTICE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips silently when unconfigured", async () => {
    delete process.env.DISCORD_OFFICER_CHANNEL_ID;
    await notifyTicketSubmitted("org-1", NOTICE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws on a Discord failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 403 }));
    await expect(notifyTicketSubmitted("org-1", NOTICE)).resolves.toBeUndefined();
  });

  it("never throws on a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(notifyTicketSubmitted("org-1", NOTICE)).resolves.toBeUndefined();
  });
});
