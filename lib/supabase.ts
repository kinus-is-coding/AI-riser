import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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