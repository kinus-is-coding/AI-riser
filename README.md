# 🎬 ViddyScribe VN

> Upload a video → receive back a **NEW video** with Vietnamese audio descriptions, so blind and visually impaired people can truly "watch" it.

Inspired by [ViddyScribe](https://ai.google.dev/competition/projects/viddyscribe) (Gemini API Developer Competition).
We localize and extend it for Vietnam: Vietnamese AD scriptwriting, cultural-aware descriptions, and Vietnamese neural voices.

Built for **#AIRiserVietnam** · **#BuildwithGoogleAI**

---

## ✨ What it does

According to the WHO, at least 2.2 billion people worldwide live with vision impairment — yet the vast majority of online videos have no audio description. Manual AD production is slow and expensive.

ViddyScribe VN automates the whole pipeline for video creators:

1. 🧠 **Gemini** watches the uploaded video and writes timestamped Vietnamese descriptions
2. 🎙️ **Google Cloud Text-to-Speech** reads each description with a natural Vietnamese voice
3. 🎛️ **FFmpeg** mixes the narrations into the original video (ducking the original audio at the right moments)
4. 📦 The creator downloads a new, fully audio-described video — ready to share

---

## 🏗️ Current architecture

```
viddyscribe-vn/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts   # Debug endpoint: Gemini only → returns segments JSON
│   │   └── render/route.ts    # MAIN endpoint: full pipeline → returns new MP4
│   ├── page.tsx               # Frontend (VIBE ZONE)
│   └── layout.tsx
├── components/                # UI components (VIBE ZONE)
├── lib/
│   ├── gemini.ts              # 🧠 Video analysis → timestamped segments (LEAD ZONE)
│   ├── google-tts.ts          # 🎙️ Vietnamese TTS → MP3 buffers (LEAD ZONE)
│   └── ffmpeg.ts              # 🎛️ Audio mixing / video rendering (LEAD ZONE)
├── types.d.ts                 # TS declarations for ffmpeg-static / ffprobe-static
├── Dockerfile                 # Cloud Run deployment (node:20, FFmpeg-ready)
├── .env.example
└── package.json
```

### Pipeline flow

```
page.tsx (upload)
      ↓
POST /api/render  (orchestrator)
      ↓
lib/gemini.ts     → [{start, end, text}, ...]
      ↓
lib/google-tts.ts → one MP3 per segment + duration probing
      ↓
lib/ffmpeg.ts     → duck original audio + place narrations + mix
      ↓
NEW MP4 returned to the client
```

### API

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/analyze` | `{ videoBase64, mimeType }` | `{ segments: [{start, end, text}] }` |
| `POST /api/render` | `{ videoBase64, mimeType }` | `video/mp4` binary (attachment) |

---

## 🚀 Getting started

**Prerequisites:** Node 20+, a Google AI Studio API key, a Google Cloud service account with Text-to-Speech enabled.

```bash
npm install
cp .env.example .env          # fill in your keys
# put your service-account.json at project root
npm run dev                   # http://localhost:3000
```



## 🤝 Team conventions 

### 1. Phân vùng sở hữu
| Vùng | Ai đụng được |
|---|---|
| `components/`, `app/page.tsx` | ✅ Bạn vibe |
| `app/api/`, `lib/`, `Dockerfile`, `.env` | ✅ Lead — bạn vibe **CẤM** sửa, muốn sửa phải hỏi |



### 2. Git
- Commit message: `feat:`, `fix:`, `docs:`, `vibe:` (cho UI generate bằng AI).
- Không push code chưa chạy local.
- **TUYỆT ĐỐI KHÔNG** commit `.env`, `service-account.json`, video test.

### 3. Tài nguyên test
- Video test phải **tự quay** (không dùng footage người khác — tránh bản quyền khi up demo YouTube).
- Bỏ video mẫu vào Drive chung của team.

---

## 🙏 Credits

- Original concept: **ViddyScribe** — Google AI Studio / Gemini API Developer Competition
- Team member: Minh Ngo(Project's lead), Nam den(FE)
  
- Powered by: Gemini API, Google Cloud Text-to-Speech, FFmpeg, Next.js