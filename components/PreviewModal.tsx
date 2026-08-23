"use client";

import { useState, useRef, useEffect } from "react";
import {
  Clock,
  Sparkles,
  X,
  Check,
  Film,
  Play,
  Pause,
  Volume2,
  Mic,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Wand2,
} from "lucide-react";

export interface Segment {
  start: number;
  end: number;
  text: string;
  hasSpeech: boolean;
}

interface PreviewModalProps {
  isOpen: boolean;
  status: string;
  segments: Segment[];
  videoBase64: string;
  mimeType: string;
  voiceKey: string;
  onVoiceKeyChange: (key: string) => void;
  onSegmentsChange: (segments: Segment[]) => void;
  onRender: () => void;
  onCancel: () => void;
  voices: { id: string; label: string; desc: string }[];
}

export default function PreviewModal({
  isOpen,
  status,
  segments,
  videoBase64,
  mimeType,
  voiceKey,
  onVoiceKeyChange,
  onSegmentsChange,
  onRender,
  onCancel,
  voices,
}: PreviewModalProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const isAnalyzing = status !== "preview";
  const videoSrc = videoBase64 ? `data:${mimeType};base64,${videoBase64}` : "";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  const handleSeekToSegment = (start: number, index: number) => {
    setActiveSegmentIndex(index);
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    const activeIdx = segments.findIndex(
      (s) => time >= s.start && time <= s.end
    );
    if (activeIdx !== -1 && activeIdx !== activeSegmentIndex) {
      setActiveSegmentIndex(activeIdx);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTextChange = (index: number, newText: string) => {
    const updated = [...segments];
    updated[index].text = newText;
    onSegmentsChange(updated);
  };

  const handleSpeechToggle = (index: number) => {
    const updated = [...segments];
    updated[index].hasSpeech = !updated[index].hasSpeech;
    onSegmentsChange(updated);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex flex-col h-screen w-screen overflow-hidden text-zinc-100 antialiased select-none">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-900/90 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Gemini Vision AI Powered</span>
          </div>
          <span className="text-zinc-600">|</span>
          <h1 className="text-sm font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
            <Film className="w-4 h-4 text-zinc-400" />
            ViddyScribe Studio Editor
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all"
          >
            Thoát Studio
          </button>
          {!isAnalyzing && (
            <button
              onClick={onRender}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white px-5 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Xuất Video Lồng Tiếng
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Body */}
      {isAnalyzing ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-violet-400 absolute" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-medium text-zinc-200">{status}</p>
            <p className="text-xs text-zinc-500">
              Gemini đang phân tích từng khung hình & tạo kịch bản thuyết minh...
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex min-h-0">
            {/* Left Column: Player & Controls (45% width) */}
            <div className="w-[45%] border-r border-zinc-800/80 bg-zinc-950 flex flex-col p-4 gap-4 overflow-y-auto">
              {/* Video Player */}
              <div className="relative w-full aspect-video bg-black rounded-xl border border-zinc-800 overflow-hidden shadow-2xl flex items-center justify-center group">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
              </div>

              {/* Time Display */}
              <div className="flex items-center justify-between text-xs font-mono bg-zinc-900/80 border border-zinc-800/80 px-3 py-2 rounded-lg text-zinc-400">
                <span>Thời gian: {formatTime(currentTime)}</span>
                <span className="text-violet-400">
                  Segment #{activeSegmentIndex + 1}
                </span>
              </div>

              {/* Voice Selector Panel */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-violet-400" />
                    Cấu hình giọng đọc AI
                  </span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    Việt Nam
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onVoiceKeyChange(v.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        voiceKey === v.id
                          ? "bg-violet-600/10 border-violet-500/50 text-violet-200"
                          : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="text-xs font-medium text-zinc-200">
                        {v.label}
                      </div>
                      <div className="text-[10px] text-zinc-500">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Script Timeline (55% width) */}
            <div className="flex-1 bg-zinc-900/30 flex flex-col min-h-0">
              <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-semibold text-zinc-200">
                    Phân đoạn kịch bản ({segments.length})
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Click vào văn bản để sửa nội dung
                </span>
              </div>

              {/* Script List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {segments.map((seg, idx) => {
                  const isActive = idx === activeSegmentIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSeekToSegment(seg.start, idx)}
                      className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                        isActive
                          ? "bg-violet-950/20 border-violet-500/40 shadow-lg shadow-violet-950/30"
                          : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80"
                      }`}
                    >
                      {/* Top Meta Bar */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`font-mono px-2 py-0.5 rounded text-[11px] font-medium border ${
                              isActive
                                ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                                : "bg-zinc-800/80 border-zinc-700/50 text-zinc-400"
                            }`}
                          >
                            {formatTime(seg.start)} - {formatTime(seg.end)}
                          </span>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[11px] text-violet-400 font-medium">
                              <ChevronRight className="w-3 h-3" /> Đang xem
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeechToggle(idx);
                          }}
                          className={`text-[11px] px-2 py-1 rounded-md font-medium border transition-colors ${
                            seg.hasSpeech
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {seg.hasSpeech ? "Freeze Frame" : "Giữ nguyên tốc độ"}
                        </button>
                      </div>

                      {/* Content Edit */}
                      {editingIndex === idx ? (
                        <div
                          className="space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <textarea
                            value={seg.text}
                            onChange={(e) =>
                              handleTextChange(idx, e.target.value)
                            }
                            className="w-full bg-zinc-950 border border-violet-500/50 focus:outline-none text-zinc-100 text-xs rounded-lg p-2.5 resize-none leading-relaxed"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white text-[11px] px-3 py-1 rounded font-medium transition-colors"
                            >
                              <Check className="w-3 h-3" /> Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIndex(idx);
                          }}
                          className="text-xs text-zinc-300 leading-relaxed hover:text-white transition-colors"
                        >
                          {seg.text || (
                            <span className="italic text-zinc-600">
                              Chưa có lời thoại...
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Timeline Visual Track */}
          <div className="h-24 border-t border-zinc-800 bg-zinc-950 p-3 flex flex-col justify-between shrink-0">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-zinc-400" /> Visual
                Timeline Track
              </span>
              <span>Tổng số segment: {segments.length}</span>
            </div>

            {/* Timeline Blocks */}
            <div className="h-10 bg-zinc-900/80 rounded-lg border border-zinc-800 flex items-center p-1 gap-1 overflow-x-auto">
              {segments.map((seg, idx) => {
                const isActive = idx === activeSegmentIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSeekToSegment(seg.start, idx)}
                    style={{ flex: Math.max(seg.end - seg.start, 1) }}
                    className={`h-full rounded transition-all cursor-pointer flex items-center justify-center px-1 border text-[10px] font-mono truncate ${
                      isActive
                        ? "bg-violet-600/30 border-violet-500 text-violet-200"
                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}