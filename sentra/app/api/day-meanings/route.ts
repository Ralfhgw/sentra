import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import type { DayMeaning } from "@/types/typesNews";

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (!date || !isValidDateKey(date)) {
    return NextResponse.json(
      { error: "Ungueltiges Datum." },
      { status: 400 }
    );
  }

  try {
    const dayMeanings = await sql<DayMeaning[]>`
      SELECT name, description, country, url
      FROM get_days_for_date(${date})
    `;

    return NextResponse.json({
      date,
      dayMeanings: dayMeanings ?? [],
    });
  } catch (error) {
    console.error("Fehler beim Laden der Tagesbedeutungen:", error);
    return NextResponse.json(
      { error: "Tagesbedeutungen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}