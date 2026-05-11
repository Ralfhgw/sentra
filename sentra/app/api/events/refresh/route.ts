// API‑Route (POST): triggert Refresh für einen Tag (getEvents), liefert aktuelle Events 
// zurück und startet optional asynchron das Refreshen von benutzerdefinierten URL‑Quellen 
// (via refreshCustomEventSourcesForUser) — gibt refreshStarted + Zeitstempel zurück.
import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies, getUserSettings } from "@/utils/serverAuth";
import { getEvents } from "@/app/api/events/getEvents";
import { refreshCustomEventSourcesForUser } from "@/utils/eventUrlService";
import type { Event } from "@/types/typesNews";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuthenticatedUserFromCookies();
    const { dayString, town, refreshCustomEventUrls } = await req.json();

    if (!dayString || !town) {
      return NextResponse.json(
        { success: false, error: "dayString and town missing." },
        { status: 400 }
      );
    }

    await getEvents(userId, town, dayString);

    const events = await sql<Event[]>`
      SELECT
        id,
        title,
        date,
        address,
        link,
        description,
        image,
        domain,
        source_town AS "sourceTown"
      FROM events
      WHERE user_id = ${userId}::uuid
      ORDER BY source_town ASC, date ASC
    `;

    let refreshStarted = false;
    let refreshRequestedAt: string | null = null;

    if (refreshCustomEventUrls) {
      const settings = await getUserSettings(userId);
      const hasCustomRefreshSources =
        Boolean(settings.key6?.trim()) &&
        settings.event_urls.some((source) => source.url.trim().length > 0);

      if (hasCustomRefreshSources) {
        refreshStarted = true;
        refreshRequestedAt = new Date().toISOString();

        void refreshCustomEventSourcesForUser(userId, {
          targetDay: dayString,
        }).catch((error) => {
          console.error("Custom event URL refresh failed:", error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      events,
      refreshStarted,
      refreshRequestedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
