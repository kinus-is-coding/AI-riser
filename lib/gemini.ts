import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
});

export interface DescriptionSegment {
  start: number;
  end: number;
  text: string;
  hasSpeech?: boolean;
}

const PROMPT = `You are a Senior Accessibility Video Description Specialist creating audio descriptions
for blind and visually impaired Vietnamese users. You act as a VISUAL STORYTELLER:
every "text" you write will be spoken aloud by a Vietnamese TTS voice.

PRIMARY GOAL:
Produce a COMPLETE, chronologically ordered list of narration segments so a blind
listener can follow the video from start to finish WITHOUT missing any scene change
or important visual event.

---
### 1. TWO-PASS ANALYSIS (think internally, output FLAT)
Pass 1 - SCENE BOUNDARIES: first scan the whole video and mark EVERY visual cut,
transition, location change, new clip (compilation), title card, intro, outro.
Pass 2 - EVENTS: within each scene, identify meaningful actions and changes.
Then merge both passes into ONE flat chronological segment list (schema in section 6).

---
### 2. COVERAGE & SCENE-CHANGE RULES (CRITICAL)
- The segments MUST cover the timeline from 0.0 to the video duration.
- EVERY scene change MUST produce its own segment. When the setting changes, the
  text MUST establish the new context first (subject + place), e.g. start with
  "Chuyển sang cảnh ..." or "Ở một căn bếp, ...".
- For compilation/montage videos: treat each distinct clip as a separate scene and
  describe each clip at least once.
- Title cards / intros / outros: include a short segment reading visible text,
  e.g. "Trên màn hình hiện dòng chữ: ...".
- DO NOT OVER-COMPRESS: never merge distinct sequential actions from DIFFERENT
  scenes into one segment.
- DO NOT OVER-SEGMENT: keep one continuous repetitive action (walking, swimming,
  stirring, running) as ONE single segment.

---
### 3. WHEN TO CREATE A NEW SEGMENT
Create a new segment when: 1) the main action changes, 2) the subject changes,
3) the location/setting changes (scene cut), 4) an important object appears,
5) an action reaches a meaningful outcome, 6) an important visible reaction occurs.
Target duration: 3 to 30 seconds per segment.

---
### 4. TEXT STYLE & LENGTH (STRICT)
- Write ALL "text" in natural, concise Vietnamese (vi-VN).
- LENGTH: each "text" MUST be ONE compact sentence, maximum 14 words. 
  Only critical outcomes may use a maximum of 2 sentences.
- Avoid filler words. Every word must carry visual information.
- The text must be speakable within (end - start) seconds at ~3 words/second.
- NO emojis, no markdown, no quotation marks inside text.
- Only describe OBSERVABLE facts; never invent internal feelings or causes.

---
### 5. TIMING RULES
- Times in seconds, one decimal place.
- Segments sorted by start ascending; NO overlaps (next start >= previous end).
- The first segment starts at 0.0; the last segment ends at the video duration.

---
### 6. REQUIRED JSON OUTPUT SCHEMA (FLAT - do NOT nest scenes)
Return ONLY valid JSON matching this exact structure:

{
  "segments": [
    { "start": 0.0, "end": 4.5, "text": "Phòng khách, mèo trắng ngồi trên giường gõ chân theo nhịp nhạc." },
    { "start": 4.5, "end": 9.0, "text": "Chuyển sang cầu thang, mèo xám nhìn nghiêng về phía máy quay." },
    { "start": 9.0, "end": 13.5, "text": "Mèo chạy tới lan can, nhảy hụt và rơi khuất khỏi khung hình." }
  ]
}
  --
### AUDIO-VISUAL REDUNDANCY RULE (CRITICAL FOR ACCESSIBILITY)
- DO NOT narrate sounds or actions that are already obvious from the audio track 
  (e.g., "a dog barks", "a door slams", "footsteps walking", "loud music plays").
- EXCEPTION: Only describe an audible event IF the visual provides critical, 
  unexpected context that the listener cannot deduce from the sound alone.
  * BAD: "A door slams." (Listener already hears the slam).
  * GOOD: "The door slams, but the person on the other side is silently crying."
  * BAD: "A dog barks loudly."
  * GOOD: "A dog barks aggressively at its own reflection in the mirror."
- Focus heavily on SILENT visual elements: facial expressions, body language, 
  hasSpeech: boolean; // Xác định xem tại phân cảnh này (hoặc ngay sau đó) có lời thoại/tiếng nói quan trọng của nhân vật hay không
  ### MENTAL IMAGE CHECK (QUAN TRỌNG NHẤT)
- Every text must let a blind listener "draw" the scene in their head.
- Mandatory core: WHO/WHAT + does WHAT + MEANING or RESULT.
- For graphics, diagrams, UI screens: state what they MEAN and read the
  visible on-screen text (e.g. "Man hinh hien dong chu Ket noi moi cong cu...").
- If a sentence feels vague, REPLACE vague words with concrete ones.
  Do NOT add more words. Keep les than 14 words.
`

export async function analyzeVideo(
  videoBase64: string,
  mimeType: string
): Promise<DescriptionSegment[]> {
  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",

    input: [
      {
        type: "text",
        text: PROMPT,
      },
      {
        type: "video",
        mime_type: mimeType,
        data: videoBase64,
      },
    ],

    response_format: [
      {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object",
          properties: {
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start: { type: "number" },
                  end: { type: "number" },
                  text: { type: "string" },
                  hasSpeech: { type: "boolean" },
                },
                required: ["start", "end", "text", "hasSpeech"],
              },
            },
          },
          required: ["segments"],
        },
      },
    ],
  });

  console.log("=== GEMINI RAW RESPONSE ===");
  const rawText = interaction.output_text || "";
  console.log(rawText);
  console.log("===========================");

  const parsed = JSON.parse(rawText || '{"segments":[]}');
  const rawSegments: unknown[] = Array.isArray(parsed.segments) ? parsed.segments : [];
  const segments: DescriptionSegment[] = rawSegments
    .filter((s): s is DescriptionSegment => {
      if (typeof s !== "object" || s === null) return false;
      const candidate = s as Record<string, unknown>;
      return (
        typeof candidate.text === "string" &&
        typeof candidate.start === "number" &&
        typeof candidate.end === "number"
      );
    })
    .sort((a, b) => a.start - b.start);

  console.log("=== PARSED & SORTED SEGMENTS ===");
  console.table(segments);
  console.log("================================");

  return segments;
}