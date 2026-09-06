export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

function requiredPublicEnvironment(
  value: string | undefined,
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Missing required public configuration: ${name}`);
  return normalized;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = requiredPublicEnvironment(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const publishableKey = requiredPublicEnvironment(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL");
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS outside local development");
  }
  if (publishableKey.length < 20 || /\s/.test(publishableKey)) {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return { url: parsed.origin, publishableKey };
}
