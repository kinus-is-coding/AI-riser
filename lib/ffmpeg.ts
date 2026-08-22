import { execFile, exec, execFileSync } from "child_process";
import ffmpegStaticPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";

export interface Narration {
  audioPath: string;
  startAt: number;
  duration: number;
}

// Hàm helper để tìm binary path tối ưu (ưu tiên dùng command global nếu chạy trên production Linux/Cloud Run)
function getFfmpegPath(): string {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    return ffmpegStaticPath || "ffmpeg";
  }
}

function getFfprobePath(): string {
  try {
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return "ffprobe";
  } catch {
    return ffprobeStatic.path || "ffprobe";
  }
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
      getFfprobePath(),
      ["-v", "error", "-show_entries", "format=duration", "-of",
       "default=noprint_wrappers=1:nokey=1", filePath],
      (err, stdout) => (err ? reject(err) : resolve(parseFloat(stdout.trim())))
    );
  });
}

export interface Narration {
  audioPath: string;
  startAt: number;
  duration: number;
  freezeDuration?: number; // Thời gian cần đứng hình tại điểm bắt đầu giọng nói này
}

export async function renderDescribedVideo(
  videoPath: string,
  narrations: Narration[],
  outputPath: string
): Promise<void> {
  // Nếu không có yêu cầu đóng băng hình ảnh nào (freezeDuration = 0 hoặc undefined)
  // Ta fallback về cơ chế cũ để chạy nhanh và tiết kiệm tài nguyên
  const needsFreeze = narrations.some(n => n.freezeDuration && n.freezeDuration > 0.05);

  if (!needsFreeze) {
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
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
      outputPath
    );

    await run(getFfmpegPath(), args);
    return;
  }

  // THUẬT TOÁN FREEZE FRAME NÂNG CAO:
  // Cắt video gốc thành các đoạn nhỏ tại mốc cần đóng băng, kéo dài frame cuối của đoạn trước rồi nối lại.
  const args: string[] = ["-y", "-i", videoPath];
  narrations.forEach((n) => args.push("-i", n.audioPath));

  const filters: string[] = [];
  
  // Tính toán các mốc cắt video gốc (timeline tích lũy sự thay đổi thời gian do freeze frames)
  let videoFilterInput = "[0:v]";
  let audioFilterInput = "[0:a]";
  
  // 1. Xử lý chia video và chèn freeze frame bằng bộ lọc complex
  // Chúng ta sẽ duyệt qua các narrations. Nếu có freezeDuration, ta cắt video gốc tại startAt
  // rồi áp dụng filter 'loop' để lặp lại chính xác frame hình ảnh tại vị trí đó.
  let currentVideoOut = "[0:v]";
  let lastCutTime = 0;
  let accumulatedOffset = 0;
  
  const videoParts: string[] = [];
  const audioParts: string[] = [];
  
  const activeFreezes = narrations.filter(n => n.freezeDuration && n.freezeDuration > 0.05);

  activeFreezes.forEach((n, idx) => {
    const cutPoint = n.startAt - accumulatedOffset; // mốc cắt thực tế trên video gốc
    const freezeSec = n.freezeDuration || 0;
    
    const partVid = `v_part${idx}`;
    const freezeVid = `v_freeze${idx}`;
    
    // Cắt đoạn video từ điểm cắt trước đến điểm cắt hiện tại
    filters.push(`[0:v]trim=start=${lastCutTime}:end=${cutPoint},setpts=PTS-STARTPTS[${partVid}]`);
    videoParts.push(`[${partVid}]`);
    
    // Cắt chính xác 1 frame tại điểm cắt hiện tại và loop nó để tạo freeze frame
    // Ta lấy 1 frame duy nhất tại cutPoint, lặp lại nó trong freezeSec giây với fps tương đương (mặc định 25 hoặc 30)
    // Dùng tpad để clone frame cuối cùng, chính xác hơn loop
    filters.push(`[0:v]trim=start=${cutPoint}:end=${cutPoint + 0.04},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${freezeSec}[${freezeVid}]`);
    videoParts.push(`[${freezeVid}]`);

    // Đồng thời xử lý Audio: Cắt phần audio gốc tương ứng
    const partAud = `a_part${idx}`;
    const silenceAud = `a_silence${idx}`;
    filters.push(`[0:a]atrim=start=${lastCutTime}:end=${cutPoint},asetpts=PTS-STARTPTS[${partAud}]`);
    audioParts.push(`[${partAud}]`);
    
    // Tạo khoảng lặng âm thanh gốc tương đương với thời gian đứng hình
    filters.push(`anullsrc=r=44100:cl=stereo:d=${freezeSec}[${silenceAud}]`);
    audioParts.push(`[${silenceAud}]`);
    
    lastCutTime = cutPoint;
    accumulatedOffset += freezeSec;
  });

  // Thêm phần cuối cùng của video & audio gốc
  const finalIdx = activeFreezes.length;
  filters.push(`[0:v]trim=start=${lastCutTime},setpts=PTS-STARTPTS[v_part_final]`);
  videoParts.push("[v_part_final]");
  filters.push(`[0:a]atrim=start=${lastCutTime},asetpts=PTS-STARTPTS[a_part_final]`);
  audioParts.push("[a_part_final]");

  // Nối tất cả các mảnh video và mảnh audio gốc (đã bao gồm phần freeze frame & khoảng lặng chèn vào)
  filters.push(`${videoParts.join("")}concat=n=${videoParts.length}:v=1:a=0[v_concated]`);
  filters.push(`${audioParts.join("")}concat=n=${audioParts.length}:v=0:a=1[a_concated]`);

  // 2. Nhỏ tiếng nền gốc đã nối (a_concated) trong lúc đọc thuyết minh
  let prevAudio = "[a_concated]";
  narrations.forEach((n, i) => {
    // Vì video và audio nền đã bị giãn ra do các freeze frames trước đó, 
    // mốc thời gian startAt thực tế của audio thuyết minh chính là n.startAt (đã bao gồm độ trễ tích lũy).
    filters.push(
      `${prevAudio}volume=volume=0.25:enable='between(t,${n.startAt},${(n.startAt + n.duration).toFixed(2)})'[d${i}]`
    );
    prevAudio = `[d${i}]`;
  });

  // 3. Đặt từng đoạn giọng đọc vào đúng mốc thời gian (delay)
  const mixInputs = [prevAudio];
  narrations.forEach((n, i) => {
    const ms = Math.round(n.startAt * 1000);
    filters.push(`[${i + 1}:a]adelay=${ms}|${ms}[n${i}]`);
    mixInputs.push(`[n${i}]`);
  });

  // 4. Trộn tất cả thành luồng âm thanh cuối cùng
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