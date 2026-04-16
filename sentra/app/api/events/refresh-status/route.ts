import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";
import { getCustomEventRefreshStatusForUser } from "@/utils/eventUrlService";
import type { Event } from "@/types/typesNews";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuthenticatedUserFromCookies();
    const startedAt = req.nextUrl.searchParams.get("startedAt");
    const refreshStatus = await getCustomEventRefreshStatusForUser(userId, {
      startedAfter: startedAt,
    });

    if (refreshStatus.status === "running") {
      return NextResponse.json({
        success: true,
        status: refreshStatus.status,
        error: refreshStatus.error,
      });
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

    return NextResponse.json({
      success: true,
      status: refreshStatus.status,
      error: refreshStatus.error,
      events,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}