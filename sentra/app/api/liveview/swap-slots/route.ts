import { NextRequest, NextResponse } from "next/server";
import { applyRefreshedAccessToken, getAuthenticatedUserFromRequest } from "@/utils/serverAuth";
import { swapLiveViewSlots } from "@/utils/liveviewSources";

export async function POST(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Not logged in.";

    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const { fromSlotId, toSlotId } = await req.json();

    if (
      !Number.isInteger(fromSlotId) ||
      !Number.isInteger(toSlotId) ||
      fromSlotId < 0 ||
      toSlotId < 0
    ) {
      return NextResponse.json(
        { error: "Invalid Slot-IDs." },
        { status: 400 }
      );
    }

    const channels = await swapLiveViewSlots(auth.userId, fromSlotId, toSlotId);

    const response = NextResponse.json({ success: true, channels });
    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    console.error("[liveview/swap-slots] failed:", error);

    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Slots could not be exchanged.",
      },
      { status: 500 }
    );

    return applyRefreshedAccessToken(response, auth);
  }
}
