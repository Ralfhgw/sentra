import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";

export async function DELETE(req: NextRequest, context: any) {
  // context kann params als Promise enthalten
  const params = context.params ? (typeof context.params.then === "function" ? await context.params : context.params) : {};
  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, error: "No ID provided" }, { status: 400 });
  }
  try {
    await sql`DELETE FROM events WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("route.ts Error", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

