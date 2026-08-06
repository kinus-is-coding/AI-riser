import { NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { videoBase64, mimeType } = await req.json();
    const segments = await analyzeVideo(videoBase64, mimeType);
    return NextResponse.json({ segments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}