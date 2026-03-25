import { NextRequest, NextResponse } from "next/server";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserFromRequest,
} from "@/utils/serverAuth";
import {
  buildMediamtxPath,
  deleteRtspPathFromMediaMtx,
  detectSourceKind,
  getExistingLiveViewSource,
  normalizeLiveViewSourceUrl,
  rebuildUserChannels,
  removeLiveViewSlot,
  syncRtspPathInMediaMtx,
  upsertLiveViewSource,
  waitForMediaMtxHlsReady,
  type LiveViewTransport,
} from "@/utils/liveviewSources";


type SaveSlotBody = {
  slotId: number;
  name?: string | null;
  channelId?: string | null;
  url?: string | null;
  transport?: LiveViewTransport;
};

export async function POST(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";

    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SaveSlotBody;

    if (!Number.isInteger(body.slotId) || body.slotId < 0) {
      return NextResponse.json(
        { error: "slotId ist ungültig." },
        { status: 400 }
      );
    }

    const rawUrl = body.url?.trim() ?? "";
    const normalizedUrl = rawUrl
      ? normalizeLiveViewSourceUrl(rawUrl)
      : "";

    const sourceKind = detectSourceKind({
      channelId: body.channelId ?? null,
      url: normalizedUrl || null,
    });

    const transport = body.transport ?? "tcp";
    const previous = await getExistingLiveViewSource(auth.userId, body.slotId);

    const mediamtxPath =
      sourceKind === "mediamtx_rtsp"
        ? buildMediamtxPath(auth.userId, body.slotId)
        : null;

    await upsertLiveViewSource({
      userId: auth.userId,
      slotId: body.slotId,
      sourceKind,
      displayName: body.name?.trim() ?? "",
      sourceUrl: normalizedUrl || null,
      channelId: body.channelId ?? null,
      mediamtxPath,
      transport,
    });

    if (sourceKind === "mediamtx_rtsp") {
      if (!normalizedUrl) {
        return NextResponse.json(
          { error: "RTSP-URL fehlt." },
          { status: 400 }
        );
      }

      await syncRtspPathInMediaMtx({
        pathName: mediamtxPath!,
        sourceUrl: normalizedUrl,
        transport,
      });

      await waitForMediaMtxHlsReady(mediamtxPath!);
    }

    if (
      previous?.source_kind === "mediamtx_rtsp" &&
      previous.mediamtx_path &&
      previous.mediamtx_path !== mediamtxPath
    ) {
      await deleteRtspPathFromMediaMtx(previous.mediamtx_path);
    }

    const channels = await rebuildUserChannels(auth.userId);

    const response = NextResponse.json({
      success: true,
      channels,
    });

    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    console.error("[liveview/slots] save failed:", error);

    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Slot konnte nicht gespeichert werden.",
      },
      { status: 500 }
    );

    return applyRefreshedAccessToken(response, auth);
  }
}

export async function DELETE(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";

    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const slotIdParam = req.nextUrl.searchParams.get("slotId");
    const slotId = Number(slotIdParam);

    if (!Number.isInteger(slotId) || slotId < 0) {
      return NextResponse.json(
        { error: "slotId ist ungültig." },
        { status: 400 }
      );
    }

    const channels = await removeLiveViewSlot(auth.userId, slotId);

    const response = NextResponse.json({
      success: true,
      channels,
    });

    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    console.error("[liveview/slots] delete failed:", error);

    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Slot konnte nicht gelöscht werden.",
      },
      { status: 500 }
    );

    return applyRefreshedAccessToken(response, auth);
  }
}
