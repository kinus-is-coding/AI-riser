import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import util from "util";
import { analyzeVideo } from "@/lib/gemini";
import { getFfmpegPath } from "@/lib/ffmpeg";
const execPromise = util.promisify(exec);
// Cache trong RAM (Ngày 6 bác sẽ chuyển cái này lên Firestore)
const analysisCache = new Map<string, any>(); 

export async function POST(req: Request) {
  try {
    const { videoBase64, mimeType } = await req.json();
    if (!videoBase64) {
      return NextResponse.json({ error: "Missing videoBase64" }, { status: 400 });
    }

    // 1. CACHE CHECK (PRO FEATURE)
    const hash = crypto.createHash("sha256").update(Buffer.from(videoBase64, "base64")).digest("hex");
    if (analysisCache.has(hash)) {
      console.log("⚡ Cache hit! Bỏ qua gọi Gemini, dùng kết quả cũ.");
      return NextResponse.json(analysisCache.get(hash));
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "analyze-"));
    try {
      const originalPath = path.join(tmpDir, "original.mp4");
      const compressedPath = path.join(tmpDir, "compressed.mp4");

      // Lưu file video gốc user upload
      fs.writeFileSync(originalPath, Buffer.from(videoBase64, "base64"));

      // 2. NÉN VIDEO (PRO FEATURE: Giảm 80% input token)
      // Hạ xuống 1 khung hình/giây, scale rộng tối đa 512px, bỏ luôn audio
      const ffmpegPath = getFfmpegPath();
      await execPromise(
        `"${ffmpegPath}" -y -i "${originalPath}" -vf "fps=1,scale=512:-2" -c:v libx264 -preset ultrafast -crf 35 -ar 16000 -ac 1 -c:a aac -b:a 32k "${compressedPath}"`
      );

      // Đọc base64 của video đã nén
      const compressedBase64 = fs.readFileSync(compressedPath).toString("base64");

      // 3. GỌI GEMINI VỚI VIDEO NHẸ TÊNH
      const segments = await analyzeVideo(compressedBase64, "video/mp4");

      const responseData = { segments };
      
      // Lưu vào Cache
      analysisCache.set(hash, responseData);

      return NextResponse.json(responseData);
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
  } catch (error: any) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}