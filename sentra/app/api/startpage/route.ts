import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId missing" }, { status: 400 });
  }

  try {
    const result = await cloudinary.api.resource(`user_profiles/${userId}`);
    return NextResponse.json({ url: result.secure_url });
  } catch (e) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}