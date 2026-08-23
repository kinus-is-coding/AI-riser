"use client";

import { useState, useRef } from "react";
import PreviewModal, { Segment } from "@/components/PreviewModal";
import { 
  Upload, 
  Download, 
  RotateCcw, 
  AlertCircle, 
  Mic, 
  Sparkles, 
  Video, 
  Languages, 
  CheckCircle2,
  Play
} from "lucide-react";

const VOICES = [
  { id: "nu-bac", label: "Nữ (Miền Bắc)", desc: "Truyền cảm, rõ ràng, phát thanh viên", gender: "Nữ", region: "Bắc" },
  { id: "nam-bac", label: "Nam (Miền Bắc)", desc: "Trầm ấm, uy quyền, lịch sự", gender: "Nam", region: "Bắc" },
  { id: "nu-nam", label: "Nữ (Miền Nam)", desc: "Ngọt ngào, tự nhiên, gần gũi", gender: "Nữ", region: "Nam" },
  { id: "nam-nam", label: "Nam (Miền Nam)", desc: "Năng động, truyền cảm hứng", gender: "Nam", region: "Nam" },
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
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Background Glow Overlay */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-600/15 via-purple-600/5 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center text-indigo-400 font-bold text-sm">
              V
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-zinc-100 flex items-center gap-2">
              VIDIO
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                AI Voice Studio
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Powered by Gemini & AI TTS</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 max-w-5xl w-full mx-auto space-y-10">
        
        {/* Banner Section */}
        {!videoUrl && (
          <div className="text-center space-y-3 max-w-2xl mx-auto pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 mb-2">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tạo thuyết minh & Thuyết minh tự động cho Video</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Lồng tiếng video AI trong chớp mắt
            </h1>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
              Tự động phân tích cảnh quay, tạo kịch bản thuyết minh tiếng Việt chuẩn giọng đọc và ghép voiceover hoàn chỉnh.
            </p>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="w-full max-w-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="flex-1 text-xs md:text-sm font-medium">{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-white text-xs font-semibold px-2 py-1 rounded bg-red-900/40 transition-colors"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Main Workspace Area */}
        {!videoUrl ? (
          <div className="w-full max-w-2xl space-y-8">
            {/* Dropzone Container */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10 scale-[1.01] shadow-2xl shadow-indigo-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
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
              
              {/* Icon Circle */}
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 group-hover:scale-110 transition-all duration-300 shadow-inner mb-5">
                <Upload className="w-7 h-7" />
              </div>

              <div className="text-center space-y-2">
                <p className="text-base font-semibold text-zinc-100 group-hover:text-indigo-200 transition-colors">
                  Kéo & thả video vào đây, hoặc <span className="text-indigo-400 underline underline-offset-4">chọn file</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Hỗ trợ định dạng MP4, MOV, WebM • Dung lượng khuyến nghị &lt; 20MB
                </p>
              </div>
            </div>

            {/* Voice Selection Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  Chọn giọng đọc AI mặc định
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VOICES.map((v) => {
                  const isSelected = voiceKey === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoiceKey(v.id)}
                      className={`p-3 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between space-y-2 relative overflow-hidden ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500/60 text-white shadow-md shadow-indigo-500/10"
                          : "bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-zinc-100 mb-0.5">{v.label}</div>
                        <div className="text-[11px] text-zinc-500 line-clamp-1">{v.desc}</div>
                      </div>
                      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 w-fit">
                        {v.region}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="pt-6 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-indigo-400 shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-200 mb-0.5">Phân tích Video</h4>
                  <p className="text-zinc-500">Gemini AI nhận diện từng khung hình & ngữ cảnh.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-indigo-400 shrink-0">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-200 mb-0.5">Tạo kịch bản chuẩn</h4>
                  <p className="text-zinc-500">Xem trước & chỉnh sửa lời thoại theo thời gian thực.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-indigo-400 shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-200 mb-0.5">Khớp Voice & Render</h4>
                  <p className="text-zinc-500">Ghép giọng đọc tự động chuẩn nhịp khớp video.</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Result Preview Area */
          <div className="w-full max-w-3xl flex flex-col items-center space-y-6 animate-in fade-in duration-300">
            <div className="w-full flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Video hoàn tất!
              </h3>
            </div>

            {/* Video Container */}
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/5">
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full aspect-video bg-black object-contain"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 w-full pt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-zinc-400" />
                Lồng tiếng video khác
              </button>

              <a
                href={videoUrl}
                download="viddyscribe-vn.mp4"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/25"
              >
                <Download className="w-4 h-4" />
                Tải Video Xuống
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Script Preview / Studio Processing Modal */}
      <PreviewModal
        isOpen={showModal}
        status={status}
        segments={segments}
        videoBase64={videoBase64}
        mimeType={mimeType}
        voiceKey={voiceKey}
        onVoiceKeyChange={setVoiceKey}
        onSegmentsChange={setSegments}
        onRender={handleRender}
        onCancel={handleCancel}
        voices={VOICES}
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