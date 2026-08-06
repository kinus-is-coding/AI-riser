import { execFile } from "child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

export interface Narration {
  audioPath: string;
  startAt: number;
  duration: number;
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 100 }, (err, _out, stderr) => {
      if (err) reject(new Error("FFmpeg error: " + stderr));
      else resolve();
    });
  });
}

// Đo độ dài file MP3 lồng tiếng (để xếp lịch không bị đè nhau)
export function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobe.path,
      ["-v", "error", "-show_entries", "format=duration", "-of",
       "default=noprint_wrappers=1:nokey=1", filePath],
      (err, stdout) => (err ? reject(err) : resolve(parseFloat(stdout.trim())))
    );
  });
}

export async function renderDescribedVideo(
  videoPath: string,
  narrations: Narration[],
  outputPath: string
): Promise<void> {
  const args: string[] = ["-y", "-i", videoPath];
  narrations.forEach((n) => args.push("-i", n.audioPath));

  const filters: string[] = [];

  // 1. Nhỏ tiếng gốc xuống 25% trong lúc giọng đọc vang lên
  let prev = "[0:a]";
  narrations.forEach((n, i) => {
    filters.push(
      `${prev}volume=volume=0.25:enable='between(t,${n.startAt},${(n.startAt + n.duration).toFixed(2)})'[d${i}]`
    );
    prev = `[d${i}]`;
  });

  // 2. Đặt từng đoạn giọng đọc vào đúng mốc thời gian
  const mixInputs = [prev];
  narrations.forEach((n, i) => {
    const ms = Math.round(n.startAt * 1000);
    filters.push(`[${i + 1}:a]adelay=${ms}|${ms}[n${i}]`);
    mixInputs.push(`[n${i}]`);
  });

  // 3. Trộn tất cả thành 1 luồng âm thanh
  filters.push(
    `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:normalize=0[aout]`
  );

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "0:v", "-map", "[aout]",
    "-c:v", "copy", "-c:a", "aac",
    outputPath
  );

  await run(ffmpegPath, args);
}