"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2, MessageSquare, Send, ThumbsUp, AlertCircle } from "lucide-react";
import { MediaReviewPlayer } from "@multica/views/reviews";
import type { GuestReview, ReviewComment, ReviewAssetStatus } from "@multica/core/types";
import { pdfjs } from "react-pdf";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

export function GuestReviewClient({ token }: { token: string }) {
  const [review, setReview] = useState<GuestReview | null>(null);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [content, setContent] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sentiment, setSentiment] = useState<ReviewAssetStatus>("pending");
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);

  useEffect(() => {
    if (review?.asset.asset_type === "pdf") {
      setPdfNumPages(null);
      pdfjs.getDocument(review.asset.src_url).promise.then((pdf) => {
        setPdfNumPages(pdf.numPages);
      }).catch(console.error);
    }
  }, [review?.asset.src_url, review?.asset.asset_type]);

  const load = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/guest/reviews/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 404 ? "This review link is invalid or has expired." : "Unable to load this review.");
    setReview(await response.json() as GuestReview);
  }, [token]);

  useEffect(() => {
    load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load this review."));
  }, [load]);

  const comments = useMemo(
    () => (review?.comments ?? []).filter((comment) => (comment.page_index ?? 0) === pageIndex),
    [review?.comments, pageIndex],
  );
  const isPdf = review?.asset.name.toLowerCase().endsWith(".pdf") === true;

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!guestName.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/api/guest/reviews/${encodeURIComponent(token)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_name: guestName, content, page_index: pageIndex, shapes: [] }),
      });
      if (!response.ok) throw new Error("Unable to post your feedback.");
      const comment = await response.json() as ReviewComment;
      
      let updatedReview = { ...review!, comments: [...review!.comments, comment] };
      
      if (sentiment !== "pending") {
        const statusResp = await fetch(`${apiBase}/api/guest/reviews/${encodeURIComponent(token)}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: sentiment }),
        });
        if (statusResp.ok) {
           updatedReview.asset = { ...updatedReview.asset, status: sentiment };
        }
      }
      
      setReview(updatedReview);
      setContent("");
      setSentiment("pending");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to post your feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !review) {
    return <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><p className="max-w-md text-center text-muted-foreground">{error}</p></main>;
  }
  if (!review) {
    return <main className="grid min-h-screen place-items-center bg-background text-foreground"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:flex-row">
      <section className="flex min-h-[55vh] flex-1 flex-col bg-black">
        <header className="flex h-14 items-center justify-between border-b border-white/10 px-4 text-white">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{review.asset.name}</p><p className="text-xs text-white/60">Guest media review</p></div>
          {isPdf && <div className="flex items-center gap-1"><button aria-label="Previous page" className="rounded p-2 hover:bg-white/10" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))}><ChevronLeft className="h-4 w-4" /></button><span className="min-w-16 text-center text-xs">Page {pageIndex + 1} {pdfNumPages ? `/ ${pdfNumPages}` : ''}</span><button aria-label="Next page" className="rounded p-2 hover:bg-white/10" disabled={pdfNumPages !== null && pageIndex >= pdfNumPages - 1} onClick={() => setPageIndex((value) => pdfNumPages ? Math.min(pdfNumPages - 1, value + 1) : value + 1)}><ChevronRight className="h-4 w-4" /></button></div>}
        </header>
        <div className="relative flex-1">
          {isPdf ? <iframe title={review.asset.name} className="absolute inset-0 h-full w-full border-0 bg-white" src={`${review.asset.src_url}#page=${pageIndex + 1}&view=Fit`} /> : <MediaReviewPlayer asset={review.asset} comments={comments} />}
        </div>
      </section>
      <aside className="flex w-full flex-col border-l border-border bg-background lg:w-[360px]">
        <div className="flex items-center gap-2 border-b border-border p-4 font-medium"><MessageSquare className="h-4 w-4" />Feedback {isPdf && <span className="text-xs font-normal text-muted-foreground">on page {pageIndex + 1}</span>}</div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {comments.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No feedback on this page yet.</p> : comments.map((comment) => <article key={comment.id} className="rounded-lg border border-border bg-card p-3"><p className="text-xs font-medium">{comment.guest_name ?? "Team member"}</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{comment.content}</p></article>)}
        </div>
        <form className="space-y-3 border-t border-border p-4" onSubmit={submitComment}>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={80} required placeholder="Your name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setSentiment(sentiment === "approved" ? "pending" : "approved")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${sentiment === "approved" ? "border-green-500 bg-green-50 text-green-700" : "border-border bg-background hover:bg-accent"}`}>
              <ThumbsUp className="h-3.5 w-3.5" /> Like it
            </button>
            <button type="button" onClick={() => setSentiment(sentiment === "changes_requested" ? "pending" : "changes_requested")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${sentiment === "changes_requested" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-border bg-background hover:bg-accent"}`}>
              <AlertCircle className="h-3.5 w-3.5" /> Changes needed
            </button>
          </div>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={5000} required placeholder="Leave feedback…" className="min-h-24 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" />{submitting ? "Sending…" : "Send feedback"}</button>
        </form>
      </aside>
    </main>
  );
}
