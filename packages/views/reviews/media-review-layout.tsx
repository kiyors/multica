import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import type { ReviewAsset } from "@multica/core/types";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@multica/ui/components/ui/carousel";
import { pdfjs } from "react-pdf";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@multica/ui/components/ui/alert-dialog";
import { useUpdateReviewAssetStatus, useReviewAssetUpload, useDeleteReviewAsset, useDeleteReviewAssetGroup, useCreateGuestReviewLink } from "@multica/core/reviews/mutations";
import { listReviewAssetsOptions, listReviewCommentsOptions } from "@multica/core/reviews/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@multica/ui/components/ui/select";
import { MediaReviewPlayer, type MediaReviewPlayerRef } from "./media-review-player";
import { ReviewCommentSidebar } from "./review-comment-sidebar";
import { UploadShowcase } from "./upload-showcase";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@multica/ui/components/ui/resizable";
import type { UploadPhase } from "./upload-showcase";

interface MediaReviewLayoutProps {
  workspaceId: string;
  asset: ReviewAsset;
  onAssetChange?: (asset: ReviewAsset) => void;
  onClose?: () => void;
  initialCommentId?: string;
  initialPageIndex?: number;
  initialTime?: number;
}

export function MediaReviewLayout({ workspaceId, asset, onAssetChange, onClose, initialCommentId, initialPageIndex = 0, initialTime }: MediaReviewLayoutProps) {
  const playerRef = useRef<MediaReviewPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedCommentId, setSelectedCommentId] = useState<string | undefined>(initialCommentId);
  const [drawingShape, setDrawingShape] = useState<any>(null);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);

  useEffect(() => {
    if (asset.asset_type === "pdf") {
      setPdfNumPages(null);
      pdfjs.getDocument(asset.src_url).promise.then((pdf) => {
        setPdfNumPages(pdf.numPages);
      }).catch(console.error);
    }
  }, [asset.src_url, asset.asset_type]);

  useEffect(() => {
    setSelectedCommentId(initialCommentId);
    setPageIndex(initialPageIndex);
    if (initialTime != null) {
      const frame = requestAnimationFrame(() => playerRef.current?.seek(initialTime));
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [asset.id, initialCommentId, initialPageIndex, initialTime]);

  const { data: allAssets } = useQuery(listReviewAssetsOptions(workspaceId, asset.issue_id));
  const { data: comments, isLoading: commentsLoading } = useQuery(listReviewCommentsOptions(workspaceId, asset.issue_id, asset.id));
  const updateStatus = useUpdateReviewAssetStatus();
  const uploadAsset = useReviewAssetUpload();
  const deleteAsset = useDeleteReviewAsset();
  const deleteGroup = useDeleteReviewAssetGroup();
  const createGuestLink = useCreateGuestReviewLink();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (!uploadAsset.isSuccess) return;
    const t = setTimeout(() => {
      uploadAsset.reset();
      setUploadFile(null);
      setUploadPhase(null);
      setUploadProgress(0);
    }, 2500);
    return () => clearTimeout(t);
  }, [uploadAsset.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pendingDelete, setPendingDelete] = useState<'version' | 'group' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadProgress(0);
      setUploadPhase(null);
      uploadAsset.mutate(
        {
          workspaceId,
          issueId: asset.issue_id,
          file,
          previousAssetId: assetVersions[0]?.id ?? asset.id,
          onProgress: (p) => setUploadProgress(p),
          onPhaseChange: (phase) => setUploadPhase(phase),
        },
        {
          onSuccess: (newAsset) => {
            if (onAssetChange) onAssetChange(newAsset);
          },
        }
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const assetVersions = (allAssets as ReviewAsset[] | undefined)
    ?.filter((a: ReviewAsset) => a.asset_group_id === asset.asset_group_id)
    ?.sort((a: ReviewAsset, b: ReviewAsset) => b.version - a.version) || [asset];

  const groupAssets = Object.values(
    (allAssets as ReviewAsset[] | undefined ?? []).reduce((acc, a) => {
      if (!acc[a.asset_group_id] || (acc[a.asset_group_id]?.version ?? -1) < a.version) acc[a.asset_group_id] = a;
      return acc;
    }, {} as Record<string, ReviewAsset>)
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const handleSeek = (time: number) => {
    playerRef.current?.seek(time);
  };

  const handleDrawStart = () => {
    playerRef.current?.pause();
  };

  const getCanvasShapes = () => {
    return playerRef.current?.getCanvasShapes();
  };

  const clearCanvasShapes = () => {
    playerRef.current?.clearCanvasShapes();
  };

  const handleStatusChange = (status: any) => {
    updateStatus.mutate({
      workspaceId,
      issueId: asset.issue_id,
      assetId: asset.id,
      status
    });
  };

  const handleVersionChange = (assetId: any) => {
    const selected = assetVersions.find((a: ReviewAsset) => a.id === assetId);
    if (selected && onAssetChange) {
      onAssetChange(selected);
    }
  };

  const handleDeleteVersion = () => setPendingDelete('version');
  const handleDeleteGroup = () => setPendingDelete('group');

  const confirmDelete = () => {
    if (pendingDelete === 'version') {
      deleteAsset.mutate(
        { workspaceId, issueId: asset.issue_id, assetId: asset.id },
        {
          onSuccess: () => {
            setPendingDelete(null);
            const remaining = assetVersions.filter((v) => v.id !== asset.id);
            if (remaining.length > 0 && remaining[0] && onAssetChange) {
              onAssetChange(remaining[0]);
            } else {
              onClose?.();
            }
          },
        }
      );
    } else if (pendingDelete === 'group') {
      deleteGroup.mutate(
        { workspaceId, issueId: asset.issue_id, assetGroupId: asset.asset_group_id },
        { onSuccess: () => { setPendingDelete(null); onClose?.(); } }
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Review Asset Header */}
      <div className="h-14 border-b border-border bg-muted/20 flex items-center justify-between px-4 text-foreground">
        <div className="flex items-center gap-4">
          <div className="font-medium text-sm">{asset.name}</div>
          {asset.asset_type === "pdf" && (
            <div className="flex items-center gap-1">
              <button className="rounded p-1 hover:bg-muted" aria-label="Previous page" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-16 text-center text-xs">Page {pageIndex + 1} {pdfNumPages ? `/ ${pdfNumPages}` : ''}</span>
              <button className="rounded p-1 hover:bg-muted" aria-label="Next page" disabled={pdfNumPages !== null && pageIndex >= pdfNumPages - 1} onClick={() => setPageIndex((value) => pdfNumPages ? Math.min(pdfNumPages - 1, value + 1) : value + 1)}><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Select value={asset.id} onValueChange={handleVersionChange}>
              <SelectTrigger className="h-7 border-border bg-muted text-xs w-28">
                <span>{asset.version ? `Version ${asset.version}` : "Version"}</span>
              </SelectTrigger>
              <SelectContent>
                {assetVersions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    Version {v.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAsset.isPending}
              className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded border border-border text-foreground"
            >
              {uploadAsset.isPending ? "Uploading…" : "Upload New Version"}
            </button>

            {/* Guest Share */}
            <button
              onClick={() => {
                createGuestLink.mutate(
                  { workspaceId, issueId: asset.issue_id, assetId: asset.id },
                  {
                    onSuccess: async ({ token }) => {
                      await navigator.clipboard.writeText(`${window.location.origin}/guest/review/${token}`);
                      toast.success("Guest share link copied to clipboard");
                    },
                    onError: () => toast.error("Failed to create guest share link"),
                  },
                );
              }}
              disabled={createGuestLink.isPending}
              title="Share with guests"
              className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded border border-border text-foreground flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              {createGuestLink.isPending ? "Creating…" : "Share"}
            </button>

            {/* Delete current version */}
            <button
              onClick={handleDeleteVersion}
              disabled={deleteAsset.isPending}
              title="Delete this version"
              className="text-xs px-2 py-1 bg-muted hover:bg-destructive/10 hover:text-destructive rounded border border-border text-muted-foreground flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Version
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="video/*,image/*,application/pdf"
              onChange={handleFileChange} 
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete entire media group */}
          <button
            onClick={handleDeleteGroup}
            disabled={deleteGroup.isPending}
            title="Delete all versions of this media"
            className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Select value={asset.status} onValueChange={handleStatusChange}>
            <SelectTrigger className={`h-8 text-xs font-medium border-0 focus:ring-0 ${
              asset.status === 'approved' ? 'bg-green-500/20 text-green-400' :
              asset.status === 'changes_requested' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="changes_requested">Changes Requested</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            onClick={() => onClose?.()}
            title="Close review"
            className="p-1.5 rounded hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {groupAssets.length > 1 && (
        <div className="h-20 border-b border-border bg-background p-2 flex justify-center">
           <Carousel className="w-full max-w-2xl" opts={{ dragFree: true }}>
             <CarouselContent className="-ml-2">
               {groupAssets.map(a => (
                 <CarouselItem key={a.id} className="pl-2 basis-24">
                   <div 
                     onClick={() => onAssetChange && onAssetChange(a)}
                     className={`w-full h-16 rounded cursor-pointer border-2 overflow-hidden relative ${a.asset_group_id === asset.asset_group_id ? 'border-primary' : 'border-transparent hover:border-border'}`}
                   >
                     {a.thumbnail_url ? (
                       <img src={a.thumbnail_url} className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground uppercase">{a.asset_type}</div>
                     )}
                   </div>
                 </CarouselItem>
               ))}
             </CarouselContent>
             <CarouselPrevious className="left-0" />
             <CarouselNext className="right-0" />
           </Carousel>
        </div>
      )}

      {/* Review Content */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 w-full overflow-hidden">
        <ResizablePanel defaultSize="75" minSize="50" className="relative bg-background flex flex-col overflow-auto">
          {/* Upload showcase overlaid above player while uploading a new version */}
          {uploadFile && (uploadAsset.isPending || uploadAsset.isSuccess || uploadAsset.isError) && (
            <div className="absolute inset-x-0 top-0 z-20 p-4">
              <UploadShowcase
                file={uploadFile}
                phase={uploadPhase}
                progress={uploadProgress}
                isPending={uploadAsset.isPending}
                isSuccess={uploadAsset.isSuccess}
                isError={uploadAsset.isError}
              />
            </div>
          )}
          <MediaReviewPlayer
            ref={playerRef}
            asset={asset}
            onTimeUpdate={setCurrentTime}
            comments={comments as any[]}
            selectedCommentId={selectedCommentId}
            onSelectComment={setSelectedCommentId}
            onDrawingShapeChange={setDrawingShape}
            pageIndex={pageIndex}
          />
        </ResizablePanel>
        
        <ResizableHandle withHandle className="bg-border" />
        
        <ResizablePanel defaultSize="25" minSize="20" maxSize="40" className="bg-background">
          <ReviewCommentSidebar
            workspaceId={workspaceId}
            asset={asset}
            comments={comments as any[]}
            isLoading={commentsLoading}
            currentTime={currentTime}
            selectedCommentId={selectedCommentId}
            onSelectComment={setSelectedCommentId}
            onSeek={handleSeek}
            onDrawStart={handleDrawStart}
            getCanvasShapes={getCanvasShapes}
            clearCanvasShapes={clearCanvasShapes}
            drawingShape={drawingShape}
            pageIndex={pageIndex}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete === 'version' ? 'Delete version' : 'Delete media'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete === 'version'
                ? <>This will permanently delete <strong>version {asset.version}</strong> of &ldquo;{asset.name}&rdquo; and all its annotations.</>
                : <>This will permanently delete <strong>{asset.name}</strong> and all its versions. This action cannot be undone.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteAsset.isPending || deleteGroup.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
