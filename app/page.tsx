"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setVideoUrl("");

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoBase64: base64.split(",")[1],
          mimeType: file.type,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Render thất bại");
      }

      const blob = await res.blob();
      setVideoUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">🎬 ViddyScribe VN</h1>
      <p className="text-gray-400 mb-8">
        Upload video → nhận về video MỚI có giọng mô tả tiếng Việt cho người khiếm thị
      </p>

      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-lg font-medium">
        {loading ? "⏳ Đang phân tích + render (1-3 phút)..." : "📤 Chọn Video (dưới 10MB)"}
        <input type="file" accept="video/*" onChange={handleUpload} className="hidden" disabled={loading} />
      </label>

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