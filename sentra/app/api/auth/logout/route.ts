import { NextRequest } from "next/server";
import { clearLocalAuthCookies, forwardAuthRequest } from "@/utils/authProxy";

export async function POST(req: NextRequest) {
  const response = await forwardAuthRequest(req, "/api/auth/logout");
  return clearLocalAuthCookies(response);
}