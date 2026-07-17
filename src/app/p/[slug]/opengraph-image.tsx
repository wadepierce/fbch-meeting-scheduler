import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "First Baptist Church Henrietta poll";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#26388e";
const INK = "#0f1a33";
const MUTED = "#54617d";

function logoDataUri(): string | null {
  try {
    const bytes = readFileSync(join(process.cwd(), "public/fbch-logo.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const poll = await prisma.poll
    .findUnique({
      where: { slug },
      include: { _count: { select: { questions: true } } },
    })
    .catch(() => null);

  const logo = logoDataUri();
  const title = poll?.title ?? "First Baptist Church Henrietta";
  const nq = poll?._count.questions ?? 0;
  const sub = nq
    ? `${nq} quick question${nq === 1 ? "" : "s"} — tap to answer`
    : "Tap to answer";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "48px 64px 0 64px",
          }}
        >
          {logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={logo} height={64} style={{ height: 64 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: NAVY }}>
              First Baptist Church Henrietta
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: "0 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: NAVY,
            }}
          >
            Quick poll
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: 68,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: MUTED }}>
            {sub}
          </div>
        </div>

        <div style={{ display: "flex", height: 16, width: "100%", background: NAVY }} />
      </div>
    ),
    { ...size }
  );
}
