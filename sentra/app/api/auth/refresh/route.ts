import { NextRequest } from "next/server";
import { warmStartpageBackground } from "@/app/api/startpage/backgroundService";
import { forwardAuthRequestWithBody } from "@/utils/authProxy";
import { getAuthUserId, type AuthResponseEnvelope } from "@/utils/authResponse";

// Take over the Auth-Refresh-Handling, check result and send answer
export async function POST(req: NextRequest) {
  const { response, data, ok } = await forwardAuthRequestWithBody<AuthResponseEnvelope>(
    req,
    "/api/auth/refresh"
  );

  const userId = getAuthUserId(data);

  if (ok && userId) {
    console.log("Starting startpage warmup after refresh for userId:", userId);
    void warmStartpageBackground(userId).catch((error) => {
      console.error("Startpage warmup after refresh failed:", error);
    });
  }

  return response;
}

