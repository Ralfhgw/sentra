import { type NextRequest, type NextResponse } from "next/server";
import { warmStartpageBackground } from "@/app/api/startpage/backgroundService";
import { warmEventsForUser } from "@/utils/eventsService";
import { forwardAuthRequestWithBody } from "@/utils/authProxy";
import { getAuthUserId, type AuthResponseEnvelope } from "@/utils/authResponse";

export async function handleLoginWithWarmup(
  req: NextRequest
): Promise<NextResponse> {
  const { response, data, ok } = await forwardAuthRequestWithBody<AuthResponseEnvelope>(
    req,
    "/api/auth/login"
  );

  const userId = getAuthUserId(data);

  if (ok && userId) {
    console.log("[auth/login] Starting post-login warmup for userId:", userId);

    void warmStartpageBackground(userId).catch((error) => {
      console.error("[auth/login] Startpage warmup after login failed:", error);
    });

    void warmEventsForUser(userId).catch((error) => {
      console.error("[auth/login] Event warmup after login failed:", error);
    });
  }

  return response;
}
