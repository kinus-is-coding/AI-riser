"use client";

import { useState } from "react";

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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-2">
            {status === "preview" ? "📝 Preview Kịch Bản" : status}
          </h2>
          {status !== "preview" && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-gray-400">Đang xử lý...</span>
            </div>
          )}
        </div>

        {/* Content */}
        {status === "preview" ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {segments.map((seg, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="font-mono bg-gray-950 px-2 py-1 rounded">
                          {formatTime(seg.start)} - {formatTime(seg.end)}
                        </span>
                        {seg.hasSpeech && (
                          <span className="bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded text-xs">
                            ⏸️ Freeze
                          </span>
                        )}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={seg.hasSpeech}
                          onChange={() => handleSpeechToggle(index)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-400">Có hội thoại</span>
                      </label>
                    </div>
                    
                    {editingIndex === index ? (
                      <div className="flex gap-2">
                        <textarea
                          value={seg.text}
                          onChange={(e) => handleTextChange(index, e.target.value)}
                          className="flex-1 bg-gray-950 text-white rounded p-2 resize-none"
                          rows={2}
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                        >
                          Lưu
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingIndex(index)}
                        className="text-white cursor-pointer hover:bg-gray-950 rounded p-2 -m-2"
                      >
                        {seg.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                onClick={onRender}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
              >
                🎬 Render Video
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl text-gray-400">{status}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}