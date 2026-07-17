import { headers } from "next/headers";
import { prisma } from "./db";

/**
 * Common crawlers and link-preview bots that open shared URLs without a
 * real person viewing the page. We skip counting these so "views" stays
 * meaningful for organizers.
 */
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|facebot|preview|discordbot|whatsapp|telegram|twitterbot|linkedinbot|embedly|quora|pinterest|slackbot|vkshare|w3c_validator|bingpreview|applebot|yandex|baidu|duckduck|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|ia_archiver|gptbot|claudebot|anthropic|perplexity|meta-externalagent|iframely/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return false;
  return BOT_UA.test(userAgent);
}

export type PublicViewKind = "meeting" | "poll" | "rsvp";

/**
 * Increment the public-page view counter for a shared link.
 * Safe to call from Server Components; no-ops for bots / link previews.
 */
export async function recordPublicView(
  kind: PublicViewKind,
  id: string
): Promise<void> {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    if (isLikelyBot(ua)) return;

    if (kind === "meeting") {
      await prisma.meeting.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    } else if (kind === "poll") {
      await prisma.poll.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    } else {
      await prisma.rsvp.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }
  } catch (err) {
    // Never break the public page if counting fails
    console.warn("[views] recordPublicView failed", kind, id, err);
  }
}
