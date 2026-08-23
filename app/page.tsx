"use client";

import { useState, useRef } from "react";
import PreviewModal, { Segment } from "@/components/PreviewModal";
import { Upload, Download, RotateCcw, AlertCircle, Mic } from "lucide-react";

const VOICES = [
  { id: "nu-bac", label: "Nữ (Bắc)", desc: "Giọng nữ miền Bắc" },
  { id: "nam-bac", label: "Nam (Bắc)", desc: "Giọng nam miền Bắc" },
  { id: "nu-nam", label: "Nữ (Nam)", desc: "Giọng nữ miền Nam" },
  { id: "nam-nam", label: "Nam (Nam)", desc: "Giọng nam miền Nam" },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [voiceKey, setVoiceKey] = useState("nu-bac");
  const [isDragging, setIsDragging] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [videoBase64, setVideoBase64] = useState("");
  const [mimeType, setMimeType] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Vui lòng chọn file video hợp lệ (MP4, MOV, WebM)");
      return;
    }

    setLoading(true);
    setError("");
    setVideoUrl("");
    setShowModal(true);
    setStatus("Đang tải video lên...");

    try {
      const base64 = await fileToBase64(file);
      const videoBase64Data = base64.split(",")[1];
      const mime = file.type;

      setVideoBase64(videoBase64Data);
      setMimeType(mime);

      // Analyze with Gemini
      setStatus("Đang phân tích video...");
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
        throw new Error("Không tìm thấy phân đoạn mô tả phù hợp");
      }

      setSegments(segs);
      setStatus("preview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi phân tích";
      setError(message);
      setShowModal(false);
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    // Reset file input so re-selecting same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRender = async () => {
    setStatus("Đang lồng tiếng và ghép video...");
    
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
        throw new Error(data.error || "Xuất video thất bại");
      }

      const blob = await renderRes.blob();
      setVideoUrl(URL.createObjectURL(blob));
      setStatus("");
      setShowModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi dựng video";
      setError(message);
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

  const handleReset = () => {
    setVideoUrl("");
    setError("");
    setSegments([]);
    setVideoBase64("");
    setMimeType("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-zinc-800 selection:text-zinc-100">
      {/* Minimal Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 font-semibold text-sm">
            V
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            ViddyScribe
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            VN
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-400">
            <Mic className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={voiceKey}
              onChange={(e) => setVoiceKey(e.target.value)}
              disabled={loading}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer text-xs"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id} className="bg-zinc-900 text-zinc-200">
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl w-full mx-auto">
        {error && (
          <div className="w-full max-w-xl mb-6 bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1 leading-snug">{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-200 text-xs font-medium"
            >
              Đóng
            </button>
          </div>
        )}

        {!videoUrl ? (
          <div className="w-full max-w-lg space-y-6">
            {/* Upload Box */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group ${
                isDragging
                  ? "border-zinc-400 bg-zinc-900/80 scale-[1.01]"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleUpload}
                className="hidden"
                disabled={loading}
              />
              
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 group-hover:border-zinc-700 transition-colors mb-4">
                <Upload className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors">
                  Chọn hoặc kéo thả video
                </p>
                <p className="text-xs text-zinc-500">
                  Định dạng MP4, MOV • Tối đa 10MB
                </p>
              </div>
            </div>

            {/* Voice Quick Selection */}
            <div className="flex items-center justify-center gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceKey(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    voiceKey === v.id
                      ? "bg-zinc-200 text-zinc-950 font-semibold shadow-sm"
                      : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col items-center space-y-5 animate-in fade-in duration-300">
            {/* Video Container */}
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full aspect-video bg-black object-contain"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                Chọn video khác
              </button>

              <a
                href={videoUrl}
                download="viddyscribe-vn.mp4"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Tải video
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Script Preview / Processing Modal */}
      <PreviewModal
        isOpen={showModal}
        status={status}
        segments={segments}
        onSegmentsChange={setSegments}
        onRender={handleRender}
        onCancel={handleCancel}
      />
    </div>
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
