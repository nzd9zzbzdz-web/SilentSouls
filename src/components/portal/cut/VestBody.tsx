// The vest silhouette, drawn in CSS (no artwork required). Shared by the
// member-facing CutViewer and the admin Vest Designer so they stay identical.
export const VEST_CLIP =
  "polygon(14% 0, 41% 0, 50% 11%, 59% 0, 86% 0, 93% 9%, 90% 100%, 10% 100%, 7% 9%)";

export function VestBody() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          clipPath: VEST_CLIP,
          background: "linear-gradient(160deg,#1c1913 0%,#14110c 45%,#0d0b07 100%)",
          boxShadow:
            "inset 0 0 0 2px rgba(84,33,63,0.10), inset 0 8px 40px rgba(0,0,0,0.6)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-[6%]"
        style={{ clipPath: VEST_CLIP, boxShadow: "inset 0 0 0 1px rgba(84,33,63,0.14)" }}
      />
    </>
  );
}
