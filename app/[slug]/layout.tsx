import { notFound } from "next/navigation";
import { getPublicSupabaseConfig } from "../../utils/supabase-config";
import { publicSlugExists } from "../../utils/public-slug";

export default async function PublicBarbershopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!await publicSlugExists(slug, getPublicSupabaseConfig())) notFound();
  return children;
}
