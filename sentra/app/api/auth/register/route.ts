import { NextRequest } from "next/server";
import { handleAuthRegister } from "@/utils/authFlow";

export async function POST(req: NextRequest) {
  return handleAuthRegister(req);
}