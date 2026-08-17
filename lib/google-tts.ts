import { GoogleAuth } from "google-auth-library";

export async function getAccessToken(): Promise<string> {
  // Hỗ trợ cả file path và credentials JSON trực tiếp từ biến môi trường
  const credentialsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  let credentials;
  if (credentialsEnv) {
    try {
      credentials = JSON.parse(credentialsEnv);
    } catch (e) {
      console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON", e);
    }
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    ...(credentials ? { credentials } : {}),
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || "";
}

// Bảng ánh xạ các giọng nói tiếng Việt
// A: Nữ Nam Bộ, B: Nam Bắc Bộ, C: Nam Nam Bộ, D: Nữ Bắc Bộ
export const VIETNAMESE_VOICES = {
  "nu-nam": { languageCode: "vi-VN", name: "vi-VN-Neural2-A" },
  "nam-bac": { languageCode: "vi-VN", name: "vi-VN-Wavenet-B" }, // Wavenet B là giọng nam Bắc bộ rất tự nhiên
  "nam-nam": { languageCode: "vi-VN", name: "vi-VN-Neural2-C" },
  "nu-bac": { languageCode: "vi-VN", name: "vi-VN-Neural2-D" },
};

export type VoiceKey = keyof typeof VIETNAMESE_VOICES;

export async function synthesizeSpeech(text: string, voiceKey: VoiceKey = "nu-bac"): Promise<Buffer> {
  const voiceConfig = VIETNAMESE_VOICES[voiceKey] || VIETNAMESE_VOICES["nu-bac"];
  
  const response = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        input: { text },
        voice: voiceConfig,
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.2 },
      }),
    }
  );

  if (!response.ok) throw new Error("TTS failed: " + (await response.text()));
  const data = await response.json();
  return Buffer.from(data.audioContent, "base64");
}