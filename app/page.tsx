"use client";

import { useState } from "react";
import PreviewModal, { Segment } from "@/components/PreviewModal";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [voiceKey, setVoiceKey] = useState("nu-bac");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [videoBase64, setVideoBase64] = useState("");
  const [mimeType, setMimeType] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setVideoUrl("");
    setShowModal(true);
    setStatus("📤 Đang upload video...");

    try {
      const base64 = await fileToBase64(file);
      const videoBase64Data = base64.split(",")[1];
      const mime = file.type;

      setVideoBase64(videoBase64Data);
      setMimeType(mime);

      // Gọi API analyze
      setStatus("🧠 Đang phân tích video bằng Gemini...");
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoBase64: videoBase64Data, mimeType: mime }),
      });

      if (!analyzeRes.ok) {
        const data = await analyzeRes.json();
        throw new Error(data.error || "Phân tích video thất bại");
      }

      const { segments: segs } = await analyzeRes.json();
      if (!segs || !Array.isArray(segs) || segs.length === 0) {
        throw new Error("API analyze không trả về segments hợp lệ");
      }

      setSegments(segs);
      setStatus("preview");
    } catch (err: any) {
      setError(err.message);
      setShowModal(false);
      setLoading(false);
    }
  };

  const handleRender = async () => {
    setStatus("🎙️ Đang lồng tiếng + dựng video...");
    
    try {
      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          videoBase64, 
          mimeType, 
          segments, 
          voiceKey 
        }),
      });

      if (!renderRes.ok) {
        const data = await renderRes.json();
        throw new Error(data.error || "Render thất bại");
      }

      const blob = await renderRes.blob();
      setVideoUrl(URL.createObjectURL(blob));
      setStatus("");
      setShowModal(false);
    } catch (err: any) {
      setError(err.message);
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setLoading(false);
    setStatus("");
    setSegments([]);
    setVideoBase64("");
    setMimeType("");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">🎬 ViddyScribe VN</h1>
      <p className="text-gray-400 mb-8">
        Upload video → nhận về video MỚI có giọng mô tả tiếng Việt cho người khiếm thị
      </p>

      <div className="flex items-center gap-4">
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-lg font-medium">
          {loading ? "⏳ Đang xử lý..." : "📤 Chọn Video (dưới 10MB)"}
          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            className="hidden"
            disabled={loading}
          />
        </label>

        <select
          value={voiceKey}
          onChange={(e) => setVoiceKey(e.target.value)}
          disabled={loading}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3"
        >
          <option value="nu-bac">👩 Nữ - Bắc</option>
          <option value="nam-bac">👨 Nam - Bắc</option>
          <option value="nu-nam">👩 Nữ - Nam</option>
          <option value="nam-nam">👨 Nam - Nam</option>
        </select>
      </div>

      {error && <p className="mt-6 text-red-400 max-w-xl text-center">❌ {error}</p>}

      {videoUrl && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <video src={videoUrl} controls className="max-w-2xl w-full rounded-xl border border-gray-800" />
          <a
            href={videoUrl}
            download="viddyscribe-vn.mp4"
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium"
          >
            ⬇️ Tải video đã mô tả
          </a>
        </div>
      )}

      <PreviewModal
        isOpen={showModal}
        status={status}
        segments={segments}
        onSegmentsChange={setSegments}
        onRender={handleRender}
        onCancel={handleCancel}
      />
    </main>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}