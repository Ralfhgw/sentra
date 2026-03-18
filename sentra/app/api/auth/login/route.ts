import { NextRequest } from "next/server";
import { forwardAuthRequest } from "@/utils/authProxy";

export async function POST(req: NextRequest) {
  return forwardAuthRequest(req, "/api/auth/login");
}