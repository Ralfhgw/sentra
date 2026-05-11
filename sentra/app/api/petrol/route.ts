import { NextRequest, NextResponse } from "next/server";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserWithSettingsFromRequest,
} from "@/utils/serverAuth";

type TankerKoenigStation = {
  id: string;
  name: string;
  street: string;
  place: string;
  dist: number;
  diesel?: number | null;
  e5?: number | null;
  e10?: number | null;
  isOpen: boolean;
};

type TankerKoenigResponse = {
  ok?: boolean;
  status?: string;
  license?: string;
  stations?: TankerKoenigStation[];
};

const PETROL_RADIUS_KM = 5;

export async function GET(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserWithSettingsFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";

    return NextResponse.json({ error: message }, { status: 401 });
  }

  const apiKey = process.env.TANKERKOENIG_API_KEY;

  if (!apiKey) {
    return applyRefreshedAccessToken(
      NextResponse.json(
        { error: "TANKERKOENIG_API_KEY missing" },
        { status: 500 }
      ),
      auth
    );
  }

  const { lat, lon } = auth.settings;

  if (lat == null || lon == null) {
    return applyRefreshedAccessToken(
      NextResponse.json(
        { error: "Missing coordinates in user_settings" },
        { status: 400 }
      ),
      auth
    );
  }

  const url = new URL("https://creativecommons.tankerkoenig.de/json/list.php");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lon));
  url.searchParams.set("rad", String(PETROL_RADIUS_KM));
  url.searchParams.set("type", "all");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return applyRefreshedAccessToken(
        NextResponse.json(
          { error: "Petrol API request failed" },
          { status: 502 }
        ),
        auth
      );
    }

    const data = (await response.json()) as TankerKoenigResponse;

    if (!data.ok || data.status !== "ok") {
      return applyRefreshedAccessToken(
        NextResponse.json(
          { error: "Petrol API returned non-ok status" },
          { status: 502 }
        ),
        auth
      );
    }

    const stations = (data.stations ?? [])
      .map((station) => ({
        id: station.id,
        name: station.name,
        street: station.street,
        place: station.place,
        dist: station.dist,
        diesel: station.diesel ?? null,
       e5: station.e5 ?? null,
        e10: station.e10 ?? null,
        isOpen: station.isOpen,
      }))
      .sort((a, b) => a.dist - b.dist);

    return applyRefreshedAccessToken(
      NextResponse.json({
        license: data.license,
        stations,
      }),
      auth
    );
  } catch (error) {
    console.error("Petrol API handling failed:", error);
    return applyRefreshedAccessToken(
      NextResponse.json(
        { error: "Petrol API handling failed" },
        { status: 500 }
      ),
      auth
    );
  }
}