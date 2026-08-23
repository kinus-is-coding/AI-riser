import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { synthesizeSpeech, VoiceKey } from "@/lib/google-tts";
import { probeDuration, renderDescribedVideo, Narration } from "@/lib/ffmpeg";

export async function POST(req: Request) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "viddyscribe-"));

  try {
    const { videoBase64, segments, voiceKey } = await req.json();

    if (!videoBase64) {
      return NextResponse.json({ error: "Missing videoBase64" }, { status: 400 });
    }
    if (!segments || !Array.isArray(segments)) {
      return NextResponse.json({ error: "Missing or invalid segments array" }, { status: 400 });
    }

    const videoPath = path.join(tmpDir, "original.mp4");
    fs.writeFileSync(videoPath, Buffer.from(videoBase64, "base64"));

    const selectedVoice: VoiceKey = voiceKey || "nu-bac";

    const audioResults = await Promise.all(
      segments.map(async (seg: { text: string; start: number; hasSpeech?: boolean }, index: number) => {
        const audio = await synthesizeSpeech(seg.text, selectedVoice);
        const audioPath = path.join(tmpDir, `narr-${index}.mp3`);
        fs.writeFileSync(audioPath, audio);
        const duration = await probeDuration(audioPath);
        return { start: seg.start, audioPath, duration, hasSpeech: !!seg.hasSpeech };
      })
    );

    audioResults.sort((a, b) => a.start - b.start);

    let accumulatedFreeze = 0;
    const narrations: Narration[] = [];

    for (let i = 0; i < audioResults.length; i++) {
      const data = audioResults[i];

      // Thời điểm bắt đầu trên timeline mới (đã kéo giãn do freeze của các segment trước)
      const startAt = data.start + accumulatedFreeze;

      // ✅ FREEZE FRAME: Nếu segment HIỆN TẠI có hội thoại quan trọng
      // Thì khi video chạy đến thời điểm startAt, nó sẽ FREEZE lại
      // TTS đọc mô tả trong lúc video đứng hình
      // Đọc xong rồi video mới resume chạy tiếp
      let freezeDuration = 0;
      if (data.hasSpeech) {
        freezeDuration = data.duration; // Freeze = thời gian TTS đọc
        accumulatedFreeze += freezeDuration; // Cộng dồn vào timeline cho các segment sau
      }

      narrations.push({
        audioPath: data.audioPath,
        startAt,
        duration: data.duration,
        freezeDuration: parseFloat(freezeDuration.toFixed(2))
      });
    }

    const outputPath = path.join(tmpDir, "output.mp4");
    await renderDescribedVideo(videoPath, narrations, outputPath);

    const buffer = fs.readFileSync(outputPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="viddyscribe-vn.mp4"',
      },
    });
  } catch (error) {
    console.error("Error in /api/render:", error);
    const message = error instanceof Error ? error.message : "Unknown render error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Failed to clean temporary directory:", e);
    }
  }
}