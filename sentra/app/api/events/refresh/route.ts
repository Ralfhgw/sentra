import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";
import { getEvents } from "@/app/api/events/getEvents";
import type { Event } from "@/types/typesNews";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuthenticatedUserFromCookies();
    const { dayString, town } = await req.json();

    if (!dayString || !town) {
      return NextResponse.json(
        { success: false, error: "dayString und town fehlen." },
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

    return NextResponse.json({ success: true, events });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
