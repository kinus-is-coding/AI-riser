import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export interface DescriptionSegment {
  start: number;
  end: number;
  text: string;
}

const PROMPT = `Bạn là nhà biên kịch audio description (mô tả âm thanh) chuyên nghiệp cho người khiếm thị, phiên bản tiếng Việt.
Hãy xem video và viết các đoạn mô tả cho những phần hình ảnh quan trọng.

QUY TẮC:
- Mỗi đoạn gồm: "start", "end" (tính bằng giây) và "text" (câu mô tả tiếng Việt, 15-25 từ, tự nhiên).
- Chỉ mô tả HÌNH ẢNH: hành động, bối cảnh, biểu cảm, chữ trên màn hình. KHÔNG mô tả âm thanh hay lời thoại.
- Ưu tiên đặt mô tả vào khoảng trống không có đối thoại quan trọng.
- Nhận diện yếu tố văn hóa Việt Nam nếu có (áo dài, xe máy, chợ, quán cà phê...).
- Bỏ qua đoạn không có gì đáng mô tả.

TRẢ VỀ JSON ĐÚNG ĐỊNH DẠNG:
{"segments":[{"start":0.0,"end":3.5,"text":"Một người phụ nữ mặc áo dài bước vào chợ."}]}`;

export async function analyzeVideo(
  videoBase64: string,
  mimeType: string
): Promise<DescriptionSegment[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: videoBase64, mimeType } },
  ]);

  const parsed = JSON.parse(result.response.text());
  return (parsed.segments ?? [])
    .filter((s: any) => s.text && typeof s.start === "number")
    .sort((a: any, b: any) => a.start - b.start);
}