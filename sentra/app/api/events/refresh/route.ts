import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";
import { getEvents } from "@/app/api/events/getEvents";
import { refreshCustomEventSourcesForUser } from "@/utils/eventUrlService";
import type { Event } from "@/types/typesNews";

function getCustomRefreshErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `User-specific event URL could not be updated: ${error.message.trim()}`;
  }

  return "The user-specific event URL could not be updated.";
}

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

    let customRefreshError: string | null = null;

    if (refreshCustomEventUrls) {
      try {
        await refreshCustomEventSourcesForUser(userId, {
          force: true,
          targetDay: dayString,
        });
      } catch (error) {
        customRefreshError = getCustomRefreshErrorMessage(error);
        console.error("Custom event URL refresh failed:", error);
      }
    }

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

    return NextResponse.json({ success: true, events, customRefreshError });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
