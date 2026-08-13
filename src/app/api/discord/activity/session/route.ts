import { NextRequest, NextResponse } from "next/server";
import { ActivityError, openActivitySession } from "@/lib/discord/activity";

/**
 * The Discord Activity's one endpoint for now: swap the embedded client's
 * OAuth code for a verified session and the viewer's club record.
 *
 * Reached through Discord's proxy, so the browser calls it as a plain
 * relative `/api/discord/activity/session` from `<clientId>.discordsays.com`
 * and the root URL mapping forwards it here. Read-only: it writes nothing,
 * which is why it needs no cache invalidation.
 */
export async function POST(req: NextRequest) {
  let body: { code?: unknown; guildId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  const guildId = typeof body.guildId === "string" ? body.guildId : null;
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  try {
    const { accessToken, profile } = await openActivitySession(code, guildId);
    // The token goes back because the embedded SDK needs it to finish its own
    // handshake (`authenticate`). It is the viewer's own token, minted for
    // this app, and never grants anything beyond the `identify` scope.
    return NextResponse.json({ accessToken, profile });
  } catch (e) {
    if (e instanceof ActivityError) {
      const status = e.code === "not_configured" ? 503 : 401;
      return NextResponse.json({ error: e.code }, { status });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
