import Link from "next/link";

export const runtime = "edge";

type Props = {
  params: { setId: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function SetPage({ params }: Props) {
  // Temporary build-safe page:
  // This route was calling getUserFromRequest() with no args, but the helper now
  // requires a request/env context. We'll restore the DB + auth logic after deploy is green.

  const { setId } = params;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>Set: {setId}</h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/sets">Back to Sets</Link>
          <Link href="/me">My Account</Link>
        </div>
      </div>

      <p style={{ marginTop: 12 }}>
        This page is temporarily in “build-safe” mode while we reconcile Cloudflare Pages build
        context + auth helper signatures.
      </p>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10 }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          Next step after deploy: re-enable DB query + user session and render actual set details.
        </div>
      </div>
    </div>
  );
}
