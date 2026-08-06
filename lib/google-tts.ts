import { GoogleAuth } from "google-auth-library";

export async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || "";
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
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
        voice: { languageCode: "vi-VN", name: "vi-VN-Neural2-D" },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
      }),
    }
  );

  if (!response.ok) throw new Error("TTS failed: " + (await response.text()));
  const data = await response.json();
  return Buffer.from(data.audioContent, "base64");
}