import { execFile } from "child_process";
import fs from "fs";

export interface Narration {
  audioPath: string;
  startAt: number;
  duration: number;
  freezeDuration?: number; // Thời gian cần đứng hình tại điểm bắt đầu giọng nói này
}

// Bắt buộc trả về binary global "ffmpeg" & "ffprobe" đã cài bằng apt-get trong Dockerfile
export function getFfmpegPath(): string {
  return "ffmpeg";
}

export function getFfprobePath(): string {
  return "ffprobe";
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 100 }, (err, _out, stderr) => {
      if (err) reject(new Error("FFmpeg error: " + stderr));
      else resolve();
    });
  });
}

// Đo độ dài file MP3 lồng tiếng
export function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      getFfprobePath(),
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
  const needsFreeze = narrations.some(n => n.freezeDuration && n.freezeDuration > 0.05);

  if (!needsFreeze) {
    const args: string[] = ["-y", "-i", videoPath];
    narrations.forEach((n) => args.push("-i", n.audioPath));

    const filters: string[] = [];

    let prev = "[0:a]";
    narrations.forEach((n, i) => {
      filters.push(
        `${prev}volume=volume=0.25:enable='between(t,${n.startAt},${(n.startAt + n.duration).toFixed(2)})'[d${i}]`
      );
      prev = `[d${i}]`;
    });

    const mixInputs = [prev];
    narrations.forEach((n, i) => {
      const ms = Math.round(n.startAt * 1000);
      filters.push(`[${i + 1}:a]adelay=${ms}|${ms}[n${i}]`);
      mixInputs.push(`[n${i}]`);
    });

    filters.push(
      `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:normalize=0[aout]`
    );

    args.push(
      "-filter_complex", filters.join(";"),
      "-map", "0:v", "-map", "[aout]",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
      outputPath
    );

    await run(getFfmpegPath(), args);
    return;
  }

  // THUẬT TOÁN FREEZE FRAME NÂNG CAO
  const args: string[] = ["-y", "-i", videoPath];
  narrations.forEach((n) => args.push("-i", n.audioPath));

  const filters: string[] = [];
  
  let lastCutTime = 0;
  let accumulatedOffset = 0;
  
  const videoParts: string[] = [];
  const audioParts: string[] = [];
  
  const activeFreezes = narrations.filter(n => n.freezeDuration && n.freezeDuration > 0.05);

  activeFreezes.forEach((n, idx) => {
    const cutPoint = n.startAt - accumulatedOffset;
    const freezeSec = n.freezeDuration || 0;
    
    const partVid = `v_part${idx}`;
    const freezeVid = `v_freeze${idx}`;
    
    filters.push(`[0:v]trim=start=${lastCutTime}:end=${cutPoint},setpts=PTS-STARTPTS[${partVid}]`);
    videoParts.push(`[${partVid}]`);
    
    filters.push(`[0:v]trim=start=${cutPoint}:end=${cutPoint + 0.04},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${freezeSec}[${freezeVid}]`);
    videoParts.push(`[${freezeVid}]`);

    const partAud = `a_part${idx}`;
    const silenceAud = `a_silence${idx}`;
    filters.push(`[0:a]atrim=start=${lastCutTime}:end=${cutPoint},asetpts=PTS-STARTPTS[${partAud}]`);
    audioParts.push(`[${partAud}]`);
    
    filters.push(`anullsrc=r=44100:cl=stereo:d=${freezeSec}[${silenceAud}]`);
    audioParts.push(`[${silenceAud}]`);
    
    lastCutTime = cutPoint;
    accumulatedOffset += freezeSec;
  });

  filters.push(`[0:v]trim=start=${lastCutTime},setpts=PTS-STARTPTS[v_part_final]`);
  videoParts.push("[v_part_final]");
  filters.push(`[0:a]atrim=start=${lastCutTime},asetpts=PTS-STARTPTS[a_part_final]`);
  audioParts.push("[a_part_final]");

  filters.push(`${videoParts.join("")}concat=n=${videoParts.length}:v=1:a=0[v_concated]`);
  filters.push(`${audioParts.join("")}concat=n=${audioParts.length}:v=0:a=1[a_concated]`);

  let prevAudio = "[a_concated]";
  narrations.forEach((n, i) => {
    filters.push(
      `${prevAudio}volume=volume=0.25:enable='between(t,${n.startAt},${(n.startAt + n.duration).toFixed(2)})'[d${i}]`
    );
    prevAudio = `[d${i}]`;
  });

  const mixInputs = [prevAudio];
  narrations.forEach((n, i) => {
    const ms = Math.round(n.startAt * 1000);
    filters.push(`[${i + 1}:a]adelay=${ms}|${ms}[n${i}]`);
    mixInputs.push(`[n${i}]`);
  });

  filters.push(
    `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:normalize=0[aout]`
  );

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[v_concated]", "-map", "[aout]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
    outputPath
  );

  await run(getFfmpegPath(), args);
}