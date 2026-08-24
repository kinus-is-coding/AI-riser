import { db } from "@/lib/firebase";
import { uploadToSupabase, supabase } from "@/lib/supabase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Segment } from "@/components/PreviewModal";

export interface HistoryItem {
  id: string;
  title: string;
  videoUrl: string;
  storagePath: string;
  voiceKey: string;
  voiceLabel: string;
  segments: Segment[];
  createdAt: string;
}

export async function saveToHistory(
  userId: string,
  videoBlob: Blob,
  fileName: string,
  voiceKey: string,
  voiceLabel: string,
  segments: Segment[]
): Promise<HistoryItem> {
  if (!userId) throw new Error("Chưa có User ID");

  const { publicUrl, storagePath } = await uploadToSupabase(videoBlob, fileName);

  const historyRef = collection(db, "users", userId, "history");
  const docData = {
    title: fileName,
    videoUrl: publicUrl,
    storagePath,
    voiceKey,
    voiceLabel,
    segments,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(historyRef, docData);

  return {
    id: docRef.id,
    title: fileName,
    videoUrl: publicUrl,
    storagePath,
    voiceKey,
    voiceLabel,
    segments,
    createdAt: "Vừa xong",
  };
}

export async function fetchUserHistory(userId: string): Promise<HistoryItem[]> {
  // Bắt buộc check userId để không bị crash lỗi CollectionReference
  if (!userId) return [];

  try {
    const historyRef = collection(db, "users", userId, "history");
    const q = query(historyRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const history: HistoryItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let dateStr = "Vừa xong";

      if (data.createdAt?.toDate) {
        dateStr = data.createdAt.toDate().toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      history.push({
        id: docSnap.id,
        title: data.title || "Video Lồng Tiếng",
        videoUrl: data.videoUrl || "",
        storagePath: data.storagePath || "",
        voiceKey: data.voiceKey || "nu-bac",
        voiceLabel: data.voiceLabel || "Mặc định",
        segments: data.segments || [],
        createdAt: dateStr,
      });
    });

    return history;
  } catch (error) {
    console.error("Lỗi khi load lịch sử:", error);
    return [];
  }
}

export async function deleteHistoryItem(
  userId: string,
  docId: string,
  storagePath?: string
): Promise<void> {
  if (!userId || !docId) return;

  if (storagePath) {
    await supabase.storage.from("videos").remove([storagePath]);
  }

  const docRef = doc(db, "users", userId, "history", docId);
  await deleteDoc(docRef);
}