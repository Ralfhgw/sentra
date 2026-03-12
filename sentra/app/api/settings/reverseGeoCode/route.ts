import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  console.log("reverseGeoCode: received lat/lon:", lat, lon);

  if (!lat || !lon) {
    console.log("reverseGeoCode: Missing lat/lon");
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
  console.log("reverseGeoCode: Fetching URL:", url);

  const res = await fetch(url, { headers: { "User-Agent": "sentra-app" } });
  if (!res.ok) {
    console.log("reverseGeoCode: Reverse geocoding failed", res.status);
    return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 500 });
  }
  const data = await res.json();
  const address = data.address || {};

  console.log("reverseGeoCode: address result:", address);

  return NextResponse.json({
    town: address.city || address.town || address.village || "",
    county: address.county || "",
    state: address.state || "",
    country: address.country || "",
    country_code: address.country_code || "",
  });
}