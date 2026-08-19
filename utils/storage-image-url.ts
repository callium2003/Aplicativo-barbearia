import { getPublicSupabaseConfig } from "@/utils/supabase-config";

export function isSafePublicStorageImageUrl(value: string | null | undefined, bucket: string, ownerId: string) {
  if (!value || value.includes("\\") || value.includes("..")) return false;
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.origin !== getPublicSupabaseConfig().url || url.search || url.hash) return false;
  const pathname = decodeURIComponent(url.pathname);
  const prefix = `/storage/v1/object/public/${bucket}/${ownerId}/`;
  return pathname.startsWith(prefix) && pathname.length > prefix.length && !pathname.includes("..") && !pathname.includes("\\");
}
