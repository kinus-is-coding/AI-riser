import { createClient } from "@supabase/supabase-js";

// Cung cấp URL hợp lệ mặc định để pass qua bước Docker build
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "dummy-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadToSupabase(fileBlob: Blob, fileName: string) {
  const filePath = `history/${Date.now()}_${fileName}`;

  const { data, error } = await supabase.storage
    .from("videos")
    .upload(filePath, fileBlob, { contentType: "video/mp4" });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from("videos")
    .getPublicUrl(filePath);

  return {
    publicUrl: publicUrlData.publicUrl,
    storagePath: filePath,
  };
}