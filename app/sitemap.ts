import type { MetadataRoute } from "next";
import { institutionalPages, publicScreenshots, publicVideo, siteOrigin } from "../utils/agent-content";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only institutional pages; tenant pages require a separate indexability review.
  return institutionalPages.map(({ path, lastModified }) => ({
    url: `${siteOrigin}${path}`,
    lastModified,
    ...(path === "/" ? {
      images: publicScreenshots.map(image => image.contentUrl),
      videos: [{ title: publicVideo.name, description: publicVideo.description, thumbnail_loc: publicVideo.thumbnailUrl, content_loc: publicVideo.contentUrl }],
    } : {}),
  }));
}
