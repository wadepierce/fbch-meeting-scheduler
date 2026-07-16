import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import {
  splitSlotKey,
  formatTime12,
  formatDateRange,
  formatDateShort,
  timezoneLabel,
} from "@/lib/meeting-poll";

export const runtime = "nodejs";
export const alt = "First Baptist Church Henrietta meeting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// FBCH navy + supporting colors
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
  const meeting = await prisma.meeting
    .findUnique({ where: { slug } })
    .catch(() => null);

  const logo = logoDataUri();

  // Headline + detail lines depending on state
  let kicker = "Meeting availability";
  let title = "First Baptist Church Henrietta";
  let line1 = "Pick the times that work for you";
  let line2 = "";

  if (meeting && meeting.status !== "DRAFT") {
    title = meeting.meetingSubject || meeting.title;
    if (meeting.chosenSlotKey) {
      kicker = "It's set!";
      const { date, time } = splitSlotKey(meeting.chosenSlotKey);
      line1 = formatDateShort(date, meeting.timezone);
      line2 = `${formatTime12(time)} ${timezoneLabel(meeting.timezone)}${
        meeting.meetingLocation ? ` · ${meeting.meetingLocation}` : ""
      }`;
    } else {
      kicker = "When can you meet?";
      line1 = formatDateRange(meeting.dates);
      line2 = "Tap the link to add your availability";
    }
  }

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
        {/* top brand bar */}
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
            {kicker}
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
          {line1 ? (
            <div style={{ display: "flex", marginTop: 28, fontSize: 40, fontWeight: 700, color: INK }}>
              {line1}
            </div>
          ) : null}
          {line2 ? (
            <div style={{ display: "flex", marginTop: 8, fontSize: 30, color: MUTED }}>
              {line2}
            </div>
          ) : null}
        </div>

        {/* bottom accent */}
        <div style={{ display: "flex", height: 16, width: "100%", background: NAVY }} />
      </div>
    ),
    { ...size }
  );
}
