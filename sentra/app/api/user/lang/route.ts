import { NextRequest, NextResponse } from "next/server";
import sql from "@/app/utils/db"; // Passe ggf. den Importpfad an

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const result = await sql`
    SELECT lang FROM user_settings WHERE user_id = ${userId}
  `;
  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ lang: result[0].lang });
}