import { NextRequest } from "next/server";
import { warmStartpageBackground } from "@/app/api/startpage/backgroundService";
import { warmEventsForUser } from "@/utils/eventsService";
import { forwardAuthRequestWithBody } from "@/utils/authProxy";

type AuthResponse = {
  user?: {
    id?: string | number;
  };
};

export async function POST(req: NextRequest) {
  const { response, data, ok } = await forwardAuthRequestWithBody<AuthResponse>(
    req,
    "/api/auth/login"
  );

  const userId = data?.user?.id ? String(data.user.id) : null;

  if (ok && userId) {
    console.log("Starting startpage warmup after login for userId:", userId);
    void warmStartpageBackground(userId).catch((error) => {
      console.error("Startpage warmup after login failed:", error);
    });
    void warmEventsForUser(userId).catch((error) => {
      console.error("Event warmup after login failed:", error);
    });
  }

  return response;
}
