import { LocationResult, Address } from "@/types/typesRegister"

export async function getLocationFromCoords(
  lat: number,
  lng: number
): Promise<LocationResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("accept-language", "en"); // de, fr
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lng.toString());
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "my-app/1.0"
    }
  });
  console.log(response)
  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = await response.json() as { address?: Address; display_name?: string };
  const address = data.address ?? {};

  const display_name: string | undefined = data.display_name;
  const town: string | undefined =
    address.town ||
    address.village ||
    address.hamlet ||
    address.city ||
    address.suburb ||
    address.neighbourhood ||
    address.locality ||
    undefined;
  const county = address.county;
  const state = address.state;
  const country = address.country;
  const country_code = address.country_code;

  return {
    display_name,
    town,
    county,
    state,
    country,
    country_code,
  };
}