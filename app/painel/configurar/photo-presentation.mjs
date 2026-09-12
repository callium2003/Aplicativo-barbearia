/**
 * @param {{ previewUrl?: string | null, savedUrl?: string | null, failedUrl?: string | null, shopName?: string | null }} input
 */
export function resolveBarbershopPhotoPresentation({ previewUrl, savedUrl, failedUrl, shopName }) {
  const normalizedName = shopName?.trim() || "Barbearia";
  const selectedSource = previewUrl?.trim() || savedUrl?.trim() || null;
  const isPreview = Boolean(previewUrl?.trim());
  const source = selectedSource && selectedSource !== failedUrl ? selectedSource : null;
  const initials = normalizedName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return {
    source,
    alt: isPreview
      ? `Prévia da nova foto da barbearia ${normalizedName}`
      : `Foto atual da barbearia ${normalizedName}`,
    initials,
    isPreview,
  };
}
