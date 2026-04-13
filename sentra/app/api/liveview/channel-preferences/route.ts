import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { applyRefreshedAccessToken, getAuthenticatedUserFromRequest, getUserSettings } from "@/utils/serverAuth";
import { removeLiveViewChannelForUser } from "@/utils/liveviewSources";

type PreferenceEntry = {
  channelId: string;
  isFavorite: boolean;
  hidden: boolean;
  deleted: boolean;
};

type RequestBody = {
  channelId?: string | null;
  isFavorite?: boolean;
  hidden?: boolean;
  deleted?: boolean;
};

function upsertPreference(
  preferences: PreferenceEntry[],
  channelId: string,
  patch: Partial<Omit<PreferenceEntry, "channelId">>
) {
  const existing = preferences.find((entry) => entry.channelId === channelId);

  return [
    ...preferences.filter((entry) => entry.channelId !== channelId),
    {
      channelId,
      isFavorite: patch.isFavorite ?? existing?.isFavorite ?? false,
      hidden: patch.hidden ?? existing?.hidden ?? false,
      deleted: patch.deleted ?? existing?.deleted ?? false,
    },
  ];
}

async function savePreferences(userId: string, preferences: PreferenceEntry[]) {
  await sql`
    INSERT INTO user_settings (
      user_id,
      liveview_channel_preferences,
      updated_at
    )
    VALUES (
      ${userId}::uuid,
      ${sql.json(preferences)}::jsonb,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      liveview_channel_preferences = EXCLUDED.liveview_channel_preferences,
      updated_at = now()
  `;
}

export async function PATCH(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const channelId = body.channelId?.trim();

    if (!channelId) {
      return NextResponse.json({ error: "channelId fehlt." }, { status: 400 });
    }

    const settings = await getUserSettings(auth.userId);
    const nextPreferences = upsertPreference(
      settings.liveviewChannelPreferences,
      channelId,
      {
        ...(typeof body.isFavorite === "boolean"
          ? { isFavorite: body.isFavorite }
          : {}),
        ...(typeof body.hidden === "boolean"
          ? { hidden: body.hidden }
          : {}),
        ...(typeof body.deleted === "boolean"
          ? { deleted: body.deleted }
          : {}),
      }
    );

    await savePreferences(auth.userId, nextPreferences);

    const response = NextResponse.json({ success: true });
    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Favorit konnte nicht gespeichert werden.",
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
    const body = (await req.json()) as RequestBody;
    const channelId = body.channelId?.trim();

    if (!channelId) {
      return NextResponse.json({ error: "channelId fehlt." }, { status: 400 });
    }

    const settings = await getUserSettings(auth.userId);
    const nextPreferences = upsertPreference(
      settings.liveviewChannelPreferences,
      channelId,
      {
        isFavorite: false,
        hidden: true,
        deleted: true,
      }
    );

    await savePreferences(auth.userId, nextPreferences);
    const channels = await removeLiveViewChannelForUser(auth.userId, channelId);

    const response = NextResponse.json({
      success: true,
      channels,
    });

    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kanal konnte nicht gelöscht werden.",
      },
      { status: 500 }
    );

    return applyRefreshedAccessToken(response, auth);
  }
}