import { NextResponse } from "next/server";
import { getUploadAuthParams } from "@imagekit/next/server";

export async function GET() {
  try {
    // generate upload authentication parameters
    const { token, expire, signature } = getUploadAuthParams({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
    });

    return NextResponse.json({
      token,
      expire,
      signature,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: "Failed to generate auth params" },
      { status: 500 }
    );
  }
}