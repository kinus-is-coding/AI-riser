"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogle } from "@/lib/firebase";
import { Sparkles, Video, ShieldCheck, ArrowRight, Globe } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const user = await loginWithGoogle();
    setLoading(false);
    if (user) {
      router.push("/studio");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          ViddyScribe AI
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          {loading ? "Đang kết nối..." : "Đăng nhập Google"}
        </button>
      </header>

      {/* Hero Content */}
      <main className="max-w-3xl w-full mx-auto text-center space-y-6 z-10 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" /> Powered by Gemini Vision & Google Cloud
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Lồng tiếng & Tạo Sub AI <br />
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Chuẩn Xác Theo Khung Hình
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
          Tự động phân tích video, tạo kịch bản thuyết minh đa giọng đọc và xuất file subtitle (.SRT) chuyên nghiệp trong vài giây.
        </p>

        <div className="pt-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-violet-600/25 transition-all hover:scale-105 active:scale-95"
          >
            <Globe className="w-4 h-4" />
            {loading ? "Đang đăng nhập..." : "Trải nghiệm ngay với Google"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-zinc-600 z-10">
        ViddyScribe Studio © 2026 • Firebase Auth & Cloud Run Ready
      </footer>
    </div>
  );
}