import { NextResponse, type NextRequest } from "next/server";
import { AuthError, requireOrgRole } from "@/lib/auth/session";
import { getCharacterRender } from "@/lib/queries";

/**
 * Serves a member's uploaded character render as a real image response.
 *
 * Renders live in Firestore as data URLs (no Storage bucket — see
 * `src/actions/character.ts`), which is fine for one character screen but
 * would put megabytes of base64 into the HTML of a roster showing everyone.
 * Streaming them here keeps the page small and lets the browser cache.
 *
 * Members-only: the same `requireOrgRole` gate the portal pages use.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ orgId: string; memberId: string }> },
) {
  const { orgId, memberId } = await ctx.params;

  try {
    await requireOrgRole(orgId, "member");
  } catch (e) {
    const code = e instanceof AuthError ? e.code : "forbidden";
    return NextResponse.json(
      { error: code },
      { status: code === "unauthenticated" ? 401 : 403 },
    );
  }

  const render = await getCharacterRender(orgId, memberId);
  if (!render) return new NextResponse(null, { status: 404 });

  const match = /^data:(image\/[a-z+]+);base64,([\s\S]*)$/.exec(render.dataUrl);
  if (!match) return new NextResponse(null, { status: 404 });
  const [, contentType, base64] = match;

  // Re-uploads bump updatedAt, so the tag changes exactly when the art does.
  const etag = `W/"${memberId}-${render.updatedAtMs}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const body = new Uint8Array(Buffer.from(base64, "base64"));
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      ETag: etag,
      // Private: renders are behind the members-only gate, never shared caches.
      "Cache-Control": "private, max-age=300, must-revalidate",
    },
  });
}
