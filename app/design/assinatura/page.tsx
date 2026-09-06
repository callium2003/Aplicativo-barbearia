import { notFound } from "next/navigation";
import SubscriptionPreview from "./SubscriptionPreview";

export default function SubscriptionDesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SubscriptionPreview />;
}
