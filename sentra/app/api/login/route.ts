import { NextRequest } from "next/server";
import { handleLoginWithWarmup } from "@/utils/loginFlow";

export async function POST(req: NextRequest) {
  return handleLoginWithWarmup(req);
}
