import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { analyzeVideo } from "@/lib/gemini";
import { synthesizeSpeech } from "@/lib/google-tts";
import { probeDuration, renderDescribedVideo, Narration } from "@/lib/ffmpeg";

export async function POST(req: Request) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "viddyscribe-"));

  try {
    const { videoBase64, mimeType } = await req.json();

    // 0. Lưu video gốc vào folder tạm
    const videoPath = path.join(tmpDir, "original.mp4");
    fs.writeFileSync(videoPath, Buffer.from(videoBase64, "base64"));

    // 1. ĐẠO DIỄN gọi BIÊN KỊCH: Gemini xem video -> segments
    const segments = (await analyzeVideo(videoBase64, mimeType)).slice(0, 15);

    // 2. ĐẠO DIỄN gọi DIỄN VIÊN LỒNG TIẾNG: đọc từng đoạn
    //    + xếp lịch: đoạn sau chờ đoạn trước đọc xong mới vô (cursor)
    const narrations: Narration[] = [];
    let cursor = 0;
    for (const seg of segments) {
      const audio = await synthesizeSpeech(seg.text);
      const audioPath = path.join(tmpDir, `narr-${narrations.length}.mp3`);
      fs.writeFileSync(audioPath, audio);
      const duration = await probeDuration(audioPath);
      const startAt = Math.max(seg.start, cursor);
      narrations.push({ audioPath, startAt, duration });
      cursor = startAt + duration + 0.3;
    }

    // 3. ĐẠO DIỄN gọi PHÒNG DỰNG: FFmpeg trộn thành video mới
    const outputPath = path.join(tmpDir, "output.mp4");
    await renderDescribedVideo(videoPath, narrations, outputPath);

    // 4. Trả video mới về cho user
    const buffer = fs.readFileSync(outputPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="viddyscribe-vn.mp4"',
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Dọn dẹp folder tạm
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}