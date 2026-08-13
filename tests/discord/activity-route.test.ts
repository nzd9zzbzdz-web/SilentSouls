/**
 * The proxy's Activity rewrite. Discord launches an Activity at the root of
 * its URL mapping, which on this deployment is the public shopfront, so the
 * launch has to be recognised and redirected inward. Pure, no emulator.
 */
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function get(url: string, cookie?: string) {
  return new NextRequest(url, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("Activity launch rewrite", () => {
  it("serves the Activity when Discord launches the root", () => {
    const res = proxy(
      get("https://ravens-of-death.vercel.app/?frame_id=abc&guild_id=123"),
    );
    const dest = res.headers.get("x-middleware-rewrite");
    expect(dest).toBeTruthy();
    const url = new URL(dest!);
    expect(url.pathname).toBe("/activity");
    // The query has to survive: the client SDK reads frame_id and guild_id.
    expect(url.searchParams.get("frame_id")).toBe("abc");
    expect(url.searchParams.get("guild_id")).toBe("123");
  });

  it("leaves ordinary visitors on the public site", () => {
    const res = proxy(get("https://ravens-of-death.vercel.app/"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not hijack a deeper path that happens to carry frame_id", () => {
    const res = proxy(
      get("https://ravens-of-death.vercel.app/silent-souls?frame_id=abc"),
    );
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("still bounces a cookieless portal visit to the sign-in gateway", () => {
    const res = proxy(get("https://ravens-of-death.vercel.app/silent-souls/portal"));
    const location = res.headers.get("location");
    expect(location).toContain("/silent-souls/volunteer-resources");
    expect(location).toContain("signin=1");
  });

  it("lets a portal visit through when the session cookie is present", () => {
    const res = proxy(
      get("https://ravens-of-death.vercel.app/silent-souls/portal", "__session=abc"),
    );
    expect(res.headers.get("location")).toBeNull();
  });
});
