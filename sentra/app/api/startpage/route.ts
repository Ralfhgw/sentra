import { NextRequest, NextResponse } from "next/server";
import { readStartpageBackground } from "./backgroundService";

// Test http://localhost:3000/api/startpage?userId=c8d6250d-7379-400a-853c-265ce7fcfd2d

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId missing" }, { status: 400 });
  }

  try {
    console.log("[api/startpage] request", { userId });
    const background = await readStartpageBackground(userId);
    console.log("[api/startpage] response", {
      userId,
      hasUrl: Boolean(background.url),
      pending: background.pending ?? false,
      background: "background" in background ? background.background : "image",
      urlPreview: background.url ? background.url.slice(0, 80) : null,
    });
    return NextResponse.json(background);
  } catch (error) {
    console.error("Startpage background handling failed:", error);
    return NextResponse.json(
      { error: "Background image handling failed" },
      { status: 500 }
    );
  }
}
