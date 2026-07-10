import { GuestReviewClient } from "./guest-review-client";

export default async function GuestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;
  return <GuestReviewClient token={token} />;
}
