export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

function requiredPublicEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required public configuration: ${name}`);
  return value;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requiredPublicEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
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
