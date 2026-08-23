"use client";

import { useState } from "react";
import { Clock, MessageSquare, Loader2, Sparkles, X, Check, Film } from "lucide-react";

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
  onSegmentsChange: (segments: Segment[]) => void;
  onRender: () => void;
  onCancel: () => void;
}

export default function PreviewModal({
  isOpen,
  status,
  segments,
  onSegmentsChange,
  onRender,
  onCancel,
}: PreviewModalProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  const isAnalyzing = status !== "preview";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                {isAnalyzing ? "Đang xử lý video" : "Kịch bản thuyết minh"}
              </h2>
              {!isAnalyzing && (
                <p className="text-xs text-zinc-400">
                  {segments.length} đoạn mô tả • Bấm vào văn bản để chỉnh sửa
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!isAnalyzing ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {segments.map((seg, index) => (
                <div
                  key={index}
                  className="bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-3.5 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px] text-zinc-300">
                        {formatTime(seg.start)} – {formatTime(seg.end)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSpeechToggle(index)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        seg.hasSpeech
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      {seg.hasSpeech ? "Freeze-frame" : "Chèn nền"}
                    </button>
                  </div>

                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <textarea
                        value={seg.text}
                        onChange={(e) => handleTextChange(index, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-500 focus:outline-none text-zinc-100 text-sm rounded-lg p-2.5 resize-none leading-relaxed"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Xong
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingIndex(index)}
                      className="text-zinc-200 text-sm leading-relaxed cursor-pointer p-1 rounded hover:bg-zinc-900/60 transition-colors"
                      title="Bấm để chỉnh sửa"
                    >
                      {seg.text}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={onRender}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-zinc-900" />
                Tạo video
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-200">{status}</p>
              <p className="text-xs text-zinc-500">Quá trình này có thể mất vài giây</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
